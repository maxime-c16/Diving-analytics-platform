import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ScoresService } from './scores.service';
import { CalculateScoreDto, ScoreResultDto, TotalScoreResultDto } from './dto/calculate-score.dto';
import { BatchScoreDto, BatchScoreResultDto } from './dto/batch-score.dto';

@ApiTags('scores')
@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check for scores service',
    description: 'Returns the health status and available features of the scores calculation service'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'scores' },
        timestamp: { type: 'string', example: '2025-11-23T21:00:00.000Z' },
        features: { type: 'array', items: { type: 'string' }, example: ['5-judge', '7-judge', 'fina-rules'] }
      }
    }
  })
  health() {
    return {
      status: 'ok',
      service: 'scores',
      timestamp: new Date().toISOString(),
      features: ['5-judge', '7-judge', 'fina-rules'],
    };
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Calculate score for a single dive',
    description: 'Calculates the final score for a dive using FINA scoring rules. Supports 5-judge (drop 1 high, 1 low) and 7-judge (drop 2 high, 2 low) panels.'
  })
  @ApiBody({ type: CalculateScoreDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Score calculated successfully',
    type: ScoreResultDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input (bad dive code or judge count)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid dive code or must have exactly 5 or 7 judges' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  calculate(@Body() dto: CalculateScoreDto): ScoreResultDto {
    return this.scoresService.calculateScore(dto.diveCode, dto.judgeScores);
  }

  @Post('calculate-total')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Calculate total score for multiple dives',
    description: 'Calculates individual scores and returns the total competition score across all dives.'
  })
  @ApiBody({ type: [CalculateScoreDto] })
  @ApiResponse({ 
    status: 200, 
    description: 'Total score calculated successfully',
    type: TotalScoreResultDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  calculateTotal(@Body() dives: CalculateScoreDto[]): TotalScoreResultDto {
    return this.scoresService.calculateTotalScore(dives);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Batch process multiple dives',
    description: 'Process multiple dive calculations in a single request. Returns an array of results.'
  })
  @ApiBody({ type: BatchScoreDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Batch processing completed successfully',
    type: BatchScoreResultDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  batch(@Body() batchDto: BatchScoreDto): BatchScoreResultDto {
    const results = batchDto.dives.map(dive =>
      this.scoresService.calculateScore(dive.diveCode, dive.judgeScores),
    );

    return {
      results,
      total: results.length,
    };
  }
}
