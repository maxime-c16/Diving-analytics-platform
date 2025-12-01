# Data Model Extensions: UI Overhaul

**Created**: 2025-12-01  
**Status**: Complete

## Overview

This document describes data model extensions required for the UI overhaul feature, building on the existing data model from `specs/001-diving-analytics-mvp/data-model.md`.

---

## 1. Extended Frontend Types

### DiveResult (Extended)

```typescript
interface DiveResult {
  // Existing fields
  id: number;
  roundNumber: number;
  diveCode: string;
  difficulty: number;
  judgeScores?: number[];
  finalScore: number;
  rank?: number;
  eventName?: string;
  
  // NEW: Scoring details
  effectiveSum?: number;         // Sum after dropping highest/lowest
  droppedJudgeIndices?: number[]; // Indices of dropped scores (0-based)
  cumulativeScore?: number;      // Running total up to this dive
  
  // NEW: Penalty information
  penaltyCode?: string;          // e.g., "BALK", "FAILED", "0"
  penaltyDeduction?: number;     // Points deducted
  penaltyDescription?: string;   // Human-readable description
}
```

### AthleteResult (Extended)

```typescript
interface AthleteResult {
  // Existing fields
  rank: number;
  athlete: {
    id: number;
    name: string;
    country?: string;
  };
  totalScore: number;
  averageScore: number;
  diveCount: number;
  dives: DiveResult[];
  
  // NEW: Cumulative tracking
  cumulativeScores?: number[];   // Array matching dives, showing running total
  bestDiveIndex?: number;        // Index of highest-scoring dive
  worstDiveIndex?: number;       // Index of lowest-scoring dive
}
```

### RoundData (Extended)

```typescript
interface RoundData {
  // Existing fields
  roundNumber: number;
  diveCount: number;
  averageScore: number;
  highestScore: number;
  dives: RoundDive[];
  
  // NEW: Additional stats
  lowestScore: number;
  medianScore: number;
  stdDeviation: number;
}

interface RoundDive {
  // Existing fields
  id: number;
  athleteName: string;
  athleteCountry?: string;
  diveCode: string;
  difficulty: number;
  judgeScores?: number[];
  finalScore: number;
  rank?: number;
  eventName?: string;
  
  // NEW: Extended data
  effectiveSum?: number;
  droppedJudgeIndices?: number[];
  cumulativeScore?: number;      // Athlete's cumulative at this point
  penaltyCode?: string;
}
```

---

## 2. New Frontend Types

### Scoring Utilities

```typescript
// Score calculation result
interface ScoreBreakdown {
  rawScores: number[];           // Original judge scores
  droppedIndices: number[];      // Indices of dropped scores
  effectiveScores: number[];     // Remaining scores
  effectiveSum: number;          // Sum of effective scores
  difficulty: number;
  finalScore: number;            // effectiveSum × difficulty
}

// Cumulative score entry
interface CumulativeEntry {
  roundNumber: number;
  diveScore: number;
  cumulativeScore: number;
}
```

### Chart Data Types

```typescript
// Athlete progression data (for line chart)
interface AthleteProgressionData {
  round: number;
  [athleteKey: string]: number;  // Dynamic keys: athlete_1, athlete_2, etc.
}

// Judge consistency data
interface JudgeConsistencyData {
  judge: string;                 // "J1", "J2", etc.
  mean: number;
  std: number;
  min: number;
  max: number;
  diveCount: number;
}

// Score distribution data (histogram bins)
interface ScoreDistributionBin {
  range: string;                 // "0-10", "10-20", etc.
  rangeMin: number;
  rangeMax: number;
  count: number;
  percentage: number;
}

// Difficulty vs Score scatter point
interface DifficultyScorePoint {
  difficulty: number;
  finalScore: number;
  athleteName: string;
  diveCode: string;
  roundNumber: number;
}

// Round comparison radar data
interface RoundComparisonData {
  metric: string;                // "Average", "Highest", "Consistency", etc.
  [roundKey: string]: number;    // r1, r2, r3, etc.
}
```

