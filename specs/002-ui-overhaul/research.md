# Research: UI Overhaul for Diving Analytics Platform

**Created**: 2025-12-01  
**Status**: Complete

## Overview

This document captures research findings for the UI overhaul feature, resolving technical decisions and best practices.

---

## 1. Competition-First Homepage Design

### Decision
Restructure homepage to prioritize competition browsing and quick access to recent results.

### Rationale
- Diving coaches primarily use this tool for competition analysis, not manual score calculation
- Current homepage buries competition access behind tabs
- Score calculator is a utility feature, not the primary workflow

### Alternatives Considered
1. **Dashboard with widgets** - Too complex for current scope; may revisit for v2
2. **Sidebar navigation with landing page** - Adds complexity; current tab-based nav is sufficient
3. **Competition list as hero section** - **CHOSEN**: Simple, direct, matches user priority

### Implementation Approach
- Move score calculator to `/calculator` page
- Homepage displays: recent competitions grid, upload CTA, quick stats
- Keep "Try Calculator" as secondary action

---

## 2. Dive Breakdown Layout

### Decision
Implement CSS Grid with max-width containers and responsive column layout for dive breakdown.

### Rationale
- Current rows stretch full width on large screens, wasting space
- Coaches on 27"+ monitors should see multiple athlete breakdowns side-by-side
- Table rows need compact styling to increase information density

### Best Practices Researched
- **CSS Grid vs Flexbox**: Grid for 2D layouts, Flexbox for 1D - Grid is appropriate here
- **Max-width containers**: Standard pattern is `max-w-md` (448px) to `max-w-xl` (576px) per card
- **Responsive breakpoints**: 
  - `<768px`: Single column, full width
  - `768px-1440px`: Single column with max-width
  - `≥1440px`: 2-column grid
  - `≥1920px`: 3-column grid (optional)

### Implementation Approach
```tsx
// Dive breakdown container
<div className="grid gap-4 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
  {athletes.map(athlete => (
    <DiveBreakdownCard key={athlete.id} athlete={athlete} className="max-w-xl" />
  ))}
</div>
```

---

## 3. Judge Score Column Display

### Decision
Transform `judgeScores[]` array into individual J1-J7 columns with visual distinction for dropped scores.

### Rationale
- Current `[6.5, 7.0, 6.5, ...]` format is hard to scan
- Coaches need to identify judge-specific patterns (e.g., Judge 3 consistently low)
- Dropped scores (highest/lowest) need visual differentiation per FINA rules

### FINA Scoring Rules Researched
- **5 judges**: Drop highest and lowest, sum middle 3
- **7 judges**: Drop 2 highest and 2 lowest, sum middle 5
- Dropped scores still displayed but visually muted

### Implementation Approach
```tsx
// Judge score cell component
interface JudgeScoreCellProps {
  score: number;
  isDropped: boolean;
  judgeIndex: number;
}

const JudgeScoreCell = ({ score, isDropped, judgeIndex }: JudgeScoreCellProps) => (
  <td className={cn(
    "text-center px-2 py-1 font-mono text-sm",
    isDropped && "text-muted-foreground line-through opacity-60"
  )}>
    {score.toFixed(1)}
  </td>
);

// Header row
<tr>
  <th>Round</th>
  <th>Code</th>
  <th>DD</th>
  {Array.from({ length: judgeCount }, (_, i) => (
    <th key={i} className="text-center w-12">J{i + 1}</th>
  ))}
  <th>Sum</th>
  <th>Score</th>
  <th>Cumul</th>
</tr>
```

---

## 4. Cumulative Scoring Calculations

### Decision
Implement client-side cumulative score calculation with display of effective sum and DD application.

### Rationale
- Coaches need to understand how final scores are derived
- Running totals show performance trajectory within competition
- Backend may not always return cumulative data; client-side ensures availability

### Calculation Logic
```typescript
// Effective sum calculation
function calculateEffectiveSum(judgeScores: number[]): { sum: number; droppedIndices: number[] } {
  const sorted = judgeScores.map((score, idx) => ({ score, idx }))
    .sort((a, b) => a.score - b.score);
  
  const dropCount = judgeScores.length === 7 ? 2 : 1; // 7 judges: drop 2 each end
  const dropped = [
    ...sorted.slice(0, dropCount).map(s => s.idx),
    ...sorted.slice(-dropCount).map(s => s.idx),
  ];
  
  const effectiveScores = judgeScores.filter((_, idx) => !dropped.includes(idx));
  return {
    sum: effectiveScores.reduce((a, b) => a + b, 0),
    droppedIndices: dropped,
  };
}

// Cumulative score
function calculateCumulative(dives: DiveResult[]): number[] {
  return dives.reduce<number[]>((acc, dive) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    return [...acc, prev + dive.finalScore];
  }, []);
}
```

### Display Format
| Round | Code | DD | J1 | J2 | J3 | J4 | J5 | Sum | Score | Cumul |
|-------|------|----|----|----|----|----|----|-----|-------|-------|
| 1 | 101B | 1.5 | ~~6.0~~ | 6.5 | 6.5 | 7.0 | ~~7.5~~ | 20.0 | 30.00 | 30.00 |
| 2 | 403C | 2.3 | 7.0 | ~~7.5~~ | 7.0 | ~~6.5~~ | 7.0 | 21.0 | 48.30 | 78.30 |

---

## 5. Penalty Code Handling

### Decision
Add penalty indicator as icon/badge with tooltip for details; extend data model to capture penalty codes.

