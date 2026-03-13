## Diving Analytics Platform

Competition intelligence for diving result sheets, athlete profiling, club analysis, and dive-level scoring review.

### Current Product Stage
- Bun API with SQLite persistence
- Astro application shell with React workspaces
- Python PDF extractor reused from the original OCR pipeline
- Canonical product surfaces:
  - dashboard overview
  - competition workspace
  - athlete directory and athlete profile
  - athlete technique workspace
  - club directory and club profile
  - PDF result intake and extraction review

The current application lives under `apps/api` and `apps/web`. The older `backend/`, `frontend/`, Docker, and microservice-era assets remain in the repository only as migration history.

### Repository Layout
- [`apps/api`](apps/api): Bun HTTP API, SQLite access, analytics aggregation, import pipeline
- [`apps/web`](apps/web): Astro shell with React views and client-side navigation
- [`worker/extract_pdf.py`](worker/extract_pdf.py): PDF extraction entrypoint
- [`scripts/smoke-greenfield.mjs`](scripts/smoke-greenfield.mjs): browser smoke test used locally and in CI

### Run The App
```bash
bun install
bun run dev:api
bun run dev:web
```

Default local URLs:
- Web: `http://127.0.0.1:4100`
- API: `http://127.0.0.1:4101`

LAN access uses the same ports on your machine IP.

### Core Product Workflows
1. Upload a PDF result sheet from `/upload`
2. Review the extraction summary, warnings, and event coverage before trusting the import
3. Open the imported competition in the competition workspace
4. Drill down by event, athlete or pair, club, and exact dive
5. Open athlete profiles, club profiles, and technique workspaces through deep links and breadcrumbs
6. Jump between competition, athlete, club, and dive-level contexts without rebuilding filters manually

### Main Web Routes
- `/`: overview dashboard
- `/upload`: results intake
- `/competitions`: competition directory and competition workspace
- `/athletes`: athlete directory
- `/athletes/:id`: athlete profile
- `/athletes/:id/technique`: athlete dive-group and code-analysis workspace
- `/clubs`: club directory
- `/clubs/:slug`: club profile

### Main API Routes
- `GET /health`
- `GET /dashboard`
- `GET /competitions`
- `GET /competitions/:id`
- `GET /athletes`
- `GET /athletes/:id`
- `GET /clubs`
- `GET /clubs/:slug`
- `POST /analytics/score`
- `POST /analytics/statistics`
- `POST /ingestions/pdf`

See [`API_DOCS.md`](API_DOCS.md) for examples and payload notes.

### Feature Coverage
- Competition workspace
  - event navigator
  - event overview
  - athlete or pair focus
  - club focus
  - full ledger with exact dive deep-linking
  - official dropped-score visualization
- Athlete profile
  - identity and club history
  - best totals by event family
  - best dive by event family
  - latest competition context
  - synchro partner summary
  - dive history with exact competition links
- Athlete technique workspace
  - official dive-group breakdown based on the World Aquatics code structure
  - code-level sortable tables
  - search by code or structure
  - recent technical log with exact ledger deep-links
  - direct return into highlighted competition ledger rows
- Club profile
  - roster table
  - recent competitions
  - top results
  - recent dives
  - exact competition deep-links

### Navigation Model
- Shared breadcrumbs are available across overview, intake, competition, athlete, club, and technique routes
- Competition workspace adds local context crumbs for event, club focus, athlete focus, and ledger states
- Athlete and club profiles expose `Quick paths` back into the most relevant live competition context
- Dive-level deep links open the exact competition state, auto-scroll, and highlight the targeted row

### Data And Rules Notes
- Competition dates are normalized to English for sorting and display
- Athlete and club identities are normalized during import and aggregation to reduce duplicates
- Synchro parsing preserves both diver names and separates execution and synchronization judges
- Dive codes are parsed against the official World Aquatics group model:
  - Forward
  - Back
  - Reverse
  - Inward
  - Twisting
  - Armstand
- The athlete technique workspace also handles flying dives, directional components, and code-position parsing
- Score dropping follows official World Aquatics panel rules where currently supported in the app:
  - individual `5J`
  - individual `7J`
  - synchro `9J`
  - synchro `11J`

### Example Import
```bash
curl -X POST http://127.0.0.1:4101/ingestions/pdf \
  -F "file=@20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf"
```

### Validation Commands
```bash
bun run check:web
bun run smoke:web
python3 -m py_compile worker/extract_pdf.py
```

The smoke flow validates the live navigation path through the running app, including profile and competition deep-link behavior.

### CI
Current CI is Bun-first and validates the live app path:
- dependency install with Bun
- OCR parser syntax
- Astro checks
- browser smoke test against the running API and web app

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Known Constraints
- `bun run build:web` is not currently a supported validation target because the Astro app uses server-rendered pages and no production adapter is configured yet
- The old Docker and microservice files are not the recommended development path
- Historical documentation under `specs/`, `TASKS.md`, `BUG_REPORT.md`, and Docker-oriented files reflects earlier project phases and should not be treated as the active architecture
- The technique workspace currently derives its breakdown from the athlete profile payload rather than a dedicated technique API route

### Validation Dataset
The current app has been exercised against:
- `20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf`
- `detailed results PSV MDC 2026.pdf`
