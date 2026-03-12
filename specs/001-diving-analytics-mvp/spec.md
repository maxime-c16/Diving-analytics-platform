# Feature Specification: OCR PDF Parsing Bug Fix and End-to-End Pipeline Testing

**Feature Branch**: `001-diving-analytics-mvp`  
**Created**: 27 November 2025  
**Status**: Draft  
**Input**: User description: "Plan the bug fix of the OCR PDF parsing where dive scores are not well recognized and the different rows and column mismatch in the analysis panel in the UI. Plan overall tests for the whole PDF to analysis panel pipeline to catch errors or inconsistency, using the PDF in the root directory as ground truth."

## Problem Statement

The current OCR PDF parsing implementation has issues:
1. **Dive score recognition errors** - Dive scores are not being correctly extracted from OCR text
2. **Row/column mismatch in UI** - The analysis panel displays data with misaligned rows and columns
3. **No end-to-end validation** - There's no comprehensive test suite to validate the full pipeline from PDF to UI display

The PDF file `20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf` in the root directory will serve as the ground truth for validating the fix.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accurate Dive Score Extraction (Priority: P1)

As a diving analytics user, I want the system to correctly extract dive scores from French competition PDFs so that I can analyze competition results accurately.

**Why this priority**: Without accurate score extraction, the entire system provides incorrect data, making it useless for analysis.

**Independent Test**: Upload the ground truth PDF and verify each extracted dive score matches the original PDF values.

**Acceptance Scenarios**:

1. **Given** a French diving competition PDF with the format `Championnats IDF hiver`, **When** the PDF is uploaded and processed, **Then** all dive codes should be correctly recognized (e.g., 101B, 5211A, 403C)
2. **Given** a PDF with multiple judge scores per dive, **When** processed, **Then** all 5-7 judge scores should be extracted and match the PDF exactly
3. **Given** a PDF with dive difficulties (DD), **When** processed, **Then** the difficulty values should be correctly extracted (e.g., 1.5, 2.0, 2.9)
4. **Given** a PDF with final scores, **When** processed, **Then** the final scores should be correctly extracted and validated against calculated values

---

### User Story 2 - Correct Athlete-Dive Association (Priority: P1)

As a user analyzing competition results, I want each dive to be correctly associated with the right athlete and round so that standings are accurate.

**Why this priority**: Misassociation between athletes and dives makes the analysis panel display incorrect rankings.

**Independent Test**: After PDF upload, verify that each athlete's dives are correctly grouped and ordered by round.

**Acceptance Scenarios**:

1. **Given** a PDF with multiple athletes (e.g., 20+ divers), **When** processed, **Then** each dive should be linked to the correct athlete name
2. **Given** a PDF with multiple rounds per athlete (e.g., 6 dives each), **When** processed, **Then** dives should be correctly assigned to rounds 1-6
3. **Given** a PDF with multiple events (Elite Dames 3m, Elite Messieurs HV), **When** processed, **Then** athletes should be correctly grouped by event

---

### User Story 3 - UI Data Alignment (Priority: P2)

As a user viewing competition results, I want the UI analysis panel to display data with correct row/column alignment so that I can read and interpret results easily.

**Why this priority**: UI alignment issues make the data difficult to read even if extraction is correct.

**Independent Test**: View the standings and rounds tabs after PDF import and verify visual alignment matches expected layout.

**Acceptance Scenarios**:

1. **Given** competition data in the database, **When** viewing the Standings tab, **Then** rank, athlete name, total score, and dive count should align in correct columns
2. **Given** round-by-round data, **When** viewing the Rounds tab, **Then** each row should show: Rank, Athlete, Dive Code, DD, Judge Scores, Final Score in proper alignment
3. **Given** multiple athletes with varying dive counts, **When** expanding athlete details, **Then** each dive breakdown row should display correctly aligned data

---

### User Story 4 - End-to-End Pipeline Validation (Priority: P2)

As a developer, I want automated tests that validate the entire pipeline from PDF upload to UI display so that regressions are caught early.

**Why this priority**: Critical for maintaining data integrity as the system evolves.

**Independent Test**: Run the test suite and verify all pipeline stages produce expected outputs.

**Acceptance Scenarios**:

