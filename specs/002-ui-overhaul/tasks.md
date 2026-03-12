# Tasks: UI Overhaul for Diving Analytics Platform

**Input**: Design documents from `/specs/002-ui-overhaul/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup ✅

**Purpose**: Project initialization and shared type definitions

- [X] T001 Create component directories: `frontend/components/competition/` and `frontend/components/charts/`
- [X] T002 [P] Create extended type definitions in `frontend/lib/types.ts`
- [X] T003 [P] Create scoring utility functions in `frontend/lib/scoring.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend API endpoints and shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No frontend user story work can begin until backend endpoints are ready

- [X] T004 Add DELETE endpoint for dives in `backend/src/modules/ingestion/ingestion.controller.ts`
- [X] T005 [P] Add DELETE endpoint for competitions in `backend/src/modules/ingestion/ingestion.controller.ts`
- [X] T006 [P] Add PATCH endpoint for athletes in `backend/src/modules/ingestion/ingestion.controller.ts`
- [X] T006a [P] Add GET endpoint for judge statistics in `backend/src/modules/ingestion/ingestion.controller.ts` (per contracts/api-extensions.yaml)
- [X] T007 Extend API client with delete/update methods in `frontend/lib/api.ts`
- [X] T008 [P] Add shadcn/ui components: Dialog, Tooltip, Badge (run `npx shadcn-ui@latest add dialog tooltip badge`)

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Competition-First Homepage (Priority: P1) 🎯 MVP

**Goal**: Transform homepage to prioritize competition browsing over score calculator

**Independent Test**: Load homepage → verify competitions grid is primary content, calculator accessible via nav

### Implementation for User Story 1

- [X] T009 [US1] Create competition card component in `frontend/components/competition/competition-card.tsx`
- [X] T010 [US1] Create recent competitions grid section in `frontend/components/competition/recent-competitions.tsx`
- [X] T011 [US1] Create new calculator page at `frontend/pages/calculator.tsx` (move score calculator logic)
- [X] T012 [US1] Refactor homepage in `frontend/pages/index.tsx` to show competitions grid as hero
- [X] T013 [US1] Update navigation in `frontend/components/layout/` to highlight Competitions as primary

**Checkpoint**: Homepage shows competitions first; calculator accessible via /calculator

---

## Phase 4: User Story 2 - Improved Dive Breakdown Layout (Priority: P1)

**Goal**: Compact, multi-column dive breakdown with responsive grid

**Independent Test**: View athlete dive breakdown on 1440px+ screen → verify 2+ columns; mobile → verify single column

### Implementation for User Story 2

- [X] T014 [P] [US2] Create DiveBreakdownCard component in `frontend/components/competition/dive-breakdown-card.tsx`
- [X] T015 [US2] Implement responsive grid container (1col mobile, 2col 1440px, 3col 1920px) in `frontend/components/competition/athlete-grid.tsx`
- [X] T016 [US2] Refactor dive breakdown section in `frontend/pages/competitions/[id].tsx` to use new grid layout
- [X] T017 [US2] Add compact row styling (reduced padding, max-width constraints) in dive breakdown table

**Checkpoint**: Dive breakdowns display in responsive multi-column grid; compact rows

---

## Phase 5: User Story 3 - Proper Judge Score Columns (Priority: P1)

**Goal**: Display individual J1-J7 columns with dropped score styling

**Independent Test**: View any dive → verify J1-J7 column headers; dropped scores show strikethrough/muted

### Implementation for User Story 3

- [X] T018 [P] [US3] Create JudgeScoreCell component in `frontend/components/competition/judge-score-cell.tsx`
- [X] T019 [US3] Implement dropped score calculation logic using `frontend/lib/scoring.ts` (calculateEffectiveSum)
- [X] T020 [US3] Update dive table header to show J1-J7 columns dynamically based on judge count in `frontend/components/competition/dive-breakdown-card.tsx`
- [X] T021 [US3] Render JudgeScoreCell for each judge with isDropped prop based on scoring calculation
- [X] T021a [US3] Handle edge case: dives with < 5 judge scores display available scores with warning indicator

**Checkpoint**: Judge scores display in individual columns; dropped scores visually distinguished; invalid data shows warning

---

## Phase 6: User Story 4 - Cumulative and Effective Scoring (Priority: P1)

**Goal**: Show running totals and effective sum calculation per dive

**Independent Test**: View athlete dives → verify Cumul column shows running total; Sum column shows effective score

### Implementation for User Story 4

- [X] T022 [P] [US4] Create CumulativeColumn component in `frontend/components/competition/cumulative-column.tsx`
- [X] T023 [US4] Implement cumulative score calculation in `frontend/lib/scoring.ts` (calculateCumulativeScores)
- [X] T024 [US4] Add Sum and Cumul columns to dive table in `frontend/components/competition/dive-breakdown-card.tsx`
- [X] T025 [US4] Display score breakdown (Sum × DD = Score) in dive row or tooltip

**Checkpoint**: Cumulative scores and effective sums display correctly for all dives

---

## Phase 7: User Story 5 - Penalty Code Display (Priority: P2) ✅

**Goal**: Show penalty indicators with tooltip details when penalties exist

**Independent Test**: View dive with penalty → verify indicator appears; hover shows penalty details

### Implementation for User Story 5

- [X] T026 [P] [US5] Create PenaltyIndicator component in `frontend/components/competition/penalty-indicator.tsx`
- [X] T027 [US5] Integrate PenaltyIndicator into dive row (show when penaltyCode is non-null) in `frontend/components/competition/dive-breakdown-card.tsx`
- [X] T028 [US5] Add penalty tooltip with code and description using shadcn Tooltip

