import { Injectable, BadRequestException } from "@nestjs/common";
import {
  ScoreResultDto,
  TotalScoreResultDto,
  CalculateScoreDto,
} from "./dto/calculate-score.dto";
import {
  IsDiveCode,
  parseDiveCode,
} from "../../common/validators/dive-code.validator";
import {
  FINA_DD_TABLE,
  DivingHeight,
  getDifficultyForHeight,
  isDiveValidForHeight,
  getApparatusType,
} from "../../common/constants/fina-dive-table";

/**
 * Service for calculating diving scores according to FINA rules
 *
 * FINA Scoring Rules:
 * - 5 judges: Drop highest and lowest, sum remaining 3 scores × difficulty
 * - 7 judges: Drop 2 highest and 2 lowest, sum remaining 3 scores × difficulty
 * 
 * Degree of Difficulty (DD) varies by diving height:
 * - 1m Springboard
 * - 3m Springboard
 * - 5m, 7.5m, 10m Platform
 */
@Injectable()
export class ScoresService {
  private readonly diveCodeValidator = new IsDiveCode();

  /**
   * Calculates the score for a single dive using FINA rules
   * @param diveCode - Valid FINA dive code (e.g., "103B", "5132D")
   * @param height - Diving height (1m, 3m, 5m, 7.5m, 10m)
   * @param judgeScores - Array of 5 or 7 judge scores (0-10)
   * @returns ScoreResultDto with calculated scores
   */
  calculateScore(diveCode: string, height: DivingHeight, judgeScores: number[]): ScoreResultDto {
    const upperCode = diveCode.toUpperCase();

    // Validate dive code
    if (!this.diveCodeValidator.validate(diveCode)) {
      throw new BadRequestException(
        `Invalid FINA dive code: ${diveCode}. ` +
          "Groups 1-4: [Group][Flying][Half-Somersaults][Position], " +
          "Group 5: [5][Direction][Half-Somersaults][Half-Twists][Position], " +
          "Group 6: [6][Direction][Half-Somersaults][Half-Twists]?[Position]"
      );
    }

    // Validate that the dive can be performed at this height
    if (!isDiveValidForHeight(upperCode, height)) {
      const apparatusType = getApparatusType(height);
      const parsed = parseDiveCode(diveCode);
      
      // Armstand dives (Group 6) can only be performed from platform
      if (parsed.group === 6 && apparatusType === 'springboard') {
        throw new BadRequestException(
          `Armstand dives (Group 6) cannot be performed from springboard. ` +
          `Dive ${upperCode} is only available from platform (5m, 7.5m, 10m).`
        );
      }

      throw new BadRequestException(
        `Dive ${upperCode} is not available at ${height}. ` +
        `This dive may require a different height or may not exist in the FINA DD table.`
      );
    }

    // Validate judge count (must be 5 or 7)
    if (judgeScores.length !== 5 && judgeScores.length !== 7) {
      throw new BadRequestException("Must have exactly 5 or 7 judges");
    }

    // Validate score range
    for (const score of judgeScores) {
      if (score < 0 || score > 10) {
        throw new BadRequestException(
          "Each judge score must be between 0 and 10"
        );
      }
    }

    // Get difficulty (degree of difficulty) for this height
    const difficulty = this.getDifficulty(upperCode, height);

    // Sort scores to find dropped scores
    const sortedScores = [...judgeScores].sort((a, b) => a - b);

    let droppedScores: number[];
    let effectiveScores: number[];

    if (judgeScores.length === 5) {
      // 5 judges: drop 1 highest, 1 lowest
      droppedScores = [sortedScores[0], sortedScores[4]];
      effectiveScores = sortedScores.slice(1, 4);
    } else {
      // 7 judges: drop 2 highest, 2 lowest
      droppedScores = [
        sortedScores[0],
        sortedScores[1],
        sortedScores[5],
        sortedScores[6],
      ];
      effectiveScores = sortedScores.slice(2, 5);
    }

    // Calculate raw score (sum of effective scores)
    const rawScore = effectiveScores.reduce((sum, score) => sum + score, 0);

    // Calculate final score (raw score × difficulty)
    const finalScore = Math.round(rawScore * difficulty * 10) / 10;

    return {
      diveCode: upperCode,
      height,
      difficulty,
      judgeScores,
      droppedScores,
      effectiveScores,
      rawScore,
      finalScore,
    };
  }

  /**
   * Calculates total score across multiple dives
   * @param dives - Array of dive calculations to perform
   * @returns TotalScoreResultDto with individual and total scores
   */
  calculateTotalScore(dives: CalculateScoreDto[]): TotalScoreResultDto {
    const results = dives.map((dive) =>
      this.calculateScore(dive.diveCode, dive.height, dive.judgeScores)
    );

    const totalScore = results.reduce(
      (sum, result) => sum + result.finalScore,
      0
    );

    return {
      dives: results,
      totalScore: Math.round(totalScore * 10) / 10,
      numDives: results.length,
    };
  }

  /**
   * Gets the difficulty (degree of difficulty) for a dive code at a specific height
   * Falls back to a calculated difficulty if not in the table
   * @param diveCode - Valid FINA dive code (uppercase)
   * @param height - Diving height
   * @returns Difficulty value
   */
  private getDifficulty(diveCode: string, height: DivingHeight): number {
    // Try to get the DD from the official FINA table
    const tableDifficulty = getDifficultyForHeight(diveCode, height);
    
    if (tableDifficulty !== null) {
      return tableDifficulty;
    }

    // Calculate an estimated difficulty based on the dive components
    // This is a fallback for dives not in the table
    const parsed = parseDiveCode(diveCode);

    // Base difficulty calculation
    let baseDifficulty = 1.0;

    // Add difficulty for somersaults
    baseDifficulty += parsed.halfSomersaults * 0.3;

    // Add difficulty for twists
    if (parsed.halfTwists) {
      baseDifficulty += parsed.halfTwists * 0.2;
    }

    // Add difficulty for specific groups
    if (parsed.group === 3 || parsed.group === 4) {
      // Reverse and Inward are harder
      baseDifficulty += 0.2;
    } else if (parsed.group === 6) {
      // Armstand is hardest
      baseDifficulty += 0.4;
    }

    // Position adjustments
    if (parsed.position === "A") {
      // Straight is hardest
      baseDifficulty += 0.3;
    } else if (parsed.position === "B") {
      // Pike is moderate
      baseDifficulty += 0.1;
    }

    // Flying action adds difficulty
    if (parsed.group >= 1 && parsed.group <= 4 && parsed.secondDigit === 1) {
      baseDifficulty += 0.3;
    }

    // Height adjustment - higher heights reduce difficulty slightly for same dive
    // (more time to complete the dive)
    const heightReduction: Record<DivingHeight, number> = {
      '1m': 0,
      '3m': 0,
      '5m': 0.1,
      '7.5m': 0.15,
      '10m': 0.2
    };
    baseDifficulty -= heightReduction[height];

    return Math.round(Math.max(baseDifficulty, 1.0) * 10) / 10;
  }
}
