/**
 * Scoring utility functions for diving score calculations
 * @see specs/002-ui-overhaul/research.md Section 4
 */

import { ExtendedDiveResult, ScoreBreakdown, CumulativeEntry, MIN_JUDGE_COUNT } from './types';

/**
 * Calculate effective sum by dropping highest/lowest scores per FINA rules
 * - 5 judges: Drop 1 highest and 1 lowest, sum middle 3
 * - 7 judges: Drop 2 highest and 2 lowest, sum middle 5
 * 
 * @param judgeScores Array of judge scores (5 or 7 elements)
 * @returns Object with sum and indices of dropped scores
 */
export function calculateEffectiveSum(judgeScores: number[]): { 
  sum: number; 
  droppedIndices: number[];
  effectiveScores: number[];
  isValid: boolean;
} {
  // Handle edge case: less than 5 judges (invalid data)
  if (judgeScores.length < MIN_JUDGE_COUNT) {
    return {
      sum: judgeScores.reduce((a, b) => a + b, 0),
      droppedIndices: [],
      effectiveScores: judgeScores,
      isValid: false,
    };
  }

  // Create array with score and original index
  const sorted = judgeScores
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => a.score - b.score);
  
  // Determine how many to drop from each end
  // 7 judges: drop 2 from each end (keep middle 5)
  // 5 judges: drop 1 from each end (keep middle 3)
  const dropCount = judgeScores.length === 7 ? 2 : 1;
  
  // Get indices of dropped scores (lowest and highest)
  const droppedIndices = [
    ...sorted.slice(0, dropCount).map(s => s.idx),           // lowest scores
    ...sorted.slice(-dropCount).map(s => s.idx),             // highest scores
  ];
  
  // Calculate effective scores (not dropped)
  const effectiveScores = judgeScores.filter((_, idx) => !droppedIndices.includes(idx));
  const sum = effectiveScores.reduce((a, b) => a + b, 0);
  
  return {
    sum,
    droppedIndices,
    effectiveScores,
    isValid: true,
  };
}

/**
 * Get indices of dropped scores for a given set of judge scores
 * Convenience wrapper around calculateEffectiveSum
 * 
 * @param judgeScores Array of judge scores
 * @returns Array of indices that were dropped
 */
export function getDroppedIndices(judgeScores: number[]): number[] {
  return calculateEffectiveSum(judgeScores).droppedIndices;
}

/**
 * Calculate full score breakdown for a dive
 * 
 * @param judgeScores Array of judge scores
 * @param difficulty Degree of difficulty (DD)
 * @returns Complete score breakdown
 */
