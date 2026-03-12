# Data Model: OCR PDF Parsing and Analysis Panel

**Created**: 27 November 2025

## Overview

This document describes the data structures used throughout the PDF-to-UI pipeline for diving competition results.

---

## 1. Worker Layer (Python)

### ExtractedDive

Represents a single dive extracted from PDF OCR.

```python
@dataclass
class ExtractedDive:
    athlete_name: str           # "Camille Rouffiac"
    dive_code: str              # "5231D"
    round_number: int = 1       # 1-6
    judge_scores: List[float] = None  # [6.5, 7.0, 6.5, 7.5, 7.0]
    difficulty: Optional[float] = None  # 2.0
    final_score: Optional[float] = None  # 42.00
    rank: Optional[int] = None  # 1
    country: Optional[str] = None  # Club name for French comps
    event_name: Optional[str] = None  # "Elite - Dames - 3m"
    height: Optional[str] = None  # "3m", "10m"
```

### ExtractionResult

Complete result of PDF processing.

```python
@dataclass
class ExtractionResult:
    success: bool
    competition_name: Optional[str]  # "Championnats IDF hiver"
    event_type: Optional[str]        # "3m", "HV"
    date: Optional[str]              # "23 novembre 2025"
    location: Optional[str]          # "Paris"
    dives: List[ExtractedDive]       # All extracted dives
    raw_text: str                    # Raw OCR output (first 5000 chars)
    errors: List[str]                # Parsing errors
    confidence: float                # 0.0-1.0
```

### Validation Rules

| Field | Rule | Example Valid | Example Invalid |
|-------|------|---------------|-----------------|
| `dive_code` | `^[1-6]\d{2,3}[A-D]$` | `101A`, `5231D` | `701A`, `101E` |
| `judge_scores` | 0-10, 0.5 increments, 5-7 values | `[6.5, 7.0]` | `[6.3, 11.0]` |
| `difficulty` | 1.0-4.5 | `2.0` | `5.0` |
| `final_score` | 0-200 | `42.00` | `250.0` |
| `round_number` | 1-10 | `3` | `0` |

---

## 2. Backend Layer (TypeScript/NestJS)

### ProcessedRow

Internal representation after CSV parsing and validation.

```typescript
interface ProcessedRow {
  athleteName: string;
  country?: string;
  diveCode: string;
  roundNumber: number;
  judgeScores: number[];
  difficulty: number;
  finalScore: number;
  rank?: number;
  height?: string;      // Per-dive height for multi-height events
  eventName?: string;   // Event within competition
}
```

### Dive Entity (TypeORM)

Database representation.

```typescript
@Entity('dives')
class Dive {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  athleteId: number;

  @Column()
  competitionId: number;

  @Column({ length: 5 })
  diveCode: string;

  @Column({ length: 1 })
  position: string;  // A, B, C, D

  @Column('decimal', { precision: 3, scale: 1 })
  height: number;  // 1.0, 3.0, 5.0, 7.5, 10.0

  @Column('decimal', { precision: 2, scale: 1 })
  difficulty: number;

  @Column('simple-json')
  judgeScores: number[];  // Standardized: camelCase 'judgeScores' across all layers

  @Column('decimal', { precision: 5, scale: 2 })
  finalScore: number;

  @Column({ nullable: true })
  rank?: number;

  @Column({ default: 1 })
  roundNumber: number;

  @Column({ nullable: true })
  eventName?: string;
}
```

### Competition Entity

```typescript
@Entity('competitions')
class Competition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  date?: Date;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  eventType?: string;  // "3m", "10m", "mixed"

  @OneToMany(() => Dive, dive => dive.competition)
  dives: Dive[];
}
```

### Athlete Entity

```typescript
@Entity('athletes')
class Athlete {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  country?: string;

  @OneToMany(() => Dive, dive => dive.athlete)
  dives: Dive[];
}
```

---

## 3. API Layer (REST Contracts)

### GET /api/ingestion/competitions/:id

Returns competition data for the analysis panel.

```typescript
interface CompetitionData {
  competition: {
    id: number;
    name: string;
    date: string;
    location?: string;
    eventType?: string;
  };
  statistics: CompetitionStatistics;
  athletes: AthleteResult[];
  rounds: RoundData[];
  hasMultipleEvents: boolean;
  eventNames: string[];
  events?: Record<string, EventData>;  // Keyed by event name
}

interface CompetitionStatistics {
  totalAthletes: number;
  totalDives: number;
  highestScore: number;
  lowestScore: number;
  averageScore: number;
  rounds: number;
}

interface AthleteResult {
  athlete: {
    id: number;
    name: string;
    country?: string;
  };
  rank: number;
  totalScore: number;
  averageScore: number;
  diveCount: number;
  dives: DiveResult[];
}

interface DiveResult {
  id: number;
  roundNumber: number;
  diveCode: string;
  difficulty: number;
  judgeScores?: number[];
  finalScore: number;
  rank?: number;
  eventName?: string;
}

interface RoundData {
  roundNumber: number;
  diveCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  dives: RoundDive[];
}

// Note: Different structure from DiveResult
interface RoundDive {
  id: number;
  athleteName: string;       // Included for round view
  athleteCountry?: string;   // Included for round view
  diveCode: string;
  difficulty: number;
  judgeScores?: number[];
  finalScore: number;
  rank?: number;
  eventName?: string;
}
```

### POST /api/ingestion/import-pdf

Import extracted PDF data.

