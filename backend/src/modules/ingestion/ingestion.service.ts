import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
  height?: string;  // Height for this specific dive (e.g., '3m', '10m')
  eventName?: string;  // Event within competition (e.g., 'Elite - Dames - 3m')
}

type AthleteCache = Map<string, Athlete>;

export interface RowError {
  row: number;
  error: string;
  data?: ParsedCsvRow;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  private getAthleteCacheKey(name: string, country?: string): string {
    return `${name.trim().toLowerCase()}::${(country || '').trim().toLowerCase()}`;
  }

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
      const athleteCache: AthleteCache = new Map();

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        try {
          const processedRow = this.processRow(rows[i], height, i + 2); // +2 for header row and 0-indexing
          await this.insertRow(processedRow, competition, athleteCache);
          processedCount++;
          
          // Update progress periodically without hammering the DB
          if (processedCount % 50 === 0) {
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
  private async insertRow(
    row: ProcessedRow,
    competition: Competition,
    athleteCache?: AthleteCache,
  ): Promise<void> {
    const cacheKey = this.getAthleteCacheKey(row.athleteName, row.country);

    // Find or create athlete
    let athlete = athleteCache?.get(cacheKey);

    if (!athlete) {
      athlete = await this.athleteRepository.findOne({
        where: { name: row.athleteName },
      });
    }

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

    athleteCache?.set(cacheKey, athlete);

    // Get position from dive code
    const position = row.diveCode.slice(-1);

    // Get height from the row (for multi-height imports) or from competition
    let heightValue: number;
    if (row.height) {
      heightValue = parseFloat(row.height.replace('m', ''));
    } else if (competition.eventType && competition.eventType !== 'mixed') {
      heightValue = parseFloat(competition.eventType.replace('m', ''));
    } else {
      heightValue = 3; // Default to 3m if unknown
    }

    // Create dive record
    const dive = this.diveRepository.create({
      athleteId: athlete.id,
      competitionId: competition.id,
      diveCode: row.diveCode,
      position,
      height: heightValue,
      difficulty: row.difficulty,
      judgeScores: row.judgeScores,
      finalScore: row.finalScore,
      rank: row.rank,
      roundNumber: row.roundNumber,
      eventName: row.eventName,
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
  ): Promise<{ data: Array<IngestionStatusDto & {
    competitionName?: string;
    location?: string;
    eventType?: string;
    athleteCount?: number;
    diveCount?: number;
    averageScore?: number;
  }>; total: number }> {
    const queryBuilder = this.ingestionLogRepository.createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (status) {
      queryBuilder.where('log.status = :status', { status });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();
    const competitionIds = Array.from(
      new Set(logs.map((log) => log.competitionId).filter((id): id is number => typeof id === 'number')),
    );

    const competitions = competitionIds.length > 0
      ? await this.competitionRepository.findBy({ id: In(competitionIds) })
      : [];

    const competitionsById = new Map(competitions.map((competition) => [competition.id, competition]));

    const diveStats = competitionIds.length > 0
      ? await this.diveRepository
          .createQueryBuilder('dive')
          .select('dive.competition_id', 'competitionId')
          .addSelect('COUNT(*)', 'diveCount')
          .addSelect('COUNT(DISTINCT dive.athlete_id)', 'athleteCount')
          .addSelect('AVG(dive.final_score)', 'averageScore')
          .where('dive.competition_id IN (:...competitionIds)', { competitionIds })
          .groupBy('dive.competition_id')
          .getRawMany()
      : [];

    const diveStatsByCompetitionId = new Map(
      diveStats.map((row) => [
        Number(row.competitionId),
        {
          diveCount: Number(row.diveCount),
          athleteCount: Number(row.athleteCount),
          averageScore: row.averageScore === null ? undefined : Number(row.averageScore),
        },
      ]),
    );

    return {
      data: logs.map((log) => {
        const base = this.mapToStatusDto(log);
        const competition = log.competitionId ? competitionsById.get(log.competitionId) : undefined;
        const stats = log.competitionId ? diveStatsByCompetitionId.get(log.competitionId) : undefined;

        return {
          ...base,
          competitionName: competition?.name,
          location: competition?.location,
          eventType: competition?.eventType,
          athleteCount: stats?.athleteCount,
          diveCount: stats?.diveCount,
          averageScore: stats?.averageScore,
        };
      }),
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
    confidence?: number;
  }): Promise<IngestionStatusDto> {
    const { competitionName, competitionDate, location, eventType, dives, sourceJobId, confidence } = params;
    
    // Handle 'auto' mode - use per-dive heights, default to '3m' for competition record
    const isAutoHeight = eventType === 'auto';
    const defaultHeight = isAutoHeight ? '3m' : eventType;
    const height = defaultHeight as DivingHeight;

    // Create ingestion log with confidence score
    const ingestionLog = this.ingestionLogRepository.create({
      id: uuidv4(),
      fileName: `pdf-import-${sourceJobId}`,
      fileType: IngestionFileType.PDF,
      fileSize: 0,
      status: IngestionStatus.PENDING,
      totalRows: dives.length,
      confidence: confidence,
    });
    await this.ingestionLogRepository.save(ingestionLog);

    // For 'auto' mode, use 'mixed' as event type to indicate multiple heights
    const competitionEventType = isAutoHeight ? 'mixed' : eventType;

    // Create or find competition
    let competition = await this.competitionRepository.findOne({
      where: {
        name: competitionName,
        eventType: competitionEventType,
      },
    });

    let isNewCompetition = false;
    if (!competition) {
      competition = this.competitionRepository.create({
        name: competitionName,
        date: competitionDate ? new Date(competitionDate) : null,
        location,
        eventType: competitionEventType,
      });
      await this.competitionRepository.save(competition);
      isNewCompetition = true;
    } else {
      // If re-importing to existing competition, clear old dives first
      const existingDiveCount = await this.diveRepository.count({
        where: { competitionId: competition.id },
      });
      if (existingDiveCount > 0) {
        this.logger.log(`Clearing ${existingDiveCount} existing dives for competition ${competition.id} before re-import`);
        await this.diveRepository.delete({ competitionId: competition.id });
      }
    }

    ingestionLog.competitionId = competition.id;
    ingestionLog.status = IngestionStatus.PROCESSING;
    ingestionLog.startedAt = new Date();
    await this.ingestionLogRepository.save(ingestionLog);

    const errors: RowError[] = [];
    let processedCount = 0;
    const athleteCache: AthleteCache = new Map();

    // Process each extracted dive
    for (let i = 0; i < dives.length; i++) {
      try {
        const dive = dives[i];
        const processedRow = this.processPdfDive(dive, height, i + 1);
        await this.insertRow(processedRow, competition, athleteCache);
        processedCount++;
      } catch (error) {
        const errorMsg = error.message || String(error);
        // Log first 3 errors for debugging
        if (errors.length < 3) {
          this.logger.error(`Dive ${i + 1} failed: ${errorMsg}`, {
            dive: dives[i],
            defaultHeight: height,
          });
        }
        errors.push({
          row: i + 1,
          error: errorMsg,
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
   * Uses per-dive height if available, otherwise falls back to global height
   */
  private processPdfDive(dive: any, defaultHeight: DivingHeight, rowNum: number): ProcessedRow {
    const athleteName = dive.athlete_name || dive.athleteName || 'Unknown';
    const diveCode = (dive.dive_code || dive.diveCode || '').toUpperCase().trim();
    const roundNumber = dive.round_number || dive.roundNumber || 1;
    const country = dive.country;
    const eventName = dive.event_name || dive.eventName;

    // Use per-dive height if available, otherwise use default
    const diveHeight = dive.height || defaultHeight;
    const height = diveHeight as DivingHeight;

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
      height: height,  // Include the height for this dive
      eventName,  // Include the event name for this dive
    };
  }

  /**
   * Get competition data with all dives and athletes
   */
  async getCompetitionData(id: string) {
    // Try to find by ingestion job ID first
    const log = await this.ingestionLogRepository.findOne({ where: { id } });
    
    let competitionId: number;
    if (log && log.competitionId) {
      competitionId = log.competitionId;
    } else if (!isNaN(Number(id))) {
      competitionId = Number(id);
    } else {
      throw new NotFoundException(`Competition not found for ID: ${id}`);
    }

    // Get competition with dives and athletes
    const competition = await this.competitionRepository.findOne({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundException(`Competition not found: ${competitionId}`);
    }

    // Get all dives for this competition with athletes
    const dives = await this.diveRepository.find({
      where: { competitionId },
      relations: ['athlete'],
      order: { roundNumber: 'ASC', rank: 'ASC' },
    });

    // Get list of unique events in this competition
    const eventNames = [...new Set(dives.map(d => d.eventName).filter(Boolean))];
    const hasMultipleEvents = eventNames.length > 1;

    // Helper function to process dives for a specific subset
    const processDives = (divesToProcess: typeof dives) => {
      // Group dives by athlete for analysis
      const athleteMap = new Map<number, {
        athlete: { id: number; name: string; country?: string };
        dives: typeof dives;
        totalScore: number;
        averageScore: number;
      }>();

      for (const dive of divesToProcess) {
        if (!dive.athleteId) continue;
        
        if (!athleteMap.has(dive.athleteId)) {
          athleteMap.set(dive.athleteId, {
            athlete: {
              id: dive.athleteId,
              name: dive.athlete?.name || 'Unknown',
              country: dive.athlete?.country,
            },
            dives: [],
            totalScore: 0,
            averageScore: 0,
          });
        }
        
        const athleteData = athleteMap.get(dive.athleteId)!;
        athleteData.dives.push(dive);
        athleteData.totalScore += Number(dive.finalScore) || 0;
      }

      // Calculate averages and create rankings
      const athletes = Array.from(athleteMap.values()).map(a => ({
        ...a,
        averageScore: a.dives.length > 0 ? a.totalScore / a.dives.length : 0,
        diveCount: a.dives.length,
      }));

      // Sort by total score descending
      athletes.sort((a, b) => b.totalScore - a.totalScore);

      // Add rankings
      const rankedAthletes = athletes.map((a, index) => ({
        ...a,
        rank: index + 1,
      }));

      // Calculate statistics
      const allScores = divesToProcess.map(d => Number(d.finalScore) || 0).filter(s => s > 0);
      const statistics = {
        totalDives: divesToProcess.length,
        totalAthletes: athleteMap.size,
        averageScore: allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0,
        highestScore: allScores.length > 0 ? Math.max(...allScores) : 0,
        lowestScore: allScores.length > 0 ? Math.min(...allScores) : 0,
        rounds: Math.max(...divesToProcess.map(d => d.roundNumber || 1), 0),
      };

      // Group dives by round for round-by-round analysis
      const roundMap = new Map<number, typeof dives>();
      for (const dive of divesToProcess) {
        const round = dive.roundNumber || 1;
        if (!roundMap.has(round)) {
          roundMap.set(round, []);
        }
        roundMap.get(round)!.push(dive);
      }

      const rounds = Array.from(roundMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([roundNumber, roundDives]) => {
          const scores = roundDives.map(d => Number(d.finalScore) || 0).filter(s => s > 0);
          return {
            roundNumber,
            diveCount: roundDives.length,
            averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
            highestScore: scores.length > 0 ? Math.max(...scores) : 0,
            dives: roundDives.map(d => ({
              id: d.id,
              athleteName: d.athlete?.name || 'Unknown',
              athleteCountry: d.athlete?.country,
              diveCode: d.diveCode,
              difficulty: Number(d.difficulty),
              judgeScores: d.judgeScores,
              finalScore: Number(d.finalScore),
              rank: d.rank,
              eventName: d.eventName,
            })),
          };
        });

      return {
        statistics,
        athletes: rankedAthletes.map(a => ({
          rank: a.rank,
          athlete: a.athlete,
          totalScore: Math.round(a.totalScore * 100) / 100,
          averageScore: Math.round(a.averageScore * 100) / 100,
          diveCount: a.diveCount,
          dives: a.dives.map(d => ({
            id: d.id,
            roundNumber: d.roundNumber,
            diveCode: d.diveCode,
            difficulty: Number(d.difficulty),
            judgeScores: d.judgeScores,
            finalScore: Number(d.finalScore),
            rank: d.rank,
            eventName: d.eventName,
          })),
        })),
        rounds,
      };
    };

    // Process all dives for overall competition view
    const overallData = processDives(dives);

    // Process each event separately if there are multiple events
    const eventData: Record<string, ReturnType<typeof processDives>> = {};
    if (hasMultipleEvents) {
      for (const eventName of eventNames) {
        const eventDives = dives.filter(d => d.eventName === eventName);
        eventData[eventName] = processDives(eventDives);
      }
    }

    return {
      competition: {
        id: competition.id,
        name: competition.name,
        date: competition.date,
        location: competition.location,
        eventType: competition.eventType,
      },
      eventNames,
      hasMultipleEvents,
      // Overall combined data
      statistics: overallData.statistics,
      athletes: overallData.athletes,
      rounds: overallData.rounds,
      // Per-event data (only populated if multiple events)
      events: hasMultipleEvents ? eventData : undefined,
    };
  }

  /**
   * Get list of events within a competition
   */
  async getCompetitionEvents(id: string) {
    // Try to find by ingestion job ID first
    const log = await this.ingestionLogRepository.findOne({ where: { id } });
    
    let competitionId: number;
    if (log && log.competitionId) {
      competitionId = log.competitionId;
    } else if (!isNaN(Number(id))) {
      competitionId = Number(id);
    } else {
      throw new NotFoundException(`Competition not found for ID: ${id}`);
    }

    // Get all dives for this competition
    const dives = await this.diveRepository.find({
      where: { competitionId },
      select: ['eventName'],
    });

    // Get list of unique events
    const eventNames = [...new Set(dives.map(d => d.eventName).filter(Boolean))];
    const hasMultipleEvents = eventNames.length > 1;

    return {
      competitionId,
      eventNames,
      hasMultipleEvents,
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
      confidence: log.confidence,
    };
  }

  /**
   * Update a dive in the database
   */
  async updateDive(
    diveId: number,
    updates: {
      athleteName?: string;
      diveCode?: string;
      roundNumber?: number;
      judgeScores?: number[];
      difficulty?: number;
      finalScore?: number;
    },
  ) {
    const dive = await this.diveRepository.findOne({ where: { id: diveId } });
    
    if (!dive) {
      throw new NotFoundException(`Dive with ID ${diveId} not found`);
    }

    // Apply updates
    if (updates.diveCode !== undefined) {
      dive.diveCode = updates.diveCode;
      // Extract position from dive code
      const position = updates.diveCode.slice(-1).toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(position)) {
        dive.position = position;
      }
    }
    
    if (updates.roundNumber !== undefined) {
      dive.roundNumber = updates.roundNumber;
    }
    
    if (updates.judgeScores !== undefined) {
      dive.judgeScores = updates.judgeScores;
    }
    
    if (updates.difficulty !== undefined) {
      dive.difficulty = updates.difficulty;
    }
    
    if (updates.finalScore !== undefined) {
      dive.finalScore = updates.finalScore;
    }

    // Handle athlete name update - need to find or create athlete
    if (updates.athleteName !== undefined && updates.athleteName !== '') {
      let athlete = await this.athleteRepository.findOne({
        where: { name: updates.athleteName },
      });
      
      if (!athlete) {
        athlete = this.athleteRepository.create({
          name: updates.athleteName,
        });
        await this.athleteRepository.save(athlete);
      }
      
      dive.athleteId = athlete.id;
    }

    await this.diveRepository.save(dive);
    
    return dive;
  }

  /**
   * Delete a dive from the database
   */
  async deleteDive(diveId: number): Promise<void> {
    const dive = await this.diveRepository.findOne({ where: { id: diveId } });
    
    if (!dive) {
      throw new NotFoundException(`Dive with ID ${diveId} not found`);
    }

    await this.diveRepository.delete(diveId);
    this.logger.log(`Deleted dive ${diveId}`);
  }

  /**
   * Delete a competition and all its associated dives
   */
  async deleteCompetition(competitionId: number): Promise<{ message: string; deletedDives: number }> {
    const competition = await this.competitionRepository.findOne({ 
      where: { id: competitionId } 
    });
    
    if (!competition) {
      throw new NotFoundException(`Competition with ID ${competitionId} not found`);
    }

    // Count dives before deletion
    const diveCount = await this.diveRepository.count({ 
      where: { competitionId } 
    });

    // Delete all dives for this competition
    await this.diveRepository.delete({ competitionId });

    // Delete the competition
    await this.competitionRepository.delete(competitionId);

    // Also delete associated ingestion logs
    await this.ingestionLogRepository.delete({ competitionId });

    this.logger.log(`Deleted competition ${competitionId} with ${diveCount} dives`);

    return {
      message: `Competition and ${diveCount} dives deleted successfully`,
      deletedDives: diveCount,
    };
  }

  /**
   * Update an athlete's details
   */
  async updateAthlete(
    athleteId: number,
    updates: { name?: string; country?: string },
  ): Promise<void> {
    const athlete = await this.athleteRepository.findOne({ 
      where: { id: athleteId } 
    });
    
    if (!athlete) {
      throw new NotFoundException(`Athlete with ID ${athleteId} not found`);
    }

    if (updates.name !== undefined) {
      athlete.name = updates.name;
    }
    
    if (updates.country !== undefined) {
      athlete.country = updates.country;
    }

    await this.athleteRepository.save(athlete);
    this.logger.log(`Updated athlete ${athleteId}`);
  }

  /**
   * Get judge consistency statistics for a competition
   */
  async getJudgeStats(id: string) {
    // Get competition ID
    const log = await this.ingestionLogRepository.findOne({ where: { id } });
    
    let competitionId: number;
    if (log && log.competitionId) {
      competitionId = log.competitionId;
    } else if (!isNaN(Number(id))) {
      competitionId = Number(id);
    } else {
      throw new NotFoundException(`Competition not found for ID: ${id}`);
    }

    // Get all dives with judge scores
    const dives = await this.diveRepository.find({
      where: { competitionId },
      select: ['judgeScores'],
    });

    // Find max number of judges
    let maxJudges = 0;
    for (const dive of dives) {
      if (dive.judgeScores && dive.judgeScores.length > maxJudges) {
        maxJudges = dive.judgeScores.length;
      }
    }

    if (maxJudges === 0) {
      return {
        judges: [],
        overallConsistency: 'low' as const,
      };
    }

    // Calculate per-judge statistics
    const judgeStats: {
      judgeIndex: number;
      judge: string;
      mean: number;
      std: number;
      min: number;
      max: number;
      diveCount: number;
      consistency: 'high' | 'medium' | 'low';
    }[] = [];

    for (let j = 0; j < maxJudges; j++) {
      const scores: number[] = [];
      
      for (const dive of dives) {
        if (dive.judgeScores && dive.judgeScores[j] !== undefined) {
          scores.push(dive.judgeScores[j]);
        }
      }

      if (scores.length === 0) continue;

      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
      const std = Math.sqrt(variance);

      // Determine consistency rating based on standard deviation
      let consistency: 'high' | 'medium' | 'low';
      if (std < 0.8) {
        consistency = 'high';
      } else if (std < 1.2) {
        consistency = 'medium';
      } else {
        consistency = 'low';
      }

      judgeStats.push({
        judgeIndex: j,
        judge: `J${j + 1}`,
        mean: Math.round(mean * 100) / 100,
        std: Math.round(std * 100) / 100,
        min: Math.min(...scores),
        max: Math.max(...scores),
        diveCount: scores.length,
        consistency,
      });
    }

    // Overall consistency based on average std
    const avgStd = judgeStats.reduce((sum, j) => sum + j.std, 0) / judgeStats.length;
    let overallConsistency: 'high' | 'medium' | 'low';
    if (avgStd < 0.8) {
      overallConsistency = 'high';
    } else if (avgStd < 1.2) {
      overallConsistency = 'medium';
    } else {
      overallConsistency = 'low';
    }

    return {
      judges: judgeStats,
      overallConsistency,
    };
  }
}
