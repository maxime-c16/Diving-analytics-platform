import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CalculateScoreDto, ScoreResultDto } from './calculate-score.dto';

export class BatchScoreDto {
  @ApiProperty({
    description: 'Array of dives to calculate',
    type: [CalculateScoreDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CalculateScoreDto)
  dives: CalculateScoreDto[];
}

export class BatchScoreResultDto {
  @ApiProperty({ description: 'Array of calculated scores', type: [ScoreResultDto] })
  results: ScoreResultDto[];

  @ApiProperty({ description: 'Number of dives processed', example: 3 })
  total: number;
}
