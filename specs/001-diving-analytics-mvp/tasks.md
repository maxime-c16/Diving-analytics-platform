# Tasks: OCR PDF Parsing Bug Fix and E2E Pipeline Testing

**Input**: Design documents from `/specs/001-diving-analytics-mvp/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1=Dive Score Extraction, US2=Athlete-Dive Association, US3=UI Alignment, US4=E2E Testing

## Path Conventions

- **Worker**: `worker/` (Python OCR processing)
- **Backend**: `backend/src/` (NestJS API)
- **Frontend**: `frontend/` (Next.js UI)
- **Tests**: `tests/` (E2E test infrastructure - NEW)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test infrastructure and ground truth data setup

- [ ] T001 Create test directory structure at `tests/fixtures/`, `tests/worker/`, `tests/backend/`, `tests/frontend/`, `tests/utils/`
- [ ] T002 [P] Extract OCR baseline from ground truth PDF to `tests/fixtures/ocr-output-baseline.json`
- [ ] T003 [P] Create manually-verified ground truth fixture at `tests/fixtures/ground-truth-expected.json` (verification: compare 3 random athletes' dives against PDF visually, document in fixture metadata)
- [ ] T004 [P] Install pytest dependencies for worker tests (`pytest`, `pytest-asyncio`, `pytest-cov`) in `worker/requirements.txt`
- [ ] T005 [P] Configure Jest for backend E2E tests in `backend/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and validation infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create validation utilities module at `worker/validation.py` with functions: `validate_dive_code()`, `validate_judge_score()`, `validate_difficulty()`
- [ ] T007 [P] Create OCR error correction module at `worker/ocr_corrections.py` with `EXTENDED_OCR_CORRECTIONS` dict (4→A, 8→B, 0→D mappings) and `correct_dive_code()` function
- [ ] T008 [P] Create shared test utilities at `tests/utils/comparison.py` with functions: `compare_dives()`, `compare_athlete_results()` using tolerance values from spec.md
- [ ] T009 [P] Create fixture loader at `tests/utils/fixtures.py` to load ground truth JSON with validation
- [ ] T010 Add confidence scoring interface to ExtractionResult in `worker/worker.py` (field: `confidence: float` 0.0-1.0)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Accurate Dive Score Extraction (Priority: P1) 🎯 MVP

**Goal**: System correctly extracts dive scores from French competition PDFs

**Independent Test**: Upload ground truth PDF, verify each extracted dive score matches expected values

### Implementation for User Story 1

- [ ] T011 [US1] Update `worker/worker.py` to import corrections from `ocr_corrections.py` module and replace inline `OCR_ERROR_CORRECTIONS` dict
- [ ] T012 [US1] Extend `_correct_dive_code_ocr()` in `worker/worker.py` to handle edge cases: 3-digit codes with OCR'd suffix (e.g., 1018→1018 should become 101B), codes with trailing artifacts (101C_→101C)
- [ ] T013 [P] [US1] Add French decimal parser function in `worker/worker.py` to handle `6,5` → `6.5` format consistently
- [ ] T014 [P] [US1] Add dive code validation regex in `worker/worker.py` matching `^[1-6]\d{2,3}[A-D]$`
- [ ] T015 [US1] Update `_parse_dive_row_ffn()` in `worker/worker.py` to use extended OCR corrections
- [ ] T016 [US1] Add judge score validation (0-10, 0.5 increments) in `worker/worker.py` `_extract_judge_scores()`
- [ ] T017 [US1] Add difficulty validation (1.0-4.5 range) in `worker/worker.py` `_parse_dive_row_ffn()`
- [ ] T018 [US1] Implement confidence scoring logic in `worker/worker.py` based on validation pass rate
- [ ] T019 [US1] Add debug logging for OCR corrections applied in `worker/worker.py`

**Checkpoint**: User Story 1 complete - dive score extraction should be accurate

---

## Phase 4: User Story 2 - Correct Athlete-Dive Association (Priority: P1)

**Goal**: Each dive correctly associated with the right athlete and round

**Independent Test**: After PDF upload, verify each athlete's dives are correctly grouped and ordered

### Implementation for User Story 2

- [ ] T020 [US2] Fix DiveRecorder athlete line regex in `worker/worker.py` `_parse_athlete_line()` to handle `Firstname LASTNAME (year) -- Club` format
- [ ] T021 [US2] Add round number tracking per athlete in `worker/worker.py` to increment correctly across pages
- [ ] T022 [P] [US2] Add event detection regex in `worker/worker.py` for patterns like `Elite - Dames - 3m`
- [ ] T023 [US2] Create new `_associate_dives_with_athletes()` method in `worker/worker.py` to link extracted dives to athletes based on document position and round tracking
- [ ] T024 [US2] Add HV (Haut Vol) event height parsing in `worker/worker.py` to extract per-dive heights (5m, 7.5m, 10m)
- [ ] T025 [US2] Fix athlete name normalization in `worker/worker.py` to handle French accents (é, è, ô)
- [ ] T026 [US2] Add event grouping to ExtractionResult in `worker/worker.py` to separate multiple events in one PDF

