# Implementation Plan: UI Overhaul for Diving Analytics Platform

**Branch**: `002-ui-overhaul` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ui-overhaul/spec.md`

## Summary

Refactor the Diving Analytics Platform UI to be competition-centric with enhanced dive breakdown visualization, proper judge score columns (J1-J7), cumulative scoring display, penalty indicators, improved charts, and full CRUD operations. The overhaul transforms the current score-calculator-focused homepage into a competition browsing experience optimized for diving coaches analyzing competition results.

## Technical Context

**Language/Version**: TypeScript 5.x, JavaScript ES2022  
**Primary Dependencies**: React 18.x, Next.js 14.x (Pages Router), Tailwind CSS 3.x, shadcn/ui, Recharts 2.x, Framer Motion  
**Storage**: MySQL 8.x via NestJS backend  
**Testing**: Playwright (E2E), Jest (unit)  
**Target Platform**: Web (responsive: 375px mobile to 4K desktop)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: <100ms perceived response for UI interactions, <500ms data fetch, 60fps animations  
**Constraints**: WCAG 2.1 AA accessibility, dark/light theme support, print stylesheet support  
**Scale/Scope**: ~15 competitions actively viewed, 7 new components, 5 new chart types, 4 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASSED (Constitution not configured - using standard practices)

| Gate | Status | Notes |
|------|--------|-------|
| Architecture Patterns | ✅ Pass | Uses existing monorepo structure, no new patterns introduced |
| Code Organization | ✅ Pass | New components follow existing shadcn/ui patterns |
| Technology Choices | ✅ Pass | All tech already in stack (React, Recharts, Tailwind) |
| Testing Requirements | ✅ Pass | Playwright E2E tests planned for all new features |
| Accessibility | ✅ Pass | WCAG 2.1 AA compliance specified in requirements |

## Project Structure

### Documentation (this feature)

\`\`\`text
specs/002-ui-overhaul/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - COMPLETE (8 topics resolved)
├── data-model.md        # Phase 1 output - COMPLETE (extended types defined)
├── quickstart.md        # Phase 1 output - COMPLETE (dev setup guide)
├── contracts/           # Phase 1 output - COMPLETE (api-extensions.yaml)
│   └── api-extensions.yaml
├── checklists/          # Validation checklists
│   └── requirements.md  # COMPLETE (all passed)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
\`\`\`

### Source Code (repository root)

\`\`\`text
frontend/
├── components/
│   ├── competition/          # NEW: Competition-specific components
│   │   ├── dive-breakdown-card.tsx
│   │   ├── judge-score-cell.tsx
│   │   ├── cumulative-column.tsx
│   │   ├── penalty-indicator.tsx
│   │   ├── edit-dive-modal.tsx
│   │   └── delete-confirm-dialog.tsx
│   ├── charts/               # NEW: Enhanced chart components
│   │   ├── athlete-progression.tsx
│   │   ├── judge-consistency.tsx
│   │   ├── score-distribution.tsx
│   │   ├── round-comparison-radar.tsx
│   │   └── difficulty-vs-score-scatter.tsx
│   ├── ui/                   # Existing shadcn/ui components
│   └── layout/               # Existing layout components
├── lib/
│   ├── api.ts                # EXTEND: Add delete endpoints
│   ├── utils.ts              # Existing utilities
│   ├── types.ts              # NEW: Extended type definitions
│   └── scoring.ts            # NEW: Score calculation utilities
├── pages/
│   ├── index.tsx             # REFACTOR: Competition-first homepage
│   ├── calculator.tsx        # NEW: Relocated score calculator
│   └── competitions/
│       └── [id].tsx          # REFACTOR: Enhanced dive breakdown

backend/
├── src/
│   ├── entities/             # Existing entities
│   ├── modules/
│   │   └── ingestion/        # EXTEND: Add delete endpoints
│   └── common/               # Existing shared code

tests/
├── frontend/
│   ├── test_ui_overhaul.spec.ts     # NEW: E2E tests for UI changes
│   └── test_analysis_panel.spec.ts  # Existing tests
└── backend/
    └── test_ingestion_e2e.e2e-spec.ts  # EXTEND: Add delete tests
\`\`\`

**Structure Decision**: Web application structure - existing monorepo with \`frontend/\`, \`backend/\`, \`worker/\` directories. New components placed in logical subdirectories (\`frontend/components/competition/\`, \`frontend/components/charts/\`) following existing patterns.

## Complexity Tracking

> No violations detected. Design follows existing patterns:

| Area | Decision | Justification |
|------|----------|---------------|
| Component Organization | Subdirectories for feature groups | Matches existing \`components/ui/\`, \`components/layout/\` pattern |
| Chart Library | Recharts only | Already integrated, sufficient for all planned visualizations |
| State Management | React hooks + useMemo | No Redux/Zustand needed for this scope |
| API Pattern | REST extensions | Extends existing NestJS ingestion module |

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Research | \`specs/002-ui-overhaul/research.md\` | ✅ Complete |
| Data Model | \`specs/002-ui-overhaul/data-model.md\` | ✅ Complete |
| API Contracts | \`specs/002-ui-overhaul/contracts/api-extensions.yaml\` | ✅ Complete |
| Quickstart | \`specs/002-ui-overhaul/quickstart.md\` | ✅ Complete |
| Requirements Checklist | \`specs/002-ui-overhaul/checklists/requirements.md\` | ✅ Complete |

## Next Steps

1. Run \`/speckit.tasks\` to generate implementation tasks from this plan
2. Begin Phase 2 implementation following the quickstart guide
3. Create atomic components first (JudgeScoreCell, PenaltyIndicator)
4. Build composite components (DiveBreakdownCard)
5. Implement API endpoints (DELETE dive, DELETE competition)
6. Add chart visualizations
7. Run E2E tests to validate
