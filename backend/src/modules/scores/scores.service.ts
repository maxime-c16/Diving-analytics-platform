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

/**
 * Service for calculating diving scores according to FINA rules
 *
 * FINA Scoring Rules:
 * - 5 judges: Drop highest and lowest, sum remaining 3 scores × difficulty
 * - 7 judges: Drop 2 highest and 2 lowest, sum remaining 3 scores × difficulty
 */
@Injectable()
export class ScoresService {
  private readonly diveCodeValidator = new IsDiveCode();

  /**
   * Difficulty table for common dives (degree of difficulty)
   * In a real implementation, this would be a comprehensive lookup table
   * from the official FINA difficulty table
   */
  private readonly difficultyTable: Record<string, number> = {
    // Forward dives
    "101A": 1.4,
    "101B": 1.3,
    "101C": 1.2,
    "102A": 1.6,
    "102B": 1.5,
    "102C": 1.4,
    "103A": 2.0,
    "103B": 1.7,
    "103C": 1.6,
    "104A": 2.6,
    "104B": 2.3,
    "104C": 2.2,
    "105A": 3.2,
    "105B": 2.6,
    "105C": 2.4,
    "106B": 3.2,
    "106C": 2.9,
    "107B": 3.4,
    "107C": 3.1,
    // Forward flying dives
    "113A": 2.1,
    "113B": 1.8,
    "113C": 1.7,
    "114A": 2.7,
    "114B": 2.4,
    "114C": 2.3,
    "115B": 3.0,
    "115C": 2.8,
    // Back dives
    "201A": 1.7,
    "201B": 1.6,
    "201C": 1.5,
    "202A": 1.7,
    "202B": 1.5,
    "202C": 1.5,
    "203A": 2.3,
    "203B": 2.0,
    "203C": 1.9,
    "204A": 2.6,
    "204B": 2.4,
    "204C": 2.2,
    "205A": 3.2,
    "205B": 2.9,
    "205C": 2.7,
    // Reverse dives
    "301A": 1.8,
    "301B": 1.7,
    "301C": 1.6,
    "302A": 1.8,
    "302B": 1.6,
    "302C": 1.6,
    "303A": 2.4,
    "303B": 2.1,
    "303C": 2.0,
    "304A": 2.6,
    "304B": 2.4,
    "304C": 2.3,
    "305A": 3.2,
    "305B": 2.9,
    "305C": 2.8,
    // Inward dives
    "401A": 1.5,
    "401B": 1.4,
    "401C": 1.3,
    "402A": 1.7,
    "402B": 1.5,
    "402C": 1.4,
    "403A": 2.4,
    "403B": 2.2,
    "403C": 2.1,
    "404A": 3.0,
    "404B": 2.8,
    "404C": 2.6,
    "405A": 3.4,
    "405B": 3.0,
    "405C": 2.9,
    // Twisting dives (forward direction)
    "5111A": 1.8,
    "5111B": 1.6,
    "5111D": 1.4,
    "5112A": 2.0,
    "5112B": 1.8,
    "5112D": 1.6,
    "5121D": 1.7,
    "5122D": 1.9,
    "5124D": 2.3,
    "5126D": 2.9,
    "5131D": 2.0,
    "5132D": 2.2,
    "5134D": 2.6,
    "5136D": 3.2,
    "5152B": 3.0,
    "5152D": 2.8,
    "5154B": 3.4,
    "5154D": 3.2,
    "5156B": 3.6,
    "5156D": 3.5,
    // Twisting dives (back direction)
    "5211A": 1.8,
    "5211B": 1.6,
    "5211D": 1.4,
    "5212A": 2.0,
    "5212B": 1.8,
    "5212D": 1.6,
    "5221D": 1.7,
    "5222D": 1.9,
    "5223D": 2.3,
    "5225D": 2.9,
    "5231D": 2.0,
    "5233D": 2.4,
    "5235D": 3.0,
    "5251B": 2.8,
    "5251D": 2.6,
    "5253B": 3.2,
    "5253D": 3.0,
    "5255B": 3.6,
    "5255D": 3.4,
    // Twisting dives (reverse direction)
    "5311A": 1.9,
    "5311B": 1.7,
    "5311D": 1.5,
    "5312A": 2.1,
    "5312B": 1.9,
    "5312D": 1.7,
    "5321D": 1.8,
    "5322D": 2.0,
    "5331D": 2.1,
    "5333D": 2.5,
    "5335D": 3.1,
    "5351B": 2.9,
    "5351D": 2.7,
    "5353B": 3.3,
    "5353D": 3.1,
    // Twisting dives (inward direction)
    "5411A": 2.0,
    "5411B": 1.8,
    "5411D": 1.6,
    "5412A": 2.2,
    "5412B": 2.0,
    "5412D": 1.8,
    "5421D": 1.9,
    "5422D": 2.1,
    "5431D": 2.4,
    "5432D": 2.6,
    // Armstand dives (forward direction)
    "612A": 2.4,
    "612B": 2.0,
    "612C": 1.8,
    "614A": 3.2,
    "614B": 2.8,
    "614C": 2.6,
    "6122B": 2.3,
    "6122D": 2.1,
    "6124B": 2.7,
    "6124D": 2.5,
    // Armstand dives (back direction)
    "622A": 2.0,
    "622B": 1.8,
    "622C": 1.7,
    "624B": 3.0,
    "624C": 2.8,
    "6222B": 2.0,
    "6222D": 1.9,
    "6224B": 2.4,
    "6224D": 2.3,
    // Armstand dives (reverse direction)
    "632A": 2.4,
    "632B": 2.1,
    "632C": 2.0,
    "634B": 3.2,
    "634C": 3.0,
    "6322B": 2.3,
    "6322D": 2.2,
    // Armstand dives (inward direction)
    "642A": 2.8,
    "642B": 2.6,
    "642C": 2.4,
    "6243D": 3.5,
  };

  /**
   * Calculates the score for a single dive using FINA rules
   * @param diveCode - Valid FINA dive code (e.g., "103B", "5132D")
   * @param judgeScores - Array of 5 or 7 judge scores (0-10)
   * @returns ScoreResultDto with calculated scores
   */
  calculateScore(diveCode: string, judgeScores: number[]): ScoreResultDto {
    // Validate dive code
    if (!this.diveCodeValidator.validate(diveCode)) {
      throw new BadRequestException(
        `Invalid FINA dive code: ${diveCode}. ` +
          "Groups 1-4: [Group][Flying][Half-Somersaults][Position], " +
          "Group 5: [5][Direction][Half-Somersaults][Half-Twists][Position], " +
          "Group 6: [6][Direction][Half-Somersaults][Half-Twists]?[Position]"
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

    // Get difficulty (degree of difficulty)
    const difficulty = this.getDifficulty(diveCode);

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
      diveCode,
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
      this.calculateScore(dive.diveCode, dive.judgeScores)
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
   * Gets the difficulty (degree of difficulty) for a dive code
   * Falls back to a calculated difficulty if not in the table
   * @param diveCode - Valid FINA dive code
   * @returns Difficulty value
   */
  private getDifficulty(diveCode: string): number {
    const upperCode = diveCode.toUpperCase();

    // Check if we have the exact code in the table
    if (this.difficultyTable[upperCode]) {
      return this.difficultyTable[upperCode];
    }

    // Calculate an estimated difficulty based on the dive components
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

    return Math.round(baseDifficulty * 10) / 10;
  }
}