**Checkpoint**: User Story 2 complete - athlete-dive associations should be correct

---

## Phase 5: User Story 3 - UI Data Alignment (Priority: P2)

**Goal**: UI analysis panel displays data with correct row/column alignment

**Independent Test**: View Standings and Rounds tabs after PDF import, verify visual alignment

### Implementation for User Story 3

- [ ] T027 [US3] Fix array mutation bug: change `.sort()` to `[...array].sort()` in `frontend/pages/competitions/[id].tsx` line 416
- [ ] T028 [US3] Add null checks with fallbacks (`?? "—"`) for all dive properties in `frontend/pages/competitions/[id].tsx` lines 417-422
- [ ] T029 [US3] Replace `idx + 1` with `dive.rank ?? idx + 1` for rank display in `frontend/pages/competitions/[id].tsx` line 418
- [ ] T030 [P] [US3] Replace flex layout with table layout in dive breakdown section in `frontend/pages/competitions/[id].tsx` lines 369-380
- [ ] T031 [P] [US3] Add fixed column widths (w-12, w-20, w-16) to table cells in `frontend/pages/competitions/[id].tsx`
- [ ] T032 [US3] Update `DiveResult` type in `frontend/lib/api.ts` to include `athleteName` and `athleteCountry` optional fields
- [ ] T033 [US3] Add loading skeleton for competition data in `frontend/pages/competitions/[id].tsx`
- [ ] T034 [US3] Add error boundary for data rendering failures in `frontend/pages/competitions/[id].tsx`

**Checkpoint**: User Story 3 complete - UI should display aligned data

---

## Phase 6: User Story 4 - End-to-End Pipeline Validation (Priority: P2)

**Goal**: Automated tests validate entire pipeline from PDF upload to UI display

**Independent Test**: Run test suite, verify all pipeline stages produce expected outputs

### Implementation for User Story 4

- [ ] T035 [P] [US4] Create OCR extraction test file at `tests/worker/test_ocr_extraction.py` with fixture loading
- [ ] T036 [P] [US4] Add test case `test_dive_code_extraction()` in `tests/worker/test_ocr_extraction.py`
- [ ] T037 [P] [US4] Add test case `test_judge_score_extraction()` in `tests/worker/test_ocr_extraction.py`
- [ ] T038 [P] [US4] Add test case `test_athlete_association()` in `tests/worker/test_ocr_extraction.py`
- [ ] T039 [P] [US4] Add test case `test_ocr_error_correction()` in `tests/worker/test_ocr_extraction.py`
- [ ] T040 [US4] Create backend integration test at `tests/backend/test_ingestion_e2e.ts`
- [ ] T041 [US4] Add test case for CSV import validation in `tests/backend/test_ingestion_e2e.ts`
- [ ] T042 [US4] Add test case for competition data API response in `tests/backend/test_ingestion_e2e.ts`
- [ ] T043 [P] [US4] Create frontend component test at `tests/frontend/test_analysis_panel.spec.ts`
- [ ] T044 [US4] Add Playwright E2E test for full pipeline in `tests/frontend/test_pipeline_e2e.spec.ts`
- [ ] T045 [US4] Create CI workflow at `.github/workflows/pipeline-tests.yml` to run full test suite
- [ ] T046 [US4] Add test coverage reporting configuration for worker, backend, and frontend
- [ ] T046a [US4] Create accuracy measurement script at `tests/utils/accuracy.py` to calculate NFR-002 compliance (% dives with all fields matching within tolerance)
- [ ] T046b [US4] Add partial OCR failure handling test case in `tests/worker/test_ocr_extraction.py` - verify graceful degradation when some pages fail

**Checkpoint**: User Story 4 complete - automated tests should validate full pipeline

---

## Phase 7: Cross-Cutting Concerns (Confidence & Event Propagation)

**Purpose**: Propagate confidence scores and event grouping through full stack

- [ ] T047a [P] Add `confidence` field to backend `IngestionLog` entity in `backend/src/entities/ingestion-log.entity.ts`
- [ ] T047b [P] Update ingestion service in `backend/src/modules/ingestion/ingestion.service.ts` to store confidence score from worker
- [ ] T047c [P] Add confidence display to `frontend/pages/competitions/[id].tsx` in the Details tab
- [ ] T047d [P] Add event filtering dropdown to `frontend/pages/competitions/[id].tsx` for multi-event PDFs (FR-008 frontend support)
- [ ] T047e Add backend endpoint to list events within a competition in `backend/src/modules/ingestion/ingestion.controller.ts`