1. **Given** a ground truth PDF with known expected values, **When** running the test suite, **Then** all OCR extraction values should match expected values within tolerance
2. **Given** extracted data imported to database, **When** running API tests, **Then** competition data endpoints should return correctly structured data
3. **Given** API returning correct data, **When** running frontend tests, **Then** UI components should render data in correct positions

---

### Edge Cases

- What happens when OCR misreads 'A' as '4' in dive codes (e.g., 5211A → 52114)?
- How does the system handle partial OCR failures (some pages clear, others blurry)?
- What happens when athlete names contain accents (é, è, ë, ô)?
- How does the system handle HV (Haut Vol) events with mixed heights (5m, 7.5m, 10m)?
- What happens when the PDF contains multiple competitions or events in one file?
- How does the system handle judge panels of different sizes (5 vs 7 judges)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST correctly parse dive codes in format `XXX[A-D]` or `XXXX[A-D]` where first digit is 1-6
- **FR-002**: System MUST handle OCR errors where letter suffixes are misread as digits (A→4, B→8, etc.)
- **FR-003**: System MUST extract judge scores as arrays of 5-7 floats in 0.5 increments (FINA scoring: drop highest and lowest scores, sum middle 3-5, multiply by DD)
- **FR-004**: System MUST extract difficulty (DD) values in range 1.0-4.5
- **FR-005**: System MUST correctly associate each dive with its athlete based on PDF structure
- **FR-006**: System MUST correctly identify round/dive numbers (1-6 typically)
- **FR-007**: System MUST handle French competition formats (FFN, DiveRecorder)
- **FR-008**: System MUST detect and group multiple events within a single PDF
- **FR-009**: System MUST extract height information from event names (3m, HV → 5m/7.5m/10m)
- **FR-010**: UI MUST display athlete standings with correct column alignment
- **FR-011**: UI MUST display dive breakdown with judge scores properly aligned
- **FR-012**: System MUST provide confidence scores for extraction quality

### Non-Functional Requirements

- **NFR-001**: OCR extraction should complete within 60 seconds for PDFs up to 20 pages (typical density: 5-10 athletes per page, ~6 dives each)
- **NFR-002**: Extraction accuracy should be ≥95% for properly formatted competition PDFs, measured as: percentage of extracted dives where ALL fields (dive_code, judge_scores, difficulty, final_score) match ground truth within defined tolerances
- **NFR-003**: Test suite should run in under 2 minutes for full pipeline validation

### Tolerance Definitions

- **finalScore tolerance**: ±0.01 (accounting for rounding differences)
- **judgeScore tolerance**: exact match required (0.5 increments only)
- **difficulty tolerance**: exact match required (0.1 increments only)
- **diveCode tolerance**: exact string match (case-insensitive)

### Key Entities

- **ExtractedDive**: Represents a dive parsed from PDF (athlete_name, dive_code, round_number, judge_scores[], difficulty, final_score, rank, event_name, height)
- **ProcessedRow**: Backend representation of validated dive data ready for database insertion
- **AthleteResult**: Frontend representation grouping dives by athlete with totals
- **RoundData**: Frontend representation grouping dives by round for display

## Ground Truth Data

The PDF `20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf` will serve as the reference for validation. A JSON fixture file should be created containing:
- Expected number of athletes per event
- Expected dive codes for each athlete
- Expected judge scores for each dive
- Expected final scores and rankings
- Expected event/height classifications

## Technical Notes

### Current Known Issues

1. **OCR letter-to-digit confusion**: The code has correction logic (`OCR_ERROR_CORRECTIONS`) but may not catch all cases
2. **Height parsing complexity**: HV (Haut Vol) events contain mixed heights that need per-dive detection
3. **French format variations**: FFN and DiveRecorder formats have different athlete line structures
4. **Judge score count validation**: Currently discards invalid counts but may discard valid data
5. **Round number assignment**: Logic for incrementing rounds per athlete may not handle all formats

### Components Affected

- `worker/worker.py`: PDF OCR and parsing logic
- `backend/src/modules/ingestion/ingestion.service.ts`: Data validation and database insertion
- `frontend/pages/competitions/[id].tsx`: Analysis panel display
- `frontend/lib/api.ts`: API type definitions and data structures
