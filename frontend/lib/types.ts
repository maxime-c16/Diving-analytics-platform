/**
 * Extended type definitions for UI Overhaul feature
 * @see specs/002-ui-overhaul/data-model.md
 */

import { DiveResult, AthleteResult, RoundData } from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Extended Entity Types
// ─────────────────────────────────────────────────────────────────────────────

/** Extended DiveResult with scoring details and penalty information */
export interface ExtendedDiveResult extends DiveResult {
  // Scoring details
  effectiveSum?: number;         // Sum after dropping highest/lowest
  droppedJudgeIndices?: number[]; // Indices of dropped scores (0-based)
  cumulativeScore?: number;      // Running total up to this dive
  
  // Penalty information
  penaltyCode?: string;          // e.g., "BALK", "FAILED", "0"
  penaltyDeduction?: number;     // Points deducted
  penaltyDescription?: string;   // Human-readable description
}

/** Extended AthleteResult with cumulative tracking */
export interface ExtendedAthleteResult extends Omit<AthleteResult, 'dives'> {
  dives: ExtendedDiveResult[];
  
  // Cumulative tracking
  cumulativeScores?: number[];   // Array matching dives, showing running total
  bestDiveIndex?: number;        // Index of highest-scoring dive
  worstDiveIndex?: number;       // Index of lowest-scoring dive
}

