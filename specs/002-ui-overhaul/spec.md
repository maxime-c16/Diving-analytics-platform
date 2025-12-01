# Feature Specification: UI Overhaul for Diving Analytics Platform

**Feature Branch**: `002-ui-overhaul`  
**Created**: 2025-12-01  
**Status**: Draft  
**Input**: User description: "UI overhaul focusing on competition-centric design, dive breakdown layout fixes, judge score columns, cumulative scoring, penalty display, enhanced charts, and coach-friendly navigation with CRUD operations."

## Problem Statement

The current UI has several usability and layout issues that impact the diving coach experience:

1. **Page layout confusion** - The main page focuses on score calculator rather than competition analysis, which is the primary use case for coaches
2. **Dive breakdown row spacing** - Excessive vertical spacing wastes screen real estate; multi-column layout needed for large screens
3. **Judge score display** - Scores grouped as `[s1, s2, ..., s7]` instead of proper J1-J7 columns
4. **Missing cumulative scoring** - No running sum, no "effective score" (after drops), no DD-applied calculation display
5. **No penalty representation** - Penalty codes from PDF extraction not displayed
6. **Limited chart visualizations** - Needs more creative, interactive, and coach-relevant analytics
7. **Missing CRUD operations** - No ability to edit, correct, or delete competition/dive data

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Competition-First Homepage (Priority: P1)

As a diving coach, I want the main page to prioritize competition viewing so that I can quickly access my athletes' performance data without navigating through unnecessary tabs.

**Why this priority**: Coaches use this tool primarily for competition analysis, not manual score calculation. The current homepage buries the core workflow.

**Independent Test**: Can be fully tested by loading the homepage and verifying competitions are prominently displayed. Delivers immediate value by reducing navigation time to competition data.

**Acceptance Scenarios**:

1. **Given** I open the app, **When** the homepage loads, **Then** I should see recent competitions prominently with quick access cards
2. **Given** I'm on the homepage, **When** I look at the navigation, **Then** "Competitions" should be the primary action/focus
3. **Given** I have uploaded competitions, **When** I view the homepage, **Then** I should see summary stats of recent competition performance
4. **Given** I want to use the score calculator, **When** I navigate from the homepage, **Then** I should find it as a secondary accessible feature

---

### User Story 2 - Improved Dive Breakdown Layout (Priority: P1)

As a diving coach analyzing competition results, I want a compact, multi-column dive breakdown so that I can compare multiple athletes on large screens without excessive scrolling.

**Why this priority**: Layout issues make data hard to scan and compare, directly impacting the core analysis workflow.

**Independent Test**: Can be tested by viewing an athlete's dive breakdown on various screen sizes and verifying responsive grid behavior.

**Acceptance Scenarios**:

1. **Given** I'm viewing an athlete's dive breakdown, **When** the screen width is ≥1440px, **Then** dives should display in a responsive grid (2-3 columns max)
2. **Given** I'm viewing dives, **When** I see the breakdown table, **Then** row height should be minimal (no excessive padding)
3. **Given** multiple athletes are expanded, **When** viewing on desktop, **Then** I should be able to see at least 2 athletes' dives side-by-side
4. **Given** I'm on a mobile device, **When** viewing dive breakdowns, **Then** the layout should stack vertically and remain readable

---

### User Story 3 - Proper Judge Score Columns (Priority: P1)

As a diving coach, I want judge scores displayed in separate J1-J7 columns so that I can identify judge-specific scoring patterns and potential bias.

**Why this priority**: Current array display `[6.5, 7.0, ...]` is unreadable and prevents the core analytical use case of identifying judge patterns.

**Independent Test**: Can be tested by viewing any dive with judge scores and verifying individual column display with proper dropped score styling.

**Acceptance Scenarios**:

1. **Given** a dive with 5 judges, **When** viewing the breakdown, **Then** I should see columns J1, J2, J3, J4, J5 with individual scores
2. **Given** a dive with 7 judges, **When** viewing, **Then** J1-J7 columns should all be visible
3. **Given** the table header, **When** rendered, **Then** judge columns should be clearly labeled (J1, J2, etc.)
4. **Given** dropped scores (highest/lowest per FINA rules), **When** displayed, **Then** they should be visually distinguished (strikethrough or muted)

