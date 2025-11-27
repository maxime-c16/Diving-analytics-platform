# Quickstart: OCR PDF Parsing Bug Fix Testing

**Created**: 27 November 2025

## Overview

This guide walks through setting up and running tests for the OCR PDF parsing bug fix and UI alignment improvements.

---

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for frontend tests)
- Python 3.11+ (for worker tests)
- pnpm or npm

---

## 1. Start Development Environment

```bash
# From repository root
cd /Users/maximecauchy/workflow/perso/Diving-analytics-platform

# Start all services
docker compose up -d

# Verify services are running
docker compose ps

# Expected services:
# - api-service (NestJS backend)
# - frontend (Next.js)
# - worker-service (Python OCR)
# - postgres
# - redis
```

---

## 2. Extract Ground Truth Data

### Step 2.1: Run OCR on Ground Truth PDF

```bash
# Upload the ground truth PDF to the worker service
curl -X POST \
  http://localhost:8080/process-pdf \
  -F "file=@./20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf" \
  > tests/fixtures/ocr-output-baseline.json
```

### Step 2.2: Review and Correct the Output

1. Open `tests/fixtures/ocr-output-baseline.json`
2. Compare with the original PDF manually
3. Create corrected version as `tests/fixtures/ground-truth-expected.json`

Example fixture structure:
```json
{
  "pdfFileName": "20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf",
  "extractedAt": "2025-11-27T00:00:00Z",
  "events": [
    {
      "name": "Elite - Dames - 3m",
      "height": "3m",
      "athleteCount": 5,
      "athletes": [
        {
          "rank": 1,
          "name": "Camille ROUFFIAC",
          "club": "Kingfisher Club Plongeon Montreuil",
          "birthYear": 2011,
          "totalScore": 199.60,
          "dives": [
            {
              "roundNumber": 1,
              "diveCode": "101B",
              "difficulty": 1.5,
              "judgeScores": [6.5, 7.0, 6.5, 7.0, 6.5],
              "diveScore": 30.00,
              "cumulativeScore": 30.00
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 3. Set Up Test Infrastructure

### Step 3.1: Create Test Directories

```bash
mkdir -p tests/fixtures/sample-pdfs
mkdir -p tests/worker
mkdir -p tests/backend
mkdir -p tests/frontend

# Copy ground truth PDF
cp "./20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf" tests/fixtures/sample-pdfs/
```

### Step 3.2: Install Test Dependencies

**Worker (Python):**
```bash
cd worker
pip install pytest pytest-cov pytest-asyncio
```

**Backend (TypeScript):**
```bash
cd backend
pnpm install --save-dev @nestjs/testing supertest
```

**Frontend (TypeScript):**
```bash
cd frontend
pnpm install --save-dev @testing-library/react @testing-library/jest-dom playwright
```

---

## 4. Run Baseline Tests (Document Current Failures)

### Step 4.1: Worker OCR Tests

Create `tests/worker/test_ocr_extraction.py`:

```python
import pytest
import json
from pathlib import Path

# Load ground truth
FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
GROUND_TRUTH = json.loads((FIXTURES_DIR / "ground-truth-expected.json").read_text())

def test_dive_code_extraction():
    """Test that dive codes are correctly extracted."""
    # TODO: Load OCR output and compare dive codes
    pass

def test_judge_score_extraction():
    """Test that judge scores are correctly extracted."""
    pass

def test_athlete_association():
    """Test that dives are associated with correct athletes."""
    pass

def test_round_number_assignment():
    """Test that round numbers are correctly assigned."""
    pass

def test_event_detection():
    """Test that events (Elite - Dames - 3m) are detected."""
    pass
```

Run tests:
```bash
cd worker
pytest tests/ -v --tb=short
```

### Step 4.2: Backend Integration Tests

Create `tests/backend/test_ingestion_e2e.ts`:

```typescript
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('Ingestion E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup test app
  });

  it('should import PDF data correctly', async () => {
    // TODO: Test PDF import endpoint
  });

  it('should return correct competition data', async () => {
    // TODO: Test competition data endpoint
  });
});
```

### Step 4.3: Frontend Component Tests

Create `tests/frontend/test_analysis_panel.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import CompetitionDetailPage from '../../frontend/pages/competitions/[id]';

describe('Analysis Panel', () => {
  it('renders standings table with correct columns', () => {
    // TODO: Test table column alignment
  });

  it('renders rounds table with athlete names', () => {
    // TODO: Test round view rendering
  });

  it('handles null values gracefully', () => {
    // TODO: Test null safety
  });
});
```

---

## 5. Implement Fixes

### Fix Priority Order:

1. **UI Array Mutation Bug** (Critical, easy fix)
   - File: `frontend/pages/competitions/[id].tsx`
   - Line 387: Change `.sort()` to `[...array].sort()`

2. **UI Null Checks** (High, easy fix)
   - File: `frontend/pages/competitions/[id].tsx`
   - Lines 388-394: Add nullish coalescing

3. **OCR Letter Corrections** (High, moderate effort)
   - File: `worker/worker.py`
   - Extend `OCR_ERROR_CORRECTIONS` mapping

4. **Dive Breakdown Layout** (Medium, moderate effort)
   - File: `frontend/pages/competitions/[id].tsx`
   - Convert flex layout to table

5. **Additional Test Coverage** (Medium, ongoing)
   - Add tests for edge cases

---

## 6. Validate Fixes

### Run Full Test Suite

```bash
# Worker tests
cd worker && pytest -v

# Backend tests
cd backend && pnpm test:e2e

# Frontend tests
cd frontend && pnpm test

# Or run all via Docker
docker compose run --rm worker pytest
docker compose run --rm api npm run test:e2e
```

### Manual Validation

1. Upload ground truth PDF via UI
2. Navigate to competition detail page
3. Verify:
   - [ ] Standings tab shows correct rankings
   - [ ] Rounds tab shows aligned columns
   - [ ] Charts render correctly
   - [ ] Expanded dive breakdown aligns

---

## 7. Continuous Integration

Add to `.github/workflows/test.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd worker
          pip install -r requirements.txt
          pip install pytest pytest-cov
          pytest tests/ -v

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          cd backend
          npm ci
          npm run test:e2e
```

---

## Common Commands Reference

| Task | Command |
|------|---------|
| Start services | `docker compose up -d` |
| View logs | `docker compose logs -f worker-service` |
| Run worker tests | `cd worker && pytest -v` |
| Run backend tests | `cd backend && pnpm test` |
| Run frontend tests | `cd frontend && pnpm test` |
| Debug OCR output | `curl http://localhost:8080/debug-ocr -F "file=@sample.pdf"` |
| Check worker health | `curl http://localhost:8080/health` |
| Reset database | `docker compose down -v && docker compose up -d` |

---

## Troubleshooting

### OCR returns empty results
- Check Tesseract is installed in worker container
- Verify PDF is not password-protected
- Try increasing DPI: `DPI=400 docker compose up -d worker-service`

### UI shows undefined values
- Check browser console for errors
- Verify API response structure matches expected types
- Run API health check: `curl http://localhost/api/health`

### Tests fail with database errors
- Ensure PostgreSQL is running: `docker compose ps postgres`
- Check migrations: `cd backend && npm run migration:run`
