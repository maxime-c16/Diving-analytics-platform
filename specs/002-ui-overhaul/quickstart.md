# Quickstart: UI Overhaul Development

**Last Updated**: 2025-12-01

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

## Setup

### 1. Clone and checkout feature branch

```bash
git checkout -b 002-ui-overhaul 001-diving-analytics-mvp
```

### 2. Start development environment

```bash
# From repository root
make up  # or: docker-compose up -d

# Verify services
make logs  # Check all services are running
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Start frontend dev server

```bash
npm run dev
# Opens at http://localhost:3000
```

## Directory Structure for New Components

```bash
# Create new component directories
mkdir -p frontend/components/competition
mkdir -p frontend/components/charts
```

### Competition Components (to create)

| File | Purpose |
|------|---------|
| `competition/dive-breakdown-card.tsx` | Compact athlete dive display with grid layout |
| `competition/judge-score-cell.tsx` | Individual judge score with dropped styling |
| `competition/cumulative-column.tsx` | Running total display component |
| `competition/penalty-indicator.tsx` | Penalty icon with tooltip |
| `competition/edit-dive-modal.tsx` | Modal for editing dive data |
| `competition/delete-confirm-dialog.tsx` | Confirmation dialog for deletions |

### Chart Components (to create)

| File | Purpose |
|------|---------|
| `charts/athlete-progression.tsx` | Line chart: scores over rounds |
| `charts/judge-consistency-heatmap.tsx` | Bar/heatmap: judge scoring variance |
| `charts/score-distribution.tsx` | Histogram: score frequency |
| `charts/round-comparison-radar.tsx` | Radar: round metrics comparison |
| `charts/difficulty-vs-score-scatter.tsx` | Scatter: DD vs final score |

## Key Files to Modify

### Homepage Refactor

```typescript
// frontend/pages/index.tsx
// - Remove score calculator as primary content
// - Add competition list/cards as hero section
// - Add "Recent Competitions" quick access
```

### New Calculator Page

```typescript
// frontend/pages/calculator.tsx (NEW)
// - Move score calculator UI from index.tsx
// - Keep as standalone utility page
```

### Competition Detail Enhancements

```typescript
// frontend/pages/competitions/[id].tsx
// - Replace dive breakdown table with DiveBreakdownCard grid
// - Add judge column headers (J1-J7)
// - Add cumulative score column
// - Add penalty indicators
// - Add edit/delete buttons
// - Enhance charts tab with new visualizations
```

### API Client Extensions

```typescript
// frontend/lib/api.ts
// - Add deleteDive(diveId: number)
// - Add deleteCompetition(competitionId: number)
// - Add updateAthlete(athleteId: number, updates)
// - Add getJudgeStats(competitionId: string)
```

### Scoring Utilities (NEW)

```typescript
// frontend/lib/scoring.ts (NEW)
// - calculateEffectiveSum(judgeScores: number[]): ScoreBreakdown
// - calculateCumulativeScores(dives: DiveResult[]): number[]
// - formatScoreBreakdown(breakdown: ScoreBreakdown): string
```

## Development Workflow

### 1. Component Development

```bash
# Work on one component at a time
# Start with base components, then composites

# Order of development:
# 1. JudgeScoreCell (atomic)
# 2. PenaltyIndicator (atomic)
# 3. CumulativeColumn (atomic)
# 4. DiveBreakdownCard (composite)
# 5. EditDiveModal (feature)
# 6. DeleteConfirmDialog (feature)
# 7. Chart components (independent)
```

### 2. Testing

```bash
# Run Playwright tests
cd tests/frontend
npm test

# Run specific test file
npx playwright test test_ui_overhaul.spec.ts
```

### 3. Type Checking

```bash
cd frontend
npm run typecheck  # or: npx tsc --noEmit
```

## API Endpoints to Implement (Backend)

### Priority: P1 - Required for CRUD

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/ingestion/dive/:id` | PATCH | ✅ Exists |
| `/api/ingestion/dive/:id` | DELETE | ❌ Needed |
| `/api/ingestion/competition/:id` | DELETE | ❌ Needed |
| `/api/ingestion/athlete/:id` | PATCH | ❌ Needed |

### Priority: P2 - Nice to have

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/ingestion/competition/:id/judge-stats` | GET | ❌ Optional |

## Environment Variables

```bash
# frontend/.env.local (if needed)
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_COMPUTE_URL=http://localhost:5001
```

## Styling Guidelines

### Tailwind Classes for New Components

```tsx
// Compact table rows
<tr className="hover:bg-muted/50 h-10">

// Judge score columns
<th className="text-center w-10 px-1 text-xs font-medium text-muted-foreground">J1</th>

// Dropped score styling
<td className="text-center text-muted-foreground/50 line-through">6.5</td>

// Cumulative column
<td className="text-right font-semibold text-primary">123.45</td>

// Penalty indicator
<Badge variant="destructive" className="h-5 w-5 p-0">⚠</Badge>

// Multi-column grid for athletes
<div className="grid gap-4 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
```

### Dark Mode Support

All new components should use Tailwind's dark mode classes or CSS variables:

```tsx
// Use semantic colors
className="text-foreground bg-background"
className="border-border"
className="text-muted-foreground"

// Or explicit dark variants
className="text-gray-900 dark:text-gray-100"
```

## Common Tasks

### Add a new shadcn/ui component

```bash
cd frontend
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add badge
```

### Recharts Component Pattern

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function MyChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## Troubleshooting

### API not responding

```bash
# Check backend container
docker-compose logs backend

# Restart services
make restart
```

### TypeScript errors

```bash
# Regenerate types
cd frontend
npm run typecheck

# Check for missing dependencies
npm ls
```

### Styles not updating

```bash
# Restart Next.js dev server
# Ctrl+C then npm run dev

# Clear Next.js cache
rm -rf .next
npm run dev
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Recharts Documentation](https://recharts.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [FINA Diving Rules](https://www.worldaquatics.com/rules)