---

### User Story 4 - Cumulative and Effective Scoring (Priority: P1)

As a diving coach, I want to see cumulative scores and the effective judge calculation so that I understand how the final score was derived and can track performance trajectory.

**Why this priority**: Coaches need to understand scoring mechanics to provide feedback; running totals show performance trajectory within competition.

**Independent Test**: Can be tested by viewing an athlete's dives and verifying cumulative column shows running total, and Sum column shows effective score after drops.

**Acceptance Scenarios**:

1. **Given** an athlete's dives, **When** viewing the breakdown, **Then** I should see a "Cumul" column with running total after each dive
2. **Given** a dive's judge scores, **When** processed, **Then** I should see the "Sum" (effective sum after drops: middle 3 for 5 judges, middle 5 for 7)
3. **Given** the sum and DD, **When** displayed, **Then** the calculation (Sum × DD = Final) should be visible or derivable
4. **Given** the rounds view, **When** viewing, **Then** cumulative scores should also appear per athlete

---

### User Story 5 - Penalty Code Display (Priority: P2)

As a diving coach, I want to see penalty codes when present so that I understand any score deductions and can provide appropriate training feedback.

**Why this priority**: Penalties affect final standings and training feedback, but are less frequently encountered than core scoring data.

**Independent Test**: Can be tested by viewing a dive with a penalty code and verifying the indicator appears with tooltip details.

**Acceptance Scenarios**:

1. **Given** a dive with a penalty, **When** displayed, **Then** a penalty indicator/icon should appear in the row
2. **Given** a penalty indicator, **When** hovered/clicked, **Then** I should see the penalty code/description
3. **Given** no penalty on a dive, **When** displayed, **Then** no indicator should appear (clean UI)

---

### User Story 6 - Enhanced Chart Visualizations (Priority: P2)

As a diving coach, I want more creative and interactive charts so that I can gain deeper insights into athlete and competition performance beyond basic statistics.

**Why this priority**: Current charts are basic; enhanced analytics add value but are not blocking core functionality.

**Independent Test**: Can be tested by viewing the charts tab and interacting with each new visualization type.

**Acceptance Scenarios**:

1. **Given** the charts tab, **When** viewed, **Then** I should see at least 5 different visualization types
2. **Given** chart data, **When** interacting, **Then** I should be able to hover for details and click to filter
3. **Given** athlete performance over rounds, **When** visualized, **Then** I should see progression/regression trends
4. **Given** judge scoring, **When** visualized, **Then** I should see judge consistency comparisons

---

### User Story 7 - CRUD Operations for Competitions/Dives (Priority: P2)

As a diving coach, I want to edit, correct, or delete competition and dive data so that I can fix OCR errors or update records without re-uploading.

**Why this priority**: OCR is imperfect; coaches need to correct data, but this is a refinement workflow not blocking initial analysis.

**Independent Test**: Can be tested by editing a dive's attributes, saving, and verifying the change persists.

**Acceptance Scenarios**:

1. **Given** a dive with an OCR error, **When** I click edit, **Then** I should be able to modify dive code, scores, DD, etc.
2. **Given** an erroneous competition, **When** I want to delete, **Then** I should have a confirmation-protected delete option
3. **Given** an athlete name misspelled, **When** I edit, **Then** the change should reflect across all their dives
4. **Given** successful edits, **When** saved, **Then** the UI should update immediately without page refresh

---

### Edge Cases

- What happens when a dive has < 5 judge scores (invalid data)? → Display available scores with warning indicator
- How does the UI handle mixed 5-judge and 7-judge events in the same competition? → Dynamic column count per dive
- What happens when cumulative calculation doesn't match the imported final score? → Show discrepancy indicator
- How are very long athlete names handled in compact layouts? → Truncate with ellipsis, full name on hover
- What if penalty codes are in different languages (French)? → Display as-is with optional translation lookup
- How does the chart respond to very few data points (< 5 dives)? → Show simplified visualization with "limited data" notice

## Requirements *(mandatory)*

### Functional Requirements