### Rationale
- Penalties affect final scores and are important for training feedback
- Should not clutter the main table view
- French competition PDFs may include penalty codes in various formats

### Common Diving Penalties (FINA)
- **Failed Dive (0)**: Dive not completed as announced
- **Balk**: Starting motion without completing dive
- **Incorrect Position**: Wrong position letter (e.g., did A instead of B)
- **Point Deductions**: 0.5-2.0 points for minor infractions

### Implementation Approach
```tsx
// Penalty indicator component
const PenaltyIndicator = ({ code, description }: { code: string; description?: string }) => (
  <Tooltip content={description || `Penalty: ${code}`}>
    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
      <AlertTriangle className="h-3 w-3" />
    </Badge>
  </Tooltip>
);

// In dive row
{dive.penaltyCode && <PenaltyIndicator code={dive.penaltyCode} />}
```

### Data Model Extension
```typescript
interface DiveResult {
  // ... existing fields
  penaltyCode?: string;        // e.g., "BALK", "0", "POS"
  penaltyDeduction?: number;   // Points deducted
}
```

---

## 6. Enhanced Chart Visualizations

### Decision
Extend Recharts usage with 5 new visualization types; no new charting library needed.

### Rationale
- Recharts already integrated and sufficient for planned visualizations
- Adding Nivo/Visx would increase bundle size unnecessarily
- Coach needs focus on: progression, consistency, comparison

### Chart Types to Implement

| Chart | Purpose | Recharts Component |
|-------|---------|-------------------|
| Athlete Progression | Score trend over rounds | `<LineChart>` with multiple series |
| Judge Consistency | Scoring variance by judge | `<BarChart>` grouped or heatmap with cells |
| Score Distribution | Histogram of all dive scores | `<BarChart>` with histogram bins |
| Round Comparison | Average/best/worst per round | `<RadarChart>` or `<ComposedChart>` |
| Difficulty vs Score | Scatter of DD vs final score | `<ScatterChart>` |

### Implementation Approach
```tsx
// Athlete progression chart
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={roundData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="round" />
    <YAxis domain={['auto', 'auto']} />
    <Tooltip />
    <Legend />
    {selectedAthletes.map((athlete, idx) => (
      <Line
        key={athlete.id}
        type="monotone"
        dataKey={`athlete_${athlete.id}`}
        stroke={COLORS[idx % COLORS.length]}
        name={athlete.name}
      />
    ))}
  </LineChart>
</ResponsiveContainer>

// Judge consistency (as grouped bar)
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={judgeStats}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="judge" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="mean" fill="#3b82f6" name="Mean Score" />
    <Bar dataKey="std" fill="#f59e0b" name="Std Dev" />
  </BarChart>
</ResponsiveContainer>
```

---

## 7. CRUD Operations

### Decision
Implement CRUD via existing REST patterns with optimistic UI updates.

### Rationale
- Backend already has `PATCH /api/ingestion/dive/:id` endpoint
- Need to add `DELETE` endpoints for dives and competitions
- Optimistic updates improve perceived performance

### API Endpoints Required

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/api/ingestion/dive/:id` | Update dive fields (existing) |
| DELETE | `/api/ingestion/dive/:id` | Delete single dive (NEW) |
| DELETE | `/api/ingestion/competition/:id` | Delete competition + all dives (NEW) |
| PATCH | `/api/ingestion/athlete/:id` | Update athlete name/country (NEW) |

### Implementation Approach
```tsx
// Edit dive modal
const handleSaveDive = async (diveId: number, updates: Partial<DiveResult>) => {
  // Optimistic update
  setCompetitionData(prev => ({
    ...prev,
    athletes: prev.athletes.map(a => ({
      ...a,
      dives: a.dives.map(d => d.id === diveId ? { ...d, ...updates } : d)
    }))
  }));
  
  try {
    await api.updateDive(diveId, updates);
    toast.success('Dive updated');
  } catch (error) {
    // Rollback on error
    fetchData();
    toast.error('Failed to update dive');
  }
};

// Delete confirmation
const handleDeleteDive = async (diveId: number) => {
  if (!confirm('Are you sure? This cannot be undone.')) return;
  
  await api.deleteDive(diveId);
  fetchData();
};
```

---

## 8. Additional UX Improvements Identified

### Keyboard Navigation
- `J`/`K` for next/prev athlete in standings
- `E` to edit selected dive
- `Escape` to close modals
- `1-4` to switch tabs (Standings/Rounds/Charts/Details)

### Mobile Considerations
- Horizontal scroll for judge columns on narrow screens
- Collapsible filter panels
- Touch-friendly edit buttons (min 44px tap target)

### Print Stylesheet
```css
@media print {
  .no-print { display: none; }
  .dive-breakdown { page-break-inside: avoid; }
  .chart-container { max-height: 400px; }
}
```

---

## Summary of Decisions

| Topic | Decision | Status |
|-------|----------|--------|
| Homepage layout | Competition-first with calculator as secondary | ✅ Decided |
| Dive breakdown grid | CSS Grid, max-w-xl cards, responsive columns | ✅ Decided |
| Judge columns | Individual J1-J7 columns with dropped styling | ✅ Decided |
| Cumulative scoring | Client-side calculation, Sum/Score/Cumul columns | ✅ Decided |
| Penalty display | Icon badge with tooltip | ✅ Decided |
| Charts | Extend Recharts, 5 new chart types | ✅ Decided |
| CRUD | REST API, optimistic updates, confirmation dialogs | ✅ Decided |

All NEEDS CLARIFICATION items have been resolved.