**Checkpoint**: Penalties display with icon/badge and tooltip on affected dives

---

## Phase 8: User Story 6 - Enhanced Chart Visualizations (Priority: P2) ✅

**Goal**: Add 5 interactive chart types for deeper analytics

**Independent Test**: Navigate to charts tab → verify 5 chart types present; hover/click interactions work

### Implementation for User Story 6

- [X] T029 [P] [US6] Create AthleteProgressionChart (line chart) in `frontend/components/charts/athlete-progression.tsx`
- [X] T030 [P] [US6] Create JudgeConsistencyChart (grouped bar chart) in `frontend/components/charts/judge-consistency.tsx`
- [X] T031 [P] [US6] Create ScoreDistributionChart (histogram) in `frontend/components/charts/score-distribution.tsx`
- [X] T032 [P] [US6] Create RoundComparisonRadar (radar chart) in `frontend/components/charts/round-comparison-radar.tsx`
- [X] T033 [P] [US6] Create DifficultyScoreScatter (scatter plot) in `frontend/components/charts/difficulty-vs-score-scatter.tsx`
- [X] T034 [US6] Integrate all charts into charts tab in `frontend/pages/competitions/[id].tsx`
- [X] T035 [US6] Add chart filtering by event for multi-event competitions

**Checkpoint**: Charts tab shows 5 interactive visualization types with event filtering

---

## Phase 9: User Story 7 - CRUD Operations (Priority: P2)

**Goal**: Enable edit, delete operations for dives and competitions

**Independent Test**: Edit dive attributes → verify save persists; delete dive → verify removal without refresh

### Implementation for User Story 7

 [X] T042 [US7] Add athlete name editing (cascades to all dives) via inline edit or modal

**Checkpoint**: Coaches can edit dive attributes, delete dives/competitions with confirmation

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T043 [P] Add keyboard navigation (J/K for athletes, E for edit, Escape to close)
- [X] T044 [P] Add print stylesheet for dive breakdowns in `frontend/styles/globals.css`
- [X] T045 [P] Ensure WCAG 2.1 AA compliance: color contrast, focus indicators, aria labels
- [X] T046 [P] Add loading states and error boundaries for all new components
- [X] T047 Run quickstart.md validation to verify development workflow

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phases 3-9 (User Stories) → Phase 10 (Polish)
                          ↓
              ┌───────────┴───────────┐
              ↓                       ↓
      P1 Stories (US1-4)      P2 Stories (US5-7)
      Must complete first     Can start after P1
```

### User Story Dependencies

| Story | Priority | Can Start After | Notes |
|-------|----------|-----------------|-------|
| US1 (Homepage) | P1 | Phase 2 | Independent - no story dependencies |
| US2 (Layout) | P1 | Phase 2 | Independent - no story dependencies |
| US3 (Judge Columns) | P1 | Phase 2 | Independent - creates JudgeScoreCell used by US4 |
| US4 (Cumulative) | P1 | US3 | Depends on scoring utilities from US3 |
| US5 (Penalties) | P2 | US2 | Uses DiveBreakdownCard from US2 |
| US6 (Charts) | P2 | Phase 2 | Independent - new components |
| US7 (CRUD) | P2 | Phase 2 + US2 | Uses DiveBreakdownCard for edit/delete buttons |

### Parallel Opportunities Per Phase

**Phase 1**: T002, T003 can run in parallel  
**Phase 2**: T004-T006 can run in parallel (different endpoints); T007, T008 parallel  
**Phase 6 (Charts)**: T029-T033 ALL run in parallel (5 independent chart components)  
**Phase 7 (CRUD)**: T036, T037 run in parallel (modal and dialog are independent)  
**Phase 10**: T043-T046 ALL run in parallel

---

## Parallel Example: User Story 6 (Charts)

```bash
# All 5 chart components can be built simultaneously:
Task T029: "Create AthleteProgressionChart in frontend/components/charts/athlete-progression.tsx"
Task T030: "Create JudgeConsistencyChart in frontend/components/charts/judge-consistency-heatmap.tsx"
Task T031: "Create ScoreDistributionChart in frontend/components/charts/score-distribution.tsx"
Task T032: "Create RoundComparisonRadar in frontend/components/charts/round-comparison-radar.tsx"
Task T033: "Create DifficultyScoreScatter in frontend/components/charts/difficulty-vs-score-scatter.tsx"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. ✅ Phase 1: Setup (T001-T003)
2. ✅ Phase 2: Foundational (T004-T008)
3. ✅ Phase 3: US1 - Homepage (T009-T013)
4. ✅ Phase 4: US2 - Layout (T014-T017)
5. ✅ Phase 5: US3 - Judge Columns (T018-T021)
6. ✅ Phase 6: US4 - Cumulative (T022-T025)
7. **STOP & VALIDATE**: MVP complete - core viewing experience works
8. Deploy/demo to stakeholders

### Incremental Delivery (P2 Stories)

9. Phase 7: US5 - Penalties (T026-T028)
10. Phase 8: US6 - Charts (T029-T035)
11. Phase 9: US7 - CRUD (T036-T042)
12. Phase 10: Polish (T043-T047)
13. Full feature complete

---

## Notes

- **[P]** tasks = different files, no dependencies within same phase
- **[USx]** label maps task to user story for traceability
- P1 stories (US1-4) should complete before P2 stories
- All 5 chart components (T029-T033) can be built in parallel
- Commit after each task or logical group
- Run `npm run typecheck` after each component to catch type errors early