**Layout & Navigation**
- **FR-001**: Homepage MUST prioritize competition list/cards over score calculator
- **FR-002**: Score calculator SHOULD be accessible via dedicated `/calculator` page
- **FR-003**: Navigation MUST include: Competitions (primary), Calculator, Analytics/Insights
- **FR-004**: Layout MUST support responsive design (mobile to 4K displays)

**Dive Breakdown**
- **FR-005**: Dive breakdown table MUST display with max-width rows to prevent excessive stretching
- **FR-006**: On screens ≥1440px, athlete dive breakdowns SHOULD display in multi-column grids
- **FR-007**: Judge scores MUST be displayed in separate columns (J1, J2, ..., J7) instead of array format
- **FR-008**: Dropped scores (highest/lowest per FINA rules) MUST be visually distinguished (strikethrough/muted)
- **FR-009**: A "Sum" column MUST show the effective score (sum of middle judges after drops)
- **FR-010**: A "Cumul" column MUST show running total score after each dive
- **FR-011**: The score breakdown (Sum × DD = Score) SHOULD be visible or easily derivable

**Penalties**
- **FR-012**: Penalty indicators MUST appear when penalty code is present on a dive
- **FR-013**: Penalty details SHOULD be accessible via hover tooltip or expandable row

**Charts & Visualizations**
- **FR-014**: Charts tab MUST include at least 5 visualization types
- **FR-015**: Charts MUST be interactive (hover tooltips, click to filter where applicable)
- **FR-016**: Visualizations SHOULD include: athlete progression, judge consistency, score distribution, round comparison, difficulty-vs-score correlation
- **FR-017**: Charts SHOULD support event-level filtering for multi-event competitions

**CRUD Operations**
- **FR-018**: Edit functionality MUST be available for: dive code, judge scores, DD, final score, athlete name
- **FR-019**: Delete functionality MUST be available for dives and competitions with confirmation dialog
- **FR-020**: All changes MUST persist to database immediately
- **FR-021**: UI MUST reflect changes without requiring full page refresh (optimistic or refetch)

### Non-Functional Requirements

- **NFR-001**: Page load time MUST be < 2 seconds for competition detail view (up to 50 athletes)
- **NFR-002**: Chart rendering MUST complete within 500ms for up to 500 data points
- **NFR-003**: UI SHOULD be accessible (WCAG 2.1 AA compliance) - color contrast, keyboard navigation
- **NFR-004**: Mobile view MUST remain usable (minimum 375px width)
- **NFR-005**: Edit operations MUST complete within 1 second (API round-trip)

### Key Entities *(modified/extended)*

- **DiveResult** (extended): Now includes `effectiveSum`, `droppedJudgeIndices[]`, `cumulativeScore`, `penaltyCode`, `penaltyDeduction`
- **AthleteResult** (extended): Now includes `cumulativeScores[]` for per-dive running totals
- **RoundData** (extended): Now includes cumulative scores per athlete for round-by-round analysis
- **JudgeStats** (new): Represents per-judge scoring statistics for consistency analysis

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Coaches can access competition details within 2 clicks from homepage (reduced from current 3+ clicks)
- **SC-002**: Dive breakdown displays at least 2 athletes side-by-side on 1440px+ screens
- **SC-003**: 100% of judge scores display in individual J1-J7 columns with dropped scores visually marked
- **SC-004**: Cumulative score column shows accurate running totals for all athletes
- **SC-005**: Penalty indicators appear on all dives with non-null penalty codes
- **SC-006**: Charts tab includes 5+ distinct visualization types with interactive elements
- **SC-007**: Coaches can edit and save dive attributes within 3 clicks
- **SC-008**: UI updates reflect changes within 1 second without page refresh
- **SC-009**: All pages load within 2 seconds on standard broadband connection
- **SC-010**: Mobile users can complete core workflows (view standings, view dives) without horizontal scrolling

## Assumptions

- Backend API exists for PATCH operations on dives (confirmed: `/api/ingestion/dive/:id`)
- DELETE endpoints will be added for dives and competitions
- Penalty codes are extracted from PDFs and stored in database (may require worker update)
- FINA scoring rules (5 or 7 judges, drop highest/lowest) are the standard to follow
- Recharts library is sufficient for all planned chart types
