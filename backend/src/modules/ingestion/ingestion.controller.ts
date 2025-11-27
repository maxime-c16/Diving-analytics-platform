import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';

import { IngestionService, RowError } from './ingestion.service';
import {
  UploadCompetitionDto,
  IngestionStatusDto,
  IngestionResponseDto,
  PdfUploadDto,
  PdfJobStatusDto,
} from './dto/upload-competition.dto';
import { IngestionStatus } from '../../entities/ingestion-log.entity';

// Worker service URL
const WORKER_URL = process.env.WORKER_URL || 'http://worker-service:8080';

@ApiTags('Ingestion')
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('upload/csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
          return callback(new Error('Only CSV files are allowed'), false);
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload competition results CSV',
    description: `
Upload a CSV file containing diving competition results.

**Expected CSV columns:**
- \`athlete_name\` or \`name\` - Athlete's full name (required)
- \`country\` - Athlete's country code or name (optional)
- \`dive_code\` or \`dive\` - FINA dive code like 105B, 405C (required)
- \`round\` - Round number, defaults to 1 (optional)
- \`judge_scores\` or \`scores\` - Comma-separated scores or JSON array (required)
- \`difficulty\` or \`dd\` - Degree of difficulty, auto-calculated if not provided (optional)
- \`final_score\` or \`score\` - Final score, auto-calculated if not provided (optional)
- \`rank\` - Athlete's rank in this round (optional)

**Example CSV:**
\`\`\`
athlete_name,country,dive_code,round,judge_scores,rank
John Smith,USA,105B,1,"7.0,7.5,8.0,7.5,7.0",1
Jane Doe,GBR,405C,1,"6.5,7.0,7.0,6.5,7.0",2
\`\`\`
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file and competition details',
    schema: {
      type: 'object',
      required: ['file', 'competitionName', 'eventType'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file containing competition results',
        },
        competitionName: {
          type: 'string',
          example: 'World Diving Championships 2025',
          description: 'Name of the competition',
        },
        competitionDate: {
          type: 'string',
          format: 'date',
          example: '2025-11-26',
          description: 'Date of the competition',
        },
        location: {
          type: 'string',
          example: 'Budapest, Hungary',
          description: 'Location of the competition',
        },
        eventType: {
          type: 'string',
          enum: ['1m', '3m', '5m', '7.5m', '10m'],
          example: '3m',
          description: 'Event type/platform height',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded and processing started',
    type: IngestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or request data',
  })
  async uploadCsv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadCompetitionDto,
  ): Promise<IngestionResponseDto> {
    const result = await this.ingestionService.uploadCompetitionCsv(file, dto);
    
    return {
      success: true,
      message: 'File uploaded successfully. Processing started.',
      data: result,
    };
  }

  @Get('status/:id')
  @ApiOperation({
    summary: 'Get ingestion job status',
    description: 'Get the current status of an ingestion job by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Ingestion job UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ingestion job status',
    type: IngestionStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ingestion job not found',
  })
  async getStatus(@Param('id') id: string): Promise<IngestionStatusDto> {
    return this.ingestionService.getIngestionStatus(id);
  }

  @Get('status/:id/errors')
  @ApiOperation({
    summary: 'Get ingestion job errors',
    description: 'Get detailed error information for failed rows in an ingestion job.',
  })
  @ApiParam({
    name: 'id',
    description: 'Ingestion job UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ingestion job errors',
    schema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              row: { type: 'number', example: 5 },
              error: { type: 'string', example: 'Invalid dive code: XYZ' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ingestion job not found',
  })
  async getErrors(@Param('id') id: string): Promise<{ errors: RowError[] }> {
    return this.ingestionService.getIngestionErrors(id);
  }

  @Get('logs')
  @ApiOperation({
    summary: 'List ingestion logs',
    description: 'Get a paginated list of all ingestion jobs with optional status filter.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: IngestionStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip (default: 0)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of ingestion logs',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/IngestionStatusDto' },
        },
        total: { type: 'number', example: 50 },
      },
    },
  })
  async getLogs(
    @Query('status') status?: IngestionStatus,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    return this.ingestionService.getIngestionLogs(
      status,
      Number(limit),
      Number(offset),
    );
  }

  @Post('upload/pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for PDFs
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.pdf')) {
          return callback(new Error('Only PDF files are allowed'), false);
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload competition results PDF (OCR)',
    description: `
Upload a PDF file containing diving competition results for OCR processing.

The worker service will:
1. Convert PDF pages to images
2. Run OCR (Tesseract) to extract text
3. Parse extracted text for diving results data
4. Return structured data that can be reviewed and imported

**Supported PDF formats:**
- FINA/World Aquatics official result sheets
- Competition scoreboard exports
- Any PDF with structured diving result data

**Returns:** A job ID that can be used to poll for status and results.
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'PDF file and optional metadata overrides',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file containing competition results',
        },
        competitionName: {
          type: 'string',
          example: 'World Diving Championships 2025',
          description: 'Override extracted competition name',
        },
        competitionDate: {
          type: 'string',
          format: 'date',
          example: '2025-11-26',
          description: 'Override extracted date',
        },
        location: {
          type: 'string',
          example: 'Budapest, Hungary',
          description: 'Override extracted location',
        },
        eventType: {
          type: 'string',
          enum: ['1m', '3m', '5m', '7.5m', '10m'],
          example: '3m',
          description: 'Override extracted event type',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'PDF uploaded and OCR processing started',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'PDF uploaded. OCR processing started.' },
        jobId: { type: 'string', example: 'pdf-a1b2c3d4-e5f6' },
        statusUrl: { type: 'string', example: '/api/ingestion/pdf/status/pdf-a1b2c3d4-e5f6' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or request data',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Worker service unavailable',
  })
  async uploadPdf(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() dto: PdfUploadDto,
  ) {
    const jobId = `pdf-${uuidv4()}`;
    
    try {
      // Convert file buffer to base64 for transmission
      const pdfBytesB64 = file.buffer.toString('base64');
      
      // Send to worker service
      const response = await fetch(`${WORKER_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          pdf_bytes: pdfBytesB64,
          metadata: {
            filename: file.originalname,
            ...dto,
          },
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Worker service error: ${errorText}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      
      return {
        success: true,
        message: 'PDF uploaded. OCR processing started.',
        jobId,
        statusUrl: `/api/ingestion/pdf/status/${jobId}`,
      };
      
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to initiate PDF processing: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('pdf/status/:jobId')
  @ApiOperation({
    summary: 'Get PDF OCR job status',
    description: 'Get the current status and results of a PDF OCR processing job.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'PDF job ID returned from upload',
    example: 'pdf-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF job status and results',
    type: PdfJobStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  async getPdfStatus(@Param('jobId') jobId: string): Promise<PdfJobStatusDto> {
    try {
      const response = await fetch(`${WORKER_URL}/job/${jobId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
        }
        throw new HttpException(
          'Failed to get job status',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      
      const data = await response.json();
      
      return {
        jobId,
        status: data.status,
        message: data.data?.message,
        confidence: data.data?.confidence,
        competitionName: data.data?.competition_name,
        eventType: data.data?.event_type,
        divesExtracted: data.data?.dives?.length || 0,
        errors: data.data?.errors,
        dives: data.data?.dives,
        // Multi-height support
        detectedHeights: data.data?.detected_heights,
        eventsDetected: data.data?.events_detected,
        hasMultipleHeights: data.data?.has_multiple_heights || false,
      };
      
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get job status: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('pdf/import/:jobId')
  @ApiOperation({
    summary: 'Import extracted PDF data',
    description: 'Import the extracted data from a completed PDF OCR job into the database.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'PDF job ID of a completed job',
    example: 'pdf-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiBody({
    description: 'Import options and overrides',
    schema: {
      type: 'object',
      properties: {
        competitionName: {
          type: 'string',
          description: 'Override competition name',
        },
        competitionDate: {
          type: 'string',
          format: 'date',
          description: 'Override competition date',
        },
        location: {
          type: 'string',
          description: 'Override location',
        },
        eventType: {
          type: 'string',
          enum: ['1m', '3m', '5m', '7.5m', '10m'],
          description: 'Override event type',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data imported successfully',
    type: IngestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found or not completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job has no extractable data',
  })
  async importPdfData(
    @Param('jobId') jobId: string,
    @Body() overrides: PdfUploadDto,
  ): Promise<IngestionResponseDto> {
    // Get job status first
    const status = await this.getPdfStatus(jobId);
    
    if (status.status !== 'completed') {
      throw new HttpException(
        `Job is not completed. Current status: ${status.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    
    if (!status.dives || status.dives.length === 0) {
      throw new HttpException(
        'No dive data found in extraction results',
        HttpStatus.BAD_REQUEST,
      );
    }
    
    // Convert PDF extraction data to import format, including confidence score
    const result = await this.ingestionService.importPdfData({
      competitionName: overrides.competitionName || status.competitionName || 'Imported Competition',
      competitionDate: overrides.competitionDate,
      location: overrides.location,
      eventType: overrides.eventType || status.eventType || '3m',
      dives: status.dives,
      sourceJobId: jobId,
      confidence: status.confidence,
    });
    
    return {
      success: true,
      message: `Imported ${result.processedRows} dives from PDF extraction.`,
      data: result,
    };
  }

  @Get('competition/:id')
  @ApiOperation({
    summary: 'Get competition data with dives',
    description: 'Get full competition data including all dives and athlete information.',
  })
  @ApiParam({
    name: 'id',
    description: 'Competition ID (numeric) or Ingestion Job UUID',
    example: '1',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Competition data with dives',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Competition not found',
  })
  async getCompetitionData(@Param('id') id: string) {
    return this.ingestionService.getCompetitionData(id);
  }

  @Get('competition/:id/events')
  @ApiOperation({
    summary: 'List events within a competition',
    description: 'Get list of distinct events (e.g., "Elite - Dames - 3m") within a competition.',
  })
  @ApiParam({
    name: 'id',
    description: 'Competition ID (numeric) or Ingestion Job UUID',
    example: '1',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of events within the competition',
    schema: {
      type: 'object',
      properties: {
        competitionId: { type: 'number', example: 1 },
        eventNames: {
          type: 'array',
          items: { type: 'string' },
          example: ['Elite - Dames - 3m', 'Elite - Messieurs - HV'],
        },
        hasMultipleEvents: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Competition not found',
  })
  async getCompetitionEvents(@Param('id') id: string) {
    return this.ingestionService.getCompetitionEvents(id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Ingestion service health check' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Service is healthy' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'ingestion',
      timestamp: new Date().toISOString(),
    };
  }
}
