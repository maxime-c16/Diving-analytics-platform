import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

import { Athlete } from '../../entities/athlete.entity';
import { Competition } from '../../entities/competition.entity';
import { Dive } from '../../entities/dive.entity';
import {
  IngestionLog,
  IngestionStatus,
  IngestionFileType,
} from '../../entities/ingestion-log.entity';
import { UploadCompetitionDto, IngestionStatusDto } from './dto/upload-competition.dto';
import { ScoresService } from '../scores/scores.service';
import {
  getDifficultyForHeight,
  isDiveValidForHeight,
  DivingHeight,
} from '../../common/constants/fina-dive-table';

interface ParsedCsvRow {
  athlete_name?: string;
  athleteName?: string;
  name?: string;
  country?: string;
  dive_code?: string;
  diveCode?: string;
  dive?: string;
  round?: string;
  round_number?: string;
  judge_scores?: string;
  judgeScores?: string;
  judges_scores?: string;
  scores?: string;
  difficulty?: string;
  dd?: string;
  final_score?: string;
  finalScore?: string;
  score?: string;
  rank?: string;
  position?: string;
}

interface ProcessedRow {
  athleteName: string;
  country?: string;
  diveCode: string;
  roundNumber: number;
  judgeScores: number[];
  difficulty: number;
  finalScore: number;
  rank?: number;
}

