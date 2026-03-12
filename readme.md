## Diving Analytics Platform

Competition intelligence for diving results, athlete profiles, club analysis, and dive-level scoring review.

### Application Stack
- `apps/api`: Bun API with SQLite persistence
- `apps/web`: Astro application shell with React views
- `worker/extract_pdf.py`: PDF result extraction pipeline with retained OCR correction logic

This is the primary development path for the product. Local work does not require Docker.

### Run The Platform
```bash
bun install
bun run dev:api
bun run dev:web
```

Endpoints:
- Web: `http://localhost:4100`
- API: `http://localhost:4101`

### Core Workflows
- Ingest a competition result sheet from `/upload`
- Review competition, event, athlete, and club workspaces
- Trace dive-level scoring, including dropped-note logic under official World Aquatics judging rules
- Navigate between competition context, athlete profiles, and club profiles without losing focus state

### API Example
```bash
curl -X POST http://localhost:4101/ingestions/pdf \
  -F "file=@'20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf'"
```

### Product Notes
- The platform now runs as a single Bun API plus Astro web client for faster iteration.
- SQLite is the default local datastore.
- Result extraction prefers the PDF text layer first and uses the retained OCR correction path when needed.
- Athlete and club identities are normalized during import and aggregation to reduce duplicate entities.
- Competition dates are normalized to English for consistent sorting and display.

### Validation Dataset
The current application was exercised against:
- `20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf`
- `detailed results PSV MDC 2026.pdf`

### Quality Checks
```bash
bun run check:web
bun run smoke:web
```

### Legacy Services
The original `backend/`, `frontend/`, `compute-engine/`, `worker/`, and Docker assets remain in the repository for migration reference. They are no longer the recommended local development path on this branch.