export function calculateScoreBreakdown(
  judgeScores: number[],
  difficulty: number
): ScoreBreakdown {
  const { sum, droppedIndices, effectiveScores } = calculateEffectiveSum(judgeScores);
  const finalScore = sum * difficulty;
  
  return {
    rawScores: judgeScores,
    droppedIndices,
    effectiveScores,
    effectiveSum: sum,
    difficulty,
    finalScore: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Calculate cumulative scores for a sequence of dives
 * 
 * @param dives Array of dive results (must have finalScore)
 * @returns Array of cumulative entries matching dive order
 */
export function calculateCumulativeScores(
  dives: { judgeScores?: number[]; difficulty: number; finalScore: number }[]
): { score: number; cumulative: number }[] {
  let total = 0;
  return dives.map(dive => {
    total += dive.finalScore;
    return {
      score: dive.finalScore,
      cumulative: Math.round(total * 100) / 100,
    };
  });
}

/**
 * Enrich dive results with calculated scoring details
 * Adds effectiveSum, droppedJudgeIndices, and cumulativeScore
 * 
 * @param dives Array of dive results
 * @returns Enriched dive results with scoring details
 */
export function enrichDivesWithScoring(
  dives: ExtendedDiveResult[]
): ExtendedDiveResult[] {
  // Sort dives by round number to ensure correct cumulative calculation
  const sortedDives = [...dives].sort((a, b) => a.roundNumber - b.roundNumber);
  
  let cumulativeTotal = 0;
  
  return sortedDives.map(dive => {
    // Calculate effective sum if judge scores exist
    let effectiveSum: number | undefined;
    let droppedJudgeIndices: number[] | undefined;
    
    if (dive.judgeScores && dive.judgeScores.length >= MIN_JUDGE_COUNT) {
      const result = calculateEffectiveSum(dive.judgeScores);
      effectiveSum = result.sum;
      droppedJudgeIndices = result.droppedIndices;
    }
    
    // Calculate cumulative score
    cumulativeTotal += dive.finalScore;
    const cumulativeScore = Math.round(cumulativeTotal * 100) / 100;
    
    return {
      ...dive,
      effectiveSum,
      droppedJudgeIndices,
      cumulativeScore,
    };
  });
}

/**
 * Get cumulative entries for charting athlete progression
 * 
 * @param dives Array of enriched dive results
 * @returns Array of cumulative entries
 */
export function getCumulativeEntries(
  dives: ExtendedDiveResult[]
): CumulativeEntry[] {
  const enrichedDives = enrichDivesWithScoring(dives);
  
  return enrichedDives.map(dive => ({
    roundNumber: dive.roundNumber,
    diveScore: dive.finalScore,
    cumulativeScore: dive.cumulativeScore ?? 0,
  }));
}

/**
 * Check if a dive has valid judge scores for calculations
 * 
 * @param dive Dive result to check
 * @returns true if dive has valid judge scores (5 or 7)
 */
export function hasValidJudgeScores(dive: Pick<ExtendedDiveResult, 'judgeScores'>): boolean {
  return (
    dive.judgeScores !== undefined &&
    dive.judgeScores.length >= MIN_JUDGE_COUNT &&
    dive.judgeScores.length <= 7
  );
}

/**
 * Get the judge count type for a dive
 * 
 * @param dive Dive result
 * @returns 5 or 7 based on judge count, defaults to 5
 */
export function getJudgeCount(dive: Pick<ExtendedDiveResult, 'judgeScores'>): 5 | 7 {
  if (dive.judgeScores && dive.judgeScores.length === 7) {
    return 7;
  }
  return 5;
}

/**
 * Check if a specific judge index is a dropped score
 * 
 * @param judgeIndex 0-based index of the judge
 * @param droppedIndices Array of dropped score indices
 * @returns true if this judge's score was dropped
 */
export function isDroppedScore(
  judgeIndex: number,
  droppedIndices: number[] | undefined
): boolean {
  return droppedIndices?.includes(judgeIndex) ?? false;
}

/**
 * Format score for display with proper decimal places
 * 
 * @param score Numeric score
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted score string
 */
export function formatScore(score: number, decimals = 2): string {
  return score.toFixed(decimals);
}

/**
 * Format the score breakdown for tooltip/display
 * Shows: Sum × DD = Final Score
 * 
 * @param breakdown Score breakdown object
 * @returns Formatted string like "20.0 × 2.3 = 46.00"
 */
export function formatScoreBreakdown(breakdown: ScoreBreakdown): string {
  return `${formatScore(breakdown.effectiveSum, 1)} × ${formatScore(breakdown.difficulty, 1)} = ${formatScore(breakdown.finalScore)}`;
}

/**
 * Validate a judge score
 * 
 * @param score Score to validate
 * @returns true if valid (0-10 in 0.5 increments)
 */
export function isValidJudgeScore(score: number): boolean {
  return score >= 0 && score <= 10 && score % 0.5 === 0;
}

/**
 * Validate a difficulty value
 * 
 * @param difficulty DD to validate
 * @returns true if valid (1.0-4.5 in 0.1 increments)
 */
export function isValidDifficulty(difficulty: number): boolean {
  const rounded = Math.round(difficulty * 10) / 10;
  return difficulty >= 1.0 && difficulty <= 4.5 && rounded === difficulty;
}

/**
 * Calculate statistics for judge consistency analysis
 * 
 * @param judgeScores Array of scores from one judge across multiple dives
 * @returns Object with mean, std, min, max
 */
export function calculateJudgeStats(judgeScores: number[]): {
  mean: number;
  std: number;
  min: number;
  max: number;
} {
  if (judgeScores.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0 };
  }
  
  const mean = judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length;
  const squaredDiffs = judgeScores.map(score => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / judgeScores.length;
  const std = Math.sqrt(variance);
  
  return {
    mean: Math.round(mean * 100) / 100,
    std: Math.round(std * 100) / 100,
    min: Math.min(...judgeScores),
    max: Math.max(...judgeScores),
  };
}
