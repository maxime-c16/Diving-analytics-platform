import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
  Validate,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { IsDiveCode } from "../../../common/validators/dive-code.validator";

export class CalculateScoreDto {
  @ApiProperty({
    description:
      "FINA dive code. Groups 1-4: [Group][Flying][Half-Somersaults][Position]. " +
      "Group 5: [5][Direction][Half-Somersaults][Half-Twists][Position]. " +
      "Group 6: [6][Direction][Half-Somersaults][Half-Twists]?[Position].",
    example: "103B",
    examples: ["103B", "113C", "5132D", "612B", "6122B"],
  })
  @IsString()
  @IsNotEmpty()
  @Validate(IsDiveCode)
  diveCode: string;

  @ApiProperty({
    description: "Array of judge scores (5 or 7 judges)",
    example: [7.0, 7.5, 8.0, 7.5, 8.5],
    type: [Number],
    minItems: 5,
    maxItems: 7,
    minimum: 0,
    maximum: 10,
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(7)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(10, { each: true })
  judgeScores: number[];
}

export class ScoreResultDto {
  @ApiProperty({ description: "FINA dive code", example: "103B" })
  diveCode: string;

  @ApiProperty({ description: "Degree of difficulty", example: 1.7 })
  difficulty: number;

  @ApiProperty({
    description: "Original judge scores",
    example: [7.0, 7.5, 8.0, 7.5, 8.5],
  })
  judgeScores: number[];

  @ApiProperty({
    description: "Scores dropped per FINA rules",
    example: [7.0, 8.5],
  })
  droppedScores: number[];

  @ApiProperty({
    description: "Scores used in calculation",
    example: [7.5, 8.0, 7.5],
  })
  effectiveScores: number[];

  @ApiProperty({ description: "Sum of effective scores", example: 23.0 })
  rawScore: number;

  @ApiProperty({
    description: "Final score (rawScore × difficulty)",
    example: 39.1,
  })
  finalScore: number;
}

export class TotalScoreResultDto {
  @ApiProperty({
    description: "Array of individual dive results",
    type: [ScoreResultDto],
  })
  dives: ScoreResultDto[];

  @ApiProperty({ description: "Total competition score", example: 125.6 })
  totalScore: number;

  @ApiProperty({ description: "Number of dives", example: 5 })
  numDives: number;
}