export interface RowError {
  row: number;
  error: string;
  data?: ParsedCsvRow;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(Athlete)
    private readonly athleteRepository: Repository<Athlete>,
    @InjectRepository(Competition)
    private readonly competitionRepository: Repository<Competition>,
    @InjectRepository(Dive)
    private readonly diveRepository: Repository<Dive>,
    @InjectRepository(IngestionLog)
    private readonly ingestionLogRepository: Repository<IngestionLog>,
    private readonly scoresService: ScoresService,
  ) {}

  /**
   * Upload and process a CSV file containing competition results
   */
  async uploadCompetitionCsv(
    file: Express.Multer.File,
    dto: UploadCompetitionDto,
  ): Promise<IngestionStatusDto> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are supported');
    }

    // Create ingestion log
    const ingestionLog = this.ingestionLogRepository.create({
      id: uuidv4(),
      fileName: file.originalname,
      fileType: IngestionFileType.CSV,
      fileSize: file.size,
      status: IngestionStatus.PENDING,
    });
    await this.ingestionLogRepository.save(ingestionLog);

    // Create or find competition
    let competition = await this.competitionRepository.findOne({
      where: {
        name: dto.competitionName,
        eventType: dto.eventType,
      },
    });

    if (!competition) {
      competition = this.competitionRepository.create({
        name: dto.competitionName,
        date: dto.competitionDate ? new Date(dto.competitionDate) : null,
        location: dto.location,
        eventType: dto.eventType,
      });
      await this.competitionRepository.save(competition);
    }

    ingestionLog.competitionId = competition.id;
    await this.ingestionLogRepository.save(ingestionLog);

    // Process file asynchronously
    this.processCsvFile(file.buffer, ingestionLog, competition, dto.eventType as DivingHeight);

    return this.mapToStatusDto(ingestionLog);
  }

  /**
   * Process CSV file buffer and insert data into database
   */
  private async processCsvFile(
    buffer: Buffer,
    ingestionLog: IngestionLog,
    competition: Competition,
    height: DivingHeight,
  ): Promise<void> {
    try {
      // Update status to processing
      ingestionLog.status = IngestionStatus.PROCESSING;
      ingestionLog.startedAt = new Date();
      await this.ingestionLogRepository.save(ingestionLog);

      // Parse CSV
      const rows = await this.parseCsv(buffer);
      ingestionLog.totalRows = rows.length;
      await this.ingestionLogRepository.save(ingestionLog);

      if (rows.length === 0) {
        throw new Error('CSV file is empty or has no valid data rows');
      }

      const errors: RowError[] = [];
      let processedCount = 0;

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        try {
          const processedRow = this.processRow(rows[i], height, i + 2); // +2 for header row and 0-indexing
          await this.insertRow(processedRow, competition);
          processedCount++;
          
          // Update progress every 10 rows
          if (processedCount % 10 === 0) {
            ingestionLog.processedRows = processedCount;
            await this.ingestionLogRepository.save(ingestionLog);
          }
        } catch (error) {
          errors.push({
            row: i + 2,
            error: error.message,
            data: rows[i],
          });
        }
      }

      // Final update
      ingestionLog.processedRows = processedCount;
      ingestionLog.failedRows = errors.length;
      ingestionLog.completedAt = new Date();

      if (errors.length === 0) {
        ingestionLog.status = IngestionStatus.COMPLETED;
      } else if (processedCount === 0) {
        ingestionLog.status = IngestionStatus.FAILED;
        ingestionLog.errorMessage = 'All rows failed to process';
        ingestionLog.errorDetails = { errors: errors.slice(0, 20) }; // Store first 20 errors
      } else {
        ingestionLog.status = IngestionStatus.PARTIAL;
        ingestionLog.errorMessage = `${errors.length} rows failed to process`;
        ingestionLog.errorDetails = { errors: errors.slice(0, 20) };
      }

      await this.ingestionLogRepository.save(ingestionLog);
      this.logger.log(`Ingestion ${ingestionLog.id} completed: ${processedCount}/${rows.length} rows processed`);

    } catch (error) {
      ingestionLog.status = IngestionStatus.FAILED;
      ingestionLog.errorMessage = error.message;
      ingestionLog.completedAt = new Date();
      await this.ingestionLogRepository.save(ingestionLog);
      this.logger.error(`Ingestion ${ingestionLog.id} failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV buffer into array of objects
   */
  private parseCsv(buffer: Buffer): Promise<ParsedCsvRow[]> {
    return new Promise((resolve, reject) => {
      const results: ParsedCsvRow[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csvParser({
          mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'),
        }))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Process a single CSV row and extract/validate data
   */
  private processRow(row: ParsedCsvRow, height: DivingHeight, rowNumber: number): ProcessedRow {
    // Extract athlete name
    const athleteName = row.athlete_name || row.athleteName || row.name;
    if (!athleteName || athleteName.trim() === '') {
      throw new Error(`Missing athlete name in row ${rowNumber}`);
    }

    // Extract dive code
    const diveCode = (row.dive_code || row.diveCode || row.dive || '').toUpperCase().trim();
    if (!diveCode) {
      throw new Error(`Missing dive code in row ${rowNumber}`);
    }

    // Validate dive code format
    if (!/^\d{3,4}[A-D]$/.test(diveCode)) {
      throw new Error(`Invalid dive code format: ${diveCode} in row ${rowNumber}`);
    }

    // Check if dive is valid for this height
    if (!isDiveValidForHeight(diveCode, height)) {
      throw new Error(`Dive ${diveCode} is not valid for height ${height} in row ${rowNumber}`);
    }

    // Extract judge scores
    const scoresStr = row.judge_scores || row.judgeScores || row.judges_scores || row.scores;
    if (!scoresStr) {
      throw new Error(`Missing judge scores in row ${rowNumber}`);
    }

    let judgeScores: number[];
    try {
      // Try parsing as JSON array first
      if (scoresStr.startsWith('[')) {
        judgeScores = JSON.parse(scoresStr);
      } else {
        // Parse as comma-separated values
        judgeScores = scoresStr.split(',').map((s) => parseFloat(s.trim()));
      }
    } catch (e) {
      throw new Error(`Invalid judge scores format in row ${rowNumber}: ${scoresStr}`);
    }

    // Validate judge scores
    if (judgeScores.length < 5 || judgeScores.length > 7) {
      throw new Error(`Invalid number of judge scores (${judgeScores.length}) in row ${rowNumber}. Expected 5-7.`);
    }

    for (let i = 0; i < judgeScores.length; i++) {
      if (isNaN(judgeScores[i]) || judgeScores[i] < 0 || judgeScores[i] > 10) {
        throw new Error(`Invalid judge score at position ${i + 1} in row ${rowNumber}: ${judgeScores[i]}`);
      }
      // Validate 0.5 increments
      if (judgeScores[i] % 0.5 !== 0) {
        throw new Error(`Judge scores must be in 0.5 increments. Invalid score at position ${i + 1} in row ${rowNumber}: ${judgeScores[i]}`);
      }
    }

    // Get difficulty (from CSV or lookup)
    let difficulty: number;
    const difficultyStr = row.difficulty || row.dd;
    if (difficultyStr && !isNaN(parseFloat(difficultyStr))) {
      difficulty = parseFloat(difficultyStr);
    } else {
      difficulty = getDifficultyForHeight(diveCode, height);
      if (difficulty === 0) {
        throw new Error(`Could not determine difficulty for dive ${diveCode} at height ${height} in row ${rowNumber}`);
      }
    }

    // Calculate final score using ScoresService
    const scoreResult = this.scoresService.calculateScore(diveCode, height, judgeScores);
    
    // Use calculated score or provided score
    const finalScoreStr = row.final_score || row.finalScore || row.score;
    const finalScore = finalScoreStr && !isNaN(parseFloat(finalScoreStr))
      ? parseFloat(finalScoreStr)
      : scoreResult.finalScore;

    // Extract optional fields
    const roundStr = row.round || row.round_number;
    const roundNumber = roundStr ? parseInt(roundStr, 10) : 1;

    const rankStr = row.rank;
    const rank = rankStr ? parseInt(rankStr, 10) : undefined;

    return {
      athleteName: athleteName.trim(),
      country: row.country?.trim(),
      diveCode,
      roundNumber: isNaN(roundNumber) ? 1 : roundNumber,
      judgeScores,
      difficulty,
      finalScore,
      rank: rank && !isNaN(rank) ? rank : undefined,
    };
  }

  /**
   * Insert processed row into database
   */
  private async insertRow(row: ProcessedRow, competition: Competition): Promise<void> {
    // Find or create athlete
    let athlete = await this.athleteRepository.findOne({
      where: { name: row.athleteName },
    });

    if (!athlete) {
      athlete = this.athleteRepository.create({
        name: row.athleteName,
        country: row.country,
      });
      await this.athleteRepository.save(athlete);
    } else if (row.country && !athlete.country) {
      // Update country if not set
      athlete.country = row.country;
      await this.athleteRepository.save(athlete);
    }

    // Get position from dive code
    const position = row.diveCode.slice(-1);

    // Create dive record
    const dive = this.diveRepository.create({
      athleteId: athlete.id,
      competitionId: competition.id,
      diveCode: row.diveCode,
      position,
      height: parseFloat(competition.eventType.replace('m', '')),
      difficulty: row.difficulty,
      judgesScores: row.judgeScores,
      finalScore: row.finalScore,
      rank: row.rank,
      roundNumber: row.roundNumber,
    });

    await this.diveRepository.save(dive);
  }

  /**
   * Get ingestion status by ID
   */
  async getIngestionStatus(id: string): Promise<IngestionStatusDto> {
    const log = await this.ingestionLogRepository.findOne({ where: { id } });
    
    if (!log) {
      throw new NotFoundException(`Ingestion job with ID ${id} not found`);
    }

    return this.mapToStatusDto(log);
  }

  /**
   * Get all ingestion logs with optional filters
   */
  async getIngestionLogs(
    status?: IngestionStatus,
    limit = 20,
    offset = 0,
  ): Promise<{ data: IngestionStatusDto[]; total: number }> {
    const queryBuilder = this.ingestionLogRepository.createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (status) {
      queryBuilder.where('log.status = :status', { status });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      data: logs.map((log) => this.mapToStatusDto(log)),
      total,
    };
  }

  /**
   * Get error details for a failed ingestion
   */
  async getIngestionErrors(id: string): Promise<{ errors: RowError[] }> {
    const log = await this.ingestionLogRepository.findOne({ where: { id } });
    
    if (!log) {
      throw new NotFoundException(`Ingestion job with ID ${id} not found`);
    }

    return {
      errors: (log.errorDetails as { errors: RowError[] })?.errors || [],
    };
  }

  /**
   * Import dive data extracted from PDF OCR processing
   */
  async importPdfData(params: {
    competitionName: string;
    competitionDate?: string;
    location?: string;
    eventType: string;
    dives: any[];
    sourceJobId: string;
  }): Promise<IngestionStatusDto> {
    const { competitionName, competitionDate, location, eventType, dives, sourceJobId } = params;
    const height = eventType as DivingHeight;

    // Create ingestion log
    const ingestionLog = this.ingestionLogRepository.create({
      id: uuidv4(),
      fileName: `pdf-import-${sourceJobId}`,
      fileType: IngestionFileType.PDF,
      fileSize: 0,
      status: IngestionStatus.PENDING,
      totalRows: dives.length,
    });
    await this.ingestionLogRepository.save(ingestionLog);

    // Create or find competition
    let competition = await this.competitionRepository.findOne({
      where: {
        name: competitionName,
        eventType,
      },
    });

    if (!competition) {
      competition = this.competitionRepository.create({
        name: competitionName,
        date: competitionDate ? new Date(competitionDate) : null,
        location,
        eventType,
      });
      await this.competitionRepository.save(competition);
    }

    ingestionLog.competitionId = competition.id;
    ingestionLog.status = IngestionStatus.PROCESSING;
    ingestionLog.startedAt = new Date();
    await this.ingestionLogRepository.save(ingestionLog);

    const errors: RowError[] = [];
    let processedCount = 0;

    // Process each extracted dive
    for (let i = 0; i < dives.length; i++) {
      try {
        const dive = dives[i];
        const processedRow = this.processPdfDive(dive, height, i + 1);
        await this.insertRow(processedRow, competition);
        processedCount++;
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error.message,
          data: dives[i],
        });
      }
    }

    // Final update
    ingestionLog.processedRows = processedCount;
    ingestionLog.failedRows = errors.length;
    ingestionLog.completedAt = new Date();

    if (errors.length === 0) {
      ingestionLog.status = IngestionStatus.COMPLETED;
    } else if (processedCount === 0) {
      ingestionLog.status = IngestionStatus.FAILED;
      ingestionLog.errorMessage = 'All dives failed to import';
      ingestionLog.errorDetails = { errors: errors.slice(0, 20) };
    } else {
      ingestionLog.status = IngestionStatus.PARTIAL;
      ingestionLog.errorMessage = `${errors.length} dives failed to import`;
      ingestionLog.errorDetails = { errors: errors.slice(0, 20) };
    }

    await this.ingestionLogRepository.save(ingestionLog);

    return this.mapToStatusDto(ingestionLog);
  }

  /**
   * Process a dive extracted from PDF OCR
   */
  private processPdfDive(dive: any, height: DivingHeight, rowNum: number): ProcessedRow {
    const athleteName = dive.athlete_name || dive.athleteName || 'Unknown';
    const diveCode = (dive.dive_code || dive.diveCode || '').toUpperCase().trim();
    const roundNumber = dive.round_number || dive.roundNumber || 1;
    const country = dive.country;

    // Validate dive code
    if (!diveCode || diveCode.length < 3) {
      throw new Error(`Invalid dive code: ${diveCode}`);
    }

    if (!isDiveValidForHeight(diveCode, height)) {
      this.logger.warn(`Dive ${diveCode} may not be valid for ${height}, but proceeding...`);
    }

    // Get or calculate difficulty
    let difficulty = dive.difficulty;
    if (!difficulty) {
      difficulty = getDifficultyForHeight(diveCode, height);
      if (!difficulty) {
        throw new Error(`Could not determine DD for dive ${diveCode} at ${height}`);
      }
    }

    // Process judge scores
    let judgeScores: number[] = [];
    if (dive.judge_scores || dive.judgeScores) {
      const rawScores = dive.judge_scores || dive.judgeScores;
      if (Array.isArray(rawScores)) {
        judgeScores = rawScores.map(s => Number(s)).filter(s => !isNaN(s) && s >= 0 && s <= 10);
      } else if (typeof rawScores === 'string') {
        judgeScores = rawScores
          .split(',')
          .map(s => parseFloat(s.trim()))
          .filter(s => !isNaN(s) && s >= 0 && s <= 10);
      }
    }

    // Calculate or use provided final score
    let finalScore = dive.final_score || dive.finalScore;
    if (!finalScore && judgeScores.length >= 3) {
      // Calculate using FINA scoring
      const result = this.scoresService.calculateScore(diveCode, height, judgeScores);
      finalScore = result.finalScore;
    }

    if (finalScore === undefined || finalScore === null) {
      // If we still don't have a score, we can't process this dive
      throw new Error(`Could not calculate score for dive (no judge scores or final score)`);
    }

    return {
      athleteName,
      country,
      diveCode,
      roundNumber: Number(roundNumber),
      judgeScores,
      difficulty: Number(difficulty),
      finalScore: Number(finalScore),
      rank: dive.rank ? Number(dive.rank) : undefined,
    };
  }

  /**
   * Map IngestionLog entity to DTO
   */
  private mapToStatusDto(log: IngestionLog): IngestionStatusDto {
    return {
      id: log.id,
      fileName: log.fileName,
      fileType: log.fileType,
      status: log.status,
      totalRows: log.totalRows,
      processedRows: log.processedRows,
      failedRows: log.failedRows,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      competitionId: log.competitionId,
    };
  }
}
