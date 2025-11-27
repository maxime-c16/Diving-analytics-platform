# Implementation Plan: OCR PDF Parsing Bug Fix and E2E Pipeline Testing

**Branch**: `001-diving-analytics-mvp` | **Date**: 27 November 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-diving-analytics-mvp/spec.md`

## Summary

Fix OCR PDF parsing issues where dive scores are incorrectly recognized and fix row/column mismatch in the UI analysis panel. Implement comprehensive end-to-end pipeline tests using the ground truth PDF (`20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf`) to validate the entire flow from PDF upload to UI display.

## Technical Context

**Language/Version**: Python 3.11 (worker), TypeScript 5.x (backend/frontend)  
**Primary Dependencies**: 
- Worker: pytesseract, pdf2image, Celery, Redis, Pillow
- Backend: NestJS, TypeORM, PostgreSQL client
- Frontend: Next.js, React 18, Recharts, Framer Motion

**Storage**: PostgreSQL 15 (via TypeORM entities: Athlete, Competition, Dive, Score, IngestionLog)  
**Testing**: pytest (worker), Jest (backend), React Testing Library/Playwright (frontend)  
**Target Platform**: Docker containers (Linux), development on macOS  
**Project Type**: Web application (monorepo with backend/, frontend/, worker/, compute-engine/)  
**Performance Goals**: PDF processing <60s for 20 pages, API response <500ms, UI render <1s  
**Constraints**: OCR accuracy ≥95% for well-formatted PDFs, must handle French competition formats  
**Scale/Scope**: Single competition PDFs with 10-50 athletes, 5-6 dives per athlete

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template is not yet filled for this project. Proceeding with standard software engineering best practices:

- ✅ **Test-First Approach**: Tests will be written based on ground truth PDF before fixing bugs
- ✅ **Observability**: Logging exists throughout the OCR pipeline
- ✅ **Simplicity**: Focus on fixing existing code rather than rewriting

## Project Structure

### Documentation (this feature)

```text
specs/001-diving-analytics-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output - OCR pattern analysis
├── data-model.md        # Phase 1 output - Data flow documentation
├── quickstart.md        # Phase 1 output - Test setup guide
├── contracts/           # Phase 1 output - API contracts
│   ├── ocr-extraction.json    # Worker output schema
│   └── competition-api.json   # Backend API schema
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Web application structure (existing)
backend/
├── src/
│   ├── entities/               # TypeORM entities
│   ├── modules/
│   │   ├── ingestion/          # CSV/PDF import logic
│   │   └── scores/             # Score calculation
│   └── common/                 # Validators, constants

frontend/
├── pages/
│   └── competitions/
│       └── [id].tsx            # Analysis panel (bug location)
├── components/
│   └── ui/                     # Reusable UI components
└── lib/
    └── api.ts                  # API client types

worker/
├── worker.py                   # OCR parsing (bug location)
└── requirements.txt

tests/                          # NEW: E2E test infrastructure
├── fixtures/
│   ├── ground-truth-expected.json
│   └── sample-pdfs/
├── worker/
│   └── test_ocr_extraction.py
├── backend/
│   └── test_ingestion_e2e.ts
└── frontend/
    └── test_analysis_panel.ts
```

**Structure Decision**: Using existing web application structure. Adding new `tests/` directory at root for E2E pipeline tests.

## Complexity Tracking

No violations identified - using existing architecture patterns.

---

# Phase 0: Research

## Research Tasks

### R1: Analyze Ground Truth PDF Structure
**Task**: Extract and document the exact structure of the ground truth PDF
- Page count and layout
- Event sections (Elite Dames 3m, Elite Messieurs HV, etc.)
- Athlete line format
- Dive result row format
- Judge score column positions

### R2: Document Current OCR Error Patterns
**Task**: Identify specific OCR misrecognition patterns in the current implementation
- Character confusion patterns (A→4, B→8, etc.)
- Number sequence parsing errors
- French accent handling issues
- Spacing and column alignment issues

### R3: Analyze UI Data Flow
**Task**: Trace data flow from API response to UI rendering
- API response structure (`CompetitionData`, `AthleteResult`)
- React component data binding
- Table/grid rendering logic
- Identify where row/column mismatch occurs

### R4: Review Tesseract Best Practices for Table Extraction
**Task**: Research optimal Tesseract configuration for diving result tables
- PSM (Page Segmentation Mode) options
- Language configuration for French
- Image preprocessing for table recognition
- Alternative OCR approaches if needed

---

# Phase 1: Design

## Data Model (to be detailed in data-model.md)

### Key Data Structures

```typescript
// Ground Truth Fixture Format
interface GroundTruthFixture {
  pdfFileName: string;
  events: EventFixture[];
}

interface EventFixture {
  name: string;           // "Elite - Dames - 3m"
  height: string;         // "3m"
  athletes: AthleteFixture[];
}

interface AthleteFixture {
  rank: number;
  name: string;           // "Camille ROUFFIAC"
  club: string;
  dives: DiveFixture[];
  totalScore: number;
}

interface DiveFixture {
  roundNumber: number;
  diveCode: string;       // "101B"
  difficulty: number;     // 1.5
  judgeScores: number[];  // [6.5, 7.0, 6.5, 7.0, 6.5]
  finalScore: number;     // 30.00
}
```

### Test Infrastructure

```python
# Worker test structure
class TestOCRExtraction:
    def test_dive_code_extraction()
    def test_judge_score_extraction()
    def test_athlete_association()
    def test_round_number_assignment()
    def test_event_detection()
    def test_ocr_error_correction()
```

## API Contracts (to be detailed in contracts/)

### Worker → Backend Contract
```json
{
  "success": true,
  "competition_name": "string",
  "event_type": "string",
  "dives": [
    {
      "athlete_name": "string",
      "dive_code": "string",
      "round_number": "number",
      "judge_scores": ["number[]"],
      "difficulty": "number",
      "final_score": "number",
      "rank": "number",
      "event_name": "string",
      "height": "string"
    }
  ],
  "confidence": "number"
}
```

### Backend → Frontend Contract
See existing `CompetitionData` type in `frontend/lib/api.ts`

## Quickstart (to be detailed in quickstart.md)

1. Extract ground truth data from PDF manually
2. Create JSON fixture file
3. Set up test environment (Docker services)
4. Run baseline tests to document current failures
5. Implement fixes iteratively with test validation
6. Verify UI alignment with visual regression tests

---

# Phase 2: Implementation Tasks

*To be generated by `/speckit.tasks` command after research and design completion.*

## Anticipated Task Areas

1. **Ground Truth Extraction** - Manual extraction of expected values from PDF
2. **Test Infrastructure Setup** - Create test directories and fixtures
3. **Worker OCR Fixes** - Fix parsing logic in worker.py
4. **UI Alignment Fixes** - Fix table rendering in [id].tsx
5. **E2E Pipeline Tests** - Integration tests covering full flow
6. **Documentation** - Update API docs and test README

---

## Next Steps

1. Execute Phase 0 research tasks to create `research.md`
2. Create ground truth fixture from PDF
3. Complete Phase 1 design documents
4. Run `/speckit.tasks` to generate implementation tasks
