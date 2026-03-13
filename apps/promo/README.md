# Promo Workspace

Remotion presentation package for the commercial product walkthrough.

## What it contains
- `DivingAnalyticsCommercial`: 56-second 1080p commercial composition
- `DivingAnalyticsPoster`: still poster built from the same visual language

## Storyboard
1. Product opening
2. Real workflow map
3. Results intake
4. Competition workspace
5. Athlete profiles
6. Technique workspace
7. Club intelligence
8. Closing value proposition

The presentation uses real screenshots captured from the live app routes, including:
- Maxime CAUCHY
- Mathis Pruvost
- Fanny Bayle
- Sara Garrault
- Emile Cartier

## Commands
From the repository root:

```bash
bun install
bun run dev:promo
bun run render:promo
```

Directly from this workspace:

```bash
bun run dev
bun run render
bun run still
```

Outputs:
- `out/diving-analytics-commercial.mp4`
- `out/diving-analytics-poster.png`

## Assets
Screenshots live under:
- `public/shots`

They were captured from the running app to keep the presentation tied to the real product flow rather than mocked UI.