---

## Phase 8: Polish & Documentation

**Purpose**: Documentation, cleanup, and cross-cutting improvements

- [ ] T048 [P] Update `worker/README.md` with OCR correction documentation
- [ ] T049 [P] Update `quickstart.md` with actual test commands and expected outputs
- [ ] T050 Run full E2E test suite against ground truth PDF and verify all tests pass
- [ ] T051 [P] Add performance logging for OCR processing time in `worker/worker.py`
- [ ] T052 Document known OCR limitations in `specs/001-diving-analytics-mvp/research.md`
- [ ] T053 Create troubleshooting guide at `docs/ocr-troubleshooting.md`
- [ ] T054 Standardize field naming across layers: use `judgeScores` (camelCase) everywhere - update `data-model.md`, `frontend/lib/api.ts`, and ensure backend entity uses consistent naming

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 & US2 (Phase 3-4)**: Both P1 priority, can run in parallel after Foundational
- **US3 (Phase 5)**: P2 priority, can start after Foundational (independent of US1/US2)
- **US4 (Phase 6)**: P2 priority, should start after US1/US2 to test real fixes
- **Cross-Cutting (Phase 7)**: Depends on US1+US2 for confidence data to propagate
- **Polish (Phase 8)**: Depends on all user stories and cross-cutting complete

### User Story Dependencies

| Story | Can Start After | Dependencies |
|-------|-----------------|--------------|
| US1 (Dive Score Extraction) | Phase 2 | None |
| US2 (Athlete-Dive Association) | Phase 2 | None (can run parallel to US1) |
| US3 (UI Alignment) | Phase 2 | None (independent frontend work) |
| US4 (E2E Testing) | Phase 2 | Best after US1+US2 fixes are in |

### Within Each User Story

- Core implementation before validation
- Validation before integration
- Story complete before moving to Polish phase

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# Run in parallel:
T002: Extract OCR baseline
T003: Create ground truth fixture  
T004: Install pytest dependencies
T005: Configure Jest
```

**Phase 2 (Foundational)**:
```bash
# Run in parallel:
T007: OCR error corrections module
T008: Test comparison utilities
T009: Fixture loader
```

**Phase 3 (US1)**:
```bash
# Run in parallel:
T013: French decimal parser
T014: Dive code validation regex
```

**Phase 5 (US3)**:
```bash
# Run in parallel:
T030: Replace flex with table layout
T031: Add fixed column widths
```

**Phase 6 (US4)**:
```bash
# Run in parallel:
T035-T039: All worker test cases
T043: Frontend component test
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (test infrastructure)
2. Complete Phase 2: Foundational (validation utilities)
3. Complete Phase 3: User Story 1 (accurate extraction)
4. Complete Phase 4: User Story 2 (correct associations)
5. **VALIDATE**: Test with ground truth PDF
6. **MVP DELIVERABLE**: OCR fixes ready for testing

### Full Delivery

1. MVP complete (above)
2. Phase 5: User Story 3 (UI alignment)
3. Phase 6: User Story 4 (E2E tests)
4. Phase 7: Cross-cutting (confidence & event propagation)
5. Phase 8: Polish & documentation
6. **FULL DELIVERABLE**: Complete pipeline with automated tests

---

## Summary

| Phase | Tasks | Parallel Tasks |
|-------|-------|----------------|
| Phase 1: Setup | T001-T005 | 4 |
| Phase 2: Foundational | T006-T010 | 4 |
| Phase 3: US1 - Extraction | T011-T019 | 2 |
| Phase 4: US2 - Association | T020-T026 | 1 |
| Phase 5: US3 - UI Alignment | T027-T034 | 2 |
| Phase 6: US4 - E2E Testing | T035-T046b | 7 |
| Phase 7: Cross-Cutting | T047a-T047e | 4 |
| Phase 8: Polish | T048-T054 | 4 |
| **Total** | **59 tasks** | **28 parallelizable** |

---

## Notes

- Ground truth PDF: `20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf`
- DiveRecorder format uses `Firstname LASTNAME` (not FFN's `LASTNAME Firstname`)
- HV events have mixed heights per dive (5m, 7.5m, 10m)
- French decimals use comma (6,5 = 6.5)
- OCR commonly misreads A→4, B→8 in dive codes
- **Field naming convention**: Use `judgeScores` (camelCase) across all layers