### CRUD Operation Types

```typescript
// Update dive request
interface UpdateDiveRequest {
  athleteName?: string;
  diveCode?: string;
  roundNumber?: number;
  judgeScores?: number[];
  difficulty?: number;
  finalScore?: number;
  penaltyCode?: string;
}

// Delete response
interface DeleteResponse {
  success: boolean;
  message: string;
  deletedId: number;
}

// Edit modal state
interface EditDiveModalState {
  isOpen: boolean;
  dive: DiveResult | null;
  isSaving: boolean;
  errors: Record<string, string>;
}
```

---

## 3. Component Props Types

### DiveBreakdownCard

```typescript
interface DiveBreakdownCardProps {
  athlete: AthleteResult;
  judgeCount: 5 | 7;
  showCumulative: boolean;
  showDroppedScores: boolean;
  onEditDive?: (dive: DiveResult) => void;
  onDeleteDive?: (diveId: number) => void;
  className?: string;
}
```

### JudgeScoreCell

```typescript
interface JudgeScoreCellProps {
  score: number;
  isDropped: boolean;
  judgeIndex: number;
  onEdit?: (newScore: number) => void;
}
```

### PenaltyIndicator

```typescript
interface PenaltyIndicatorProps {
  code: string;
  deduction?: number;
  description?: string;
  size?: 'sm' | 'md';
}
```

### EditDiveModal

```typescript
interface EditDiveModalProps {
  isOpen: boolean;
  dive: DiveResult | null;
  judgeCount: 5 | 7;
  onSave: (updates: UpdateDiveRequest) => Promise<void>;
  onClose: () => void;
}
```

### DeleteConfirmDialog

```typescript
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}
```

---

## 4. Chart Component Props

### AthleteProgressionChart

```typescript
interface AthleteProgressionChartProps {
  athletes: AthleteResult[];
  selectedAthleteIds?: number[];
  height?: number;
}
```

### JudgeConsistencyChart

```typescript
interface JudgeConsistencyChartProps {
  dives: DiveResult[];
  judgeCount: 5 | 7;
  height?: number;
}
```

### ScoreDistributionChart

```typescript
interface ScoreDistributionChartProps {
  scores: number[];
  binSize?: number;
  height?: number;
}
```

### DifficultyScoreScatter

```typescript
interface DifficultyScoreScatterProps {
  athletes: AthleteResult[];
  height?: number;
  showTrendLine?: boolean;
}
```

### RoundComparisonRadar

```typescript
interface RoundComparisonRadarProps {
  rounds: RoundData[];
  metrics?: ('average' | 'highest' | 'lowest' | 'consistency')[];
  height?: number;
}
```

---

## 5. API Extension Types

### Extended API Client Methods

```typescript
// In api.ts ApiClient class
class ApiClient {
  // ... existing methods
  
  // NEW: Delete dive
  async deleteDive(diveId: number): Promise<DeleteResponse>;
  
  // NEW: Delete competition (cascade deletes dives)
  async deleteCompetition(competitionId: number): Promise<DeleteResponse>;
  
  // NEW: Update athlete
  async updateAthlete(athleteId: number, updates: {
    name?: string;
    country?: string;
  }): Promise<{ success: boolean; message: string }>;
  
  // NEW: Get judge statistics for a competition
  async getJudgeStats(competitionId: string): Promise<JudgeConsistencyData[]>;
}
```

---

## 6. State Management Types

### Competition Page State (Extended)

