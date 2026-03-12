# API Documentation

This document describes the current Bun API under [`apps/api`](apps/api).

Base URL:
- local: `http://127.0.0.1:4101`

### Runtime
Start the API with:
```bash
bun run dev:api
```

### Response Format
- JSON for all routes
- permissive CORS enabled for local development

## Health

### `GET /health`
Returns process status.

Example response:
```json
{
  "status": "ok",
  "service": "diving-analytics-api",
  "extractorPath": "/abs/path/worker/extract_pdf.py"
}
```

## Dashboard

### `GET /dashboard`
Returns the overview payload used by the dashboard.

Includes:
- recent competitions
- top athletes
- top clubs
- overall totals

## Competitions

### `GET /competitions`
Returns the competition directory list.

Typical fields:
- `id`
- `name`
- `location`
- `date`
- `totalDives`
- `totalAthletes`
- `totalEvents`
- `averageDiveScore`
- `winningScore`

### `GET /competitions/:id`
Returns the competition workspace payload.

Includes:
- `competition`
- `athletes`
- `entries`
- `eventSummaries`
- `dives`

Important notes:
- athlete ids are canonical profile ids
- synchro entries preserve both diver names
- split judge arrays are returned where available:
  - `executionScores`
  - `synchronizationScores`

## Athletes

### `GET /athletes`
Returns the athlete directory list.

Typical fields:
- `id`
- `name`
- `birthYear`
- `latestClub`
- `competitionCount`
- `diveCount`
- `bestTotal`
- `latestCompetitionDate`

### `GET /athletes/:id`
Returns the athlete profile payload.

Includes:
- athlete identity
- club history
- latest competition
- event family statistics
- best dive by event family
- partner statistics
- competition history
- dive history

## Clubs

### `GET /clubs`
Returns the club directory list.

Typical fields:
- `slug`
- `name`
- `athleteCount`
- `competitionCount`
- `bestTotal`
- `latestCompetitionDate`

### `GET /clubs/:slug`
Returns the club profile payload.

Includes:
- club summary
- athlete roster
- event family coverage
- recent competitions
- top results
- recent dives

## Analytics

### `POST /analytics/score`
Calculates a score using the currently supported rulesets.

Supported panel shapes:
- individual `5J`
- individual `7J`
- synchro `9J`
- synchro `11J`

Example individual request:
```json
{
  "eventType": "individual",
  "scores": [7.0, 7.5, 8.0, 7.5, 8.5],
  "difficulty": 1.7
}
```

Example synchro request:
```json
{
  "eventType": "synchro",
  "executionScores": [6.0, 6.5, 7.0, 5.0],
  "synchronizationScores": [6.0, 6.5, 6.5, 6.5, 6.5],
  "difficulty": 2.6
}
```

### `POST /analytics/statistics`
Computes aggregate statistics for a score array.

Example request:
```json
{
  "scores": [6.5, 7.0, 7.5, 7.0, 6.5]
}
```

## Ingestion

### `POST /ingestions/pdf`
Imports a PDF result sheet through the Python extractor, persists the competition, and returns an intake review.

Multipart form fields:
- `file`: required PDF file

Example:
```bash
curl -X POST http://127.0.0.1:4101/ingestions/pdf \
  -F "file=@20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf"
```

Response includes:
- `competitionId`
- `extraction`
- `review`
- `competition`

The `review` object contains:
- `warnings`
- `quality`
- `eventCoverage`

## Notes
- There is no Swagger UI in the current app
- There is no Docker-first API path in the current default workflow
- The historical NestJS API and its docs are no longer the active reference implementation
