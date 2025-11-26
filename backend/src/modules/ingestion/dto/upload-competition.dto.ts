import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export class UploadCompetitionDto {
  @ApiProperty({
    description: 'Name of the competition',
    example: 'World Diving Championships 2025',
  })
  @IsString()
  @IsNotEmpty()
  competitionName: string;

  @ApiPropertyOptional({
    description: 'Date of the competition (ISO format)',
    example: '2025-11-26',
  })
  @IsOptional()
  @IsDateString()
  competitionDate?: string;

  @ApiPropertyOptional({
    description: 'Location of the competition',
    example: 'Budapest, Hungary',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Event type/height',
    example: '3m',
    enum: ['1m', '3m', '5m', '7.5m', '10m'],
  })
  @IsIn(['1m', '3m', '5m', '7.5m', '10m'])
  eventType: string;
}

export class IngestionStatusDto {
  @ApiProperty({
    description: 'Unique ingestion job ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'competition_results.csv',
  })
  fileName: string;

  @ApiProperty({
    description: 'File type',
    enum: ['csv', 'pdf', 'json'],
    example: 'csv',
  })
  fileType: string;

  @ApiProperty({
    description: 'Current processing status',
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'Total number of rows in the file',
    example: 100,
  })
  totalRows: number;

  @ApiProperty({
    description: 'Number of successfully processed rows',
    example: 98,
  })
  processedRows: number;

  @ApiProperty({
    description: 'Number of failed rows',
    example: 2,
  })
  failedRows: number;

  @ApiPropertyOptional({
    description: 'Error message if ingestion failed',
    example: 'Invalid dive code in row 5',
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'When the ingestion was created',
    example: '2025-11-26T10:30:00Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'When processing started',
    example: '2025-11-26T10:30:01Z',
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'When processing completed',
    example: '2025-11-26T10:30:05Z',
  })
  completedAt?: Date;

  @ApiPropertyOptional({
    description: 'Associated competition ID',
    example: 1,
  })
  competitionId?: number;
}

export class IngestionResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'File uploaded successfully. Processing started.',
  })
  message: string;

  @ApiProperty({
    description: 'Ingestion job details',
    type: IngestionStatusDto,
  })
  data: IngestionStatusDto;
}

export class CsvRowDto {
  @ApiProperty({ description: 'Athlete name', example: 'John Doe' })
  athleteName: string;

  @ApiPropertyOptional({ description: 'Athlete country', example: 'USA' })
  country?: string;

  @ApiProperty({ description: 'Dive code', example: '105B' })
  diveCode: string;

  @ApiPropertyOptional({ description: 'Round number', example: 1 })
  round?: number;

  @ApiProperty({
    description: 'Judge scores (comma-separated or JSON array)',
    example: '7.0,7.5,8.0,7.5,7.0',
  })
  judgeScores: string;

  @ApiPropertyOptional({ description: 'Difficulty (auto-calculated if not provided)', example: 2.4 })
  difficulty?: number;

  @ApiPropertyOptional({ description: 'Final score (auto-calculated if not provided)', example: 52.8 })
  finalScore?: number;

  @ApiPropertyOptional({ description: 'Rank in competition', example: 3 })
  rank?: number;
}

export class PdfUploadDto {
  @ApiPropertyOptional({
    description: 'Override competition name (otherwise extracted from PDF)',
    example: 'World Diving Championships 2025',
  })
  @IsOptional()
  @IsString()
  competitionName?: string;

  @ApiPropertyOptional({
    description: 'Override competition date (otherwise extracted from PDF)',
    example: '2025-11-26',
  })
  @IsOptional()
  @IsDateString()
  competitionDate?: string;

  @ApiPropertyOptional({
    description: 'Override location (otherwise extracted from PDF)',
    example: 'Budapest, Hungary',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Override event type/height. Use "auto" to use per-dive heights detected from event names.',
    example: '3m',
    enum: ['1m', '3m', '5m', '7.5m', '10m', 'auto'],
  })
  @IsOptional()
  @IsIn(['1m', '3m', '5m', '7.5m', '10m', 'auto'])
  eventType?: string;
}

export class PdfJobStatusDto {
  @ApiProperty({
    description: 'Unique PDF job ID',
    example: 'pdf-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  jobId: string;

  @ApiProperty({
    description: 'Current processing status',
    enum: ['queued', 'processing', 'completed', 'failed'],
    example: 'processing',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Processing progress message',
    example: 'OCR processing page 3 of 5',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Extraction confidence score (0.0 - 1.0)',
    example: 0.85,
  })
  confidence?: number;

  @ApiPropertyOptional({
    description: 'Extracted competition name',
    example: 'World Diving Championships 2025',
  })
  competitionName?: string;

  @ApiPropertyOptional({
    description: 'Extracted event type',
    example: '3m',
  })
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Number of dives extracted',
    example: 45,
  })
  divesExtracted?: number;

  @ApiPropertyOptional({
    description: 'Error messages if processing failed',
    type: [String],
    example: ['Unable to extract text from PDF'],
  })
  errors?: string[];

  @ApiPropertyOptional({
    description: 'Extracted dive data (only present when completed)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        athlete_name: { type: 'string' },
        dive_code: { type: 'string' },
        round_number: { type: 'number' },
        judge_scores: { type: 'array', items: { type: 'number' } },
        difficulty: { type: 'number' },
        final_score: { type: 'number' },
        rank: { type: 'number' },
        country: { type: 'string' },
        event_name: { type: 'string' },
        height: { type: 'string' },
      },
    },
  })
  dives?: any[];

  @ApiPropertyOptional({
    description: 'List of heights detected in the PDF (e.g., ["1m", "3m", "10m"])',
    type: [String],
    example: ['1m', '3m'],
  })
  detectedHeights?: string[];

  @ApiPropertyOptional({
    description: 'List of event names detected in the PDF',
    type: [String],
    example: ['Elite - Dames - 3m', 'Jeunes - Garçons - 1m'],
  })
  eventsDetected?: string[];

  @ApiPropertyOptional({
    description: 'Whether the PDF contains multiple event heights',
    example: true,
  })
  hasMultipleHeights?: boolean;
}