```typescript
interface CompetitionPageState {
  // Existing
  log: IngestionLog | null;
  competitionData: CompetitionData | null;
  errors: RowError[];
  loading: boolean;
  retrying: boolean;
  expandedAthlete: number | null;
  activeTab: 'standings' | 'rounds' | 'charts' | 'details';
  selectedEvent: string;
  
  // NEW: UI state
  viewMode: 'list' | 'grid';           // Athlete breakdown view mode
  showDroppedScores: boolean;          // Toggle for dropped score visibility
  showCumulativeScores: boolean;       // Toggle for cumulative column
  
  // NEW: Edit state
  editModalState: EditDiveModalState;
  deleteDialogState: {
    isOpen: boolean;
    itemType: 'dive' | 'competition';
    itemId: number | null;
    itemName: string;
    isDeleting: boolean;
  };
  
  // NEW: Chart state
  selectedAthletesForChart: number[];  // For multi-athlete comparison charts
  chartTimeRange: 'all' | 'last5' | 'last10';
}
```

---

## 7. Validation Rules (Client-Side)

```typescript
const VALIDATION_RULES = {
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
};
```

---

## 8. Database Schema Extensions (Backend)

### Add penalty columns to dives table

```sql
-- Migration: Add penalty columns
ALTER TABLE dives 
  ADD COLUMN penalty_code VARCHAR(20) NULL,
  ADD COLUMN penalty_deduction DECIMAL(4,2) NULL,
  ADD COLUMN penalty_description VARCHAR(255) NULL;

-- Index for penalty filtering
CREATE INDEX idx_dive_penalty ON dives(penalty_code) WHERE penalty_code IS NOT NULL;
```

### Soft delete support (optional)

```sql
-- Migration: Add soft delete
ALTER TABLE dives ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE competitions ADD COLUMN deleted_at TIMESTAMP NULL;

-- Index for filtering active records
CREATE INDEX idx_dives_active ON dives(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_competitions_active ON competitions(deleted_at) WHERE deleted_at IS NULL;
```

---

## 9. Data Flow Diagram (Extended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                            │
│                                                                             │
│ ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│ │ CompetitionData │───▶│ useMemo         │───▶│ Derived Data    │          │
│ │ (from API)      │    │ - filter events │    │ - cumulatives   │          │
│ │                 │    │ - sort athletes │    │ - dropped scores│          │
│ └─────────────────┘    └─────────────────┘    │ - chart data    │          │
│                                                └────────┬────────┘          │
│                                                         │                   │
│                    ┌────────────────────────────────────┼──────────────┐    │
│                    │                                    │              │    │
│                    ▼                                    ▼              ▼    │
│ ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐     │
│ │ DiveBreakdownCard   │  │ Chart Components    │  │ Edit/Delete     │     │
│ │ - JudgeScoreCell    │  │ - Progression       │  │ - EditDiveModal │     │
│ │ - CumulativeColumn  │  │ - JudgeConsistency  │  │ - DeleteConfirm │     │
│ │ - PenaltyIndicator  │  │ - ScoreDistribution │  │                 │     │
│ └─────────────────────┘  └─────────────────────┘  └────────┬────────┘     │
│                                                             │              │
│                                                             ▼              │
│                                                    ┌─────────────────┐     │
│                                                    │ API Calls       │     │
│                                                    │ - PATCH dive    │     │
│                                                    │ - DELETE dive   │     │
│                                                    │ - Refetch data  │     │
│                                                    └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Type Export Summary

New types to export from `frontend/lib/types.ts` (new file):

```typescript
export type {
  // Scoring
  ScoreBreakdown,
  CumulativeEntry,
  
  // Charts
  AthleteProgressionData,
  JudgeConsistencyData,
  ScoreDistributionBin,
  DifficultyScorePoint,
  RoundComparisonData,
  
  // CRUD
  UpdateDiveRequest,
  DeleteResponse,
  EditDiveModalState,
  
  // Component Props
  DiveBreakdownCardProps,
  JudgeScoreCellProps,
  PenaltyIndicatorProps,
  EditDiveModalProps,
  DeleteConfirmDialogProps,
  AthleteProgressionChartProps,
  JudgeConsistencyChartProps,
  ScoreDistributionChartProps,
  DifficultyScoreScatterProps,
  RoundComparisonRadarProps,
};
```