/** Extended RoundData with additional statistics */
export interface ExtendedRoundData extends RoundData {
  lowestScore: number;
  medianScore: number;
  stdDeviation: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Types
// ─────────────────────────────────────────────────────────────────────────────

/** Score calculation result */
export interface ScoreBreakdown {
  rawScores: number[];           // Original judge scores
  droppedIndices: number[];      // Indices of dropped scores
  effectiveScores: number[];     // Remaining scores after drops
  effectiveSum: number;          // Sum of effective scores
  difficulty: number;
  finalScore: number;            // effectiveSum × difficulty
}

/** Cumulative score entry */
export interface CumulativeEntry {
  roundNumber: number;
  diveScore: number;
  cumulativeScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart Data Types
// ─────────────────────────────────────────────────────────────────────────────

/** Athlete progression data (for line chart) */
export interface AthleteProgressionData {
  round: number;
  [athleteKey: string]: number;  // Dynamic keys: athlete_1, athlete_2, etc.
}

/** Judge consistency data */
export interface JudgeConsistencyData {
  judge: string;                 // "J1", "J2", etc.
  judgeIndex: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  diveCount: number;
}

/** Score distribution data (histogram bins) */
export interface ScoreDistributionBin {
  range: string;                 // "0-10", "10-20", etc.
  rangeMin: number;
  rangeMax: number;
  count: number;
  percentage: number;
}

/** Difficulty vs Score scatter point */
export interface DifficultyScorePoint {
  difficulty: number;
  finalScore: number;
  athleteName: string;
  diveCode: string;
  roundNumber: number;
}

/** Round comparison radar data */
export interface RoundComparisonData {
  metric: string;                // "Average", "Highest", "Consistency", etc.
  [roundKey: string]: string | number;    // r1, r2, r3, etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD Operation Types
// ─────────────────────────────────────────────────────────────────────────────

/** Update dive request */
export interface UpdateDiveRequest {
  athleteName?: string;
  diveCode?: string;
  roundNumber?: number;
  judgeScores?: number[];
  difficulty?: number;
  finalScore?: number;
  penaltyCode?: string;
}

/** Delete response */
export interface DeleteResponse {
  success: boolean;
  message: string;
  deletedId: number;
}

/** Edit modal state */
export interface EditDiveModalState {
  isOpen: boolean;
  dive: ExtendedDiveResult | null;
  isSaving: boolean;
  errors: Record<string, string>;
}

/** Delete dialog state */
export interface DeleteDialogState {
  isOpen: boolean;
  itemType: 'dive' | 'competition';
  itemId: number | null;
  itemName: string;
  isDeleting: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props Types
// ─────────────────────────────────────────────────────────────────────────────

/** DiveBreakdownCard props */
export interface DiveBreakdownCardProps {
  athlete: ExtendedAthleteResult;
  judgeCount: 5 | 7;
  showCumulative: boolean;
  showDroppedScores: boolean;
  onEditDive?: (dive: ExtendedDiveResult) => void;
  onDeleteDive?: (diveId: number) => void;
  className?: string;
}

/** JudgeScoreCell props */
export interface JudgeScoreCellProps {
  score: number;
  isDropped: boolean;
  judgeIndex: number;
  isInvalid?: boolean;  // For < 5 judges edge case
  onEdit?: (newScore: number) => void;
}

/** PenaltyIndicator props */
export interface PenaltyIndicatorProps {
  code: string;
  deduction?: number;
  description?: string;
  size?: 'sm' | 'md';
}

/** EditDiveModal props */
export interface EditDiveModalProps {
  isOpen: boolean;
  dive: ExtendedDiveResult | null;
  judgeCount: 5 | 7;
  onSave: (updates: UpdateDiveRequest) => Promise<void>;
  onClose: () => void;
}

/** DeleteConfirmDialog props */
export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart Component Props
// ─────────────────────────────────────────────────────────────────────────────

/** AthleteProgressionChart props */
export interface AthleteProgressionChartProps {
  athletes: ExtendedAthleteResult[];
  selectedAthleteIds?: number[];
  height?: number;
}

/** JudgeConsistencyChart props */
export interface JudgeConsistencyChartProps {
  dives: ExtendedDiveResult[];
  judgeCount: 5 | 7;
  height?: number;
}

/** ScoreDistributionChart props */
export interface ScoreDistributionChartProps {
  scores: number[];
  binSize?: number;
  height?: number;
}

/** DifficultyScoreScatter props */
export interface DifficultyScoreScatterProps {
  athletes: ExtendedAthleteResult[];
  height?: number;
  showTrendLine?: boolean;
}

/** RoundComparisonRadar props */
export interface RoundComparisonRadarProps {
  rounds: ExtendedRoundData[];
  metrics?: ('average' | 'highest' | 'lowest' | 'consistency')[];
  height?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// State Management Types
// ─────────────────────────────────────────────────────────────────────────────

/** Competition page extended state */
export interface CompetitionPageState {
  // UI state
  viewMode: 'list' | 'grid';           // Athlete breakdown view mode
  showDroppedScores: boolean;          // Toggle for dropped score visibility
  showCumulativeScores: boolean;       // Toggle for cumulative column
  
  // Edit state
  editModalState: EditDiveModalState;
  deleteDialogState: DeleteDialogState;
  
  // Chart state
  selectedAthletesForChart: number[];  // For multi-athlete comparison charts
  chartTimeRange: 'all' | 'last5' | 'last10';
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Rules
// ─────────────────────────────────────────────────────────────────────────────

export const VALIDATION_RULES = {
  diveCode: {
    pattern: /^[1-6]\d{2,3}[A-D]$/i,
    message: 'Dive code must be 3-4 digits (1-6xxx) followed by A, B, C, or D'
  },
  judgeScore: {
    min: 0,
    max: 10,
    step: 0.5,
    message: 'Judge score must be 0-10 in 0.5 increments'
  },
  difficulty: {
    min: 1.0,
    max: 4.5,
    step: 0.1,
    message: 'Difficulty must be 1.0-4.5 in 0.1 increments'
  },
  finalScore: {
    min: 0,
    max: 200,
    message: 'Final score must be 0-200'
  },
  roundNumber: {
    min: 1,
    max: 10,
    message: 'Round number must be 1-10'
  }
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Chart color palette */
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
] as const;

/** Minimum valid judge count */
export const MIN_JUDGE_COUNT = 5;

/** Maximum valid judge count */
export const MAX_JUDGE_COUNT = 7;