```typescript
interface ImportPdfRequest {
  competitionName: string;
  competitionDate?: string;
  location?: string;
  eventType: string;  // "3m", "auto", etc.
  dives: ExtractedDive[];
  sourceJobId: string;
}

interface ImportPdfResponse {
  success: boolean;
  ingestionId: string;
  competitionId: number;
  processedCount: number;
  failedCount: number;
  errors?: RowError[];
}
```

---

## 4. Frontend Layer (React/TypeScript)

### CompetitionData (api.ts)

```typescript
// Already matches backend contract - see section 3
```

### UI State

```typescript
// Competition detail page state
interface CompetitionPageState {
  log: IngestionLog | null;
  competitionData: CompetitionData | null;
  errors: RowError[];
  loading: boolean;
  retrying: boolean;
  expandedAthlete: number | null;  // Athlete ID
  activeTab: 'standings' | 'rounds' | 'charts' | 'details';
  selectedEvent: string;  // "all" or event name
}

// Derived data for current view
interface CurrentViewData {
  statistics: CompetitionStatistics;
  athletes: AthleteResult[];
  rounds: RoundData[];
}
```

### Chart Data Transformations

```typescript
// For athlete score bar chart
interface AthleteScoreData {
  name: string;   // Last name only
  total: number;  // Total score
}

// For round performance chart
interface RoundChartData {
  round: string;     // "R1", "R2", etc.
  average: number;
  highest: number;
}

// For difficulty distribution
interface DifficultyData {
  dd: string;     // "1.5", "2.0", etc.
  count: number;
}
```

---

## 5. Ground Truth Fixture Format

For E2E testing against known PDF data.

```typescript
interface GroundTruthFixture {
  pdfFileName: string;
  extractedAt: string;  // ISO date
  events: EventFixture[];
  totals: {
    athletes: number;
    dives: number;
    events: number;
  };
}

interface EventFixture {
  name: string;           // "Elite - Dames - 3m"
  height: string;         // "3m"
  athleteCount: number;
  athletes: AthleteFixture[];
}

interface AthleteFixture {
  rank: number;
  name: string;           // "Camille ROUFFIAC"
  club?: string;
  birthYear?: number;
  dives: DiveFixture[];
  totalScore: number;
}

interface DiveFixture {
  roundNumber: number;
  diveCode: string;       // "101B"
  difficulty: number;     // 1.5
  judgeScores: number[];  // [6.5, 7.0, 6.5, 7.0, 6.5]
  diveScore: number;      // Individual dive score
  cumulativeScore: number; // Running total
}
```

---

## 6. Error Structures

### RowError (Ingestion)

```typescript
interface RowError {
  row: number;       // CSV row number (1-indexed)
  error: string;     // Error message
  data?: any;        // Original row data for debugging
}
```

### ExtractionError (Worker)

```typescript
interface ExtractionError {
  page?: number;
  line?: string;
  error: string;
  suggestion?: string;
}
```

---

## 7. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PDF UPLOAD                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKER SERVICE                                                               │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│ │ PDF to Image│───▶│ Tesseract   │───▶│ Parse Text  │───▶│ ExtractDive │   │
│ │ (pdf2image) │    │ OCR         │    │ (regex)     │    │ objects     │   │
│ └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│                                                                ↓             │
│                                                    ExtractionResult         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND (NestJS)                                                            │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│ │ Import API  │───▶│ Validate    │───▶│ ProcessRow  │───▶│ Save to DB  │   │
│ │ Endpoint    │    │ Data        │    │ Transform   │    │ (TypeORM)   │   │
│ └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│                                                                ↓             │
│                                                    Dive, Athlete, etc.      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND (Query)                                                             │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                       │
│ │ Join Query  │───▶│ Aggregate   │───▶│ Format      │                       │
│ │ (TypeORM)   │    │ Stats       │    │ Response    │                       │
│ └─────────────┘    └─────────────┘    └─────────────┘                       │
│                                              ↓                               │
│                                    CompetitionData JSON                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                            │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│ │ Fetch API   │───▶│ useMemo     │───▶│ Transform   │───▶│ Render UI   │   │
│ │ (api.ts)    │    │ (filter)    │    │ Chart Data  │    │ (tables)    │   │
│ └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Field Naming Convention (Standardized)

**Convention**: Use `judgeScores` (camelCase) consistently across ALL layers.

| Layer | Field Name | Format | Notes |
|-------|------------|--------|-------|
| Worker (Python) | `judge_scores` | snake_case | Python convention for internal dataclass |
| Backend DTO | `judgeScores` | camelCase | TypeScript convention |
| Dive Entity | `judgeScores` | camelCase | DB column: `judge_scores` |
| API Response | `judgeScores` | camelCase | Frontend expects this |
| Frontend Types | `judgeScores` | camelCase | TypeScript convention |

**Note**: Python worker uses `judge_scores` internally but the JSON output to backend
uses camelCase `judgeScores` for cross-layer compatibility.

---

## 9. Index Suggestions (PostgreSQL)

```sql
-- Optimize competition queries
CREATE INDEX idx_dives_competition ON dives(competition_id);
CREATE INDEX idx_dives_athlete ON dives(athlete_id);
CREATE INDEX idx_dives_round ON dives(competition_id, round_number);
CREATE INDEX idx_dives_event ON dives(competition_id, event_name);

-- Optimize athlete lookups
CREATE INDEX idx_athletes_name ON athletes(name);
```
