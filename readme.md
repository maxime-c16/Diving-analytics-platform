## Diving Analytics Platform

End-to-end system for ingesting, computing, and analyzing competitive diving results.

### Core Components
- **Backend (NestJS)**: Scoring API, ingestion (CSV + PDF OCR), persistence (MariaDB).
- **Worker (Python)**: PDF → OCR → structured dive extraction using Tesseract (`eng+fra`).
- **Compute Engine (Python)**: Advanced analytics (statistics, judge consistency, predictions).
- **Frontend (Next.js)**: Upcoming dashboard for exploration (Phase 5).
- **Nginx**: Reverse proxy exposing unified `/api` namespace.

### Key Features
- FINA-compliant score calculation (5 or 7 judges, auto DD lookup).
- CSV ingestion with flexible headers and validation.
- PDF OCR pipeline with dive code error correction (e.g. `52114` → `5211A`).
- Automatic difficulty & final score computation when missing.
- Confidence scoring for OCR extraction quality.

### Quick Start
```bash
docker compose up -d
open http://localhost/api/docs
```

### Sample CSV Ingestion
```bash
curl -X POST http://localhost/api/ingestion/upload/csv \
	-F "file=@scripts/sample-competition.csv" \
	-F "competitionName=Test Open 2025" \
	-F "eventType=3m"
```

### Sample PDF Upload
```bash
curl -X POST http://localhost/api/ingestion/upload/pdf \
	-F "file=@'20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf'" \
	-F "eventType=3m"
```

### Environment Variables (excerpt)
- `WORKER_URL` (backend) → `http://worker-service:8080`
- `API_BASE_URL` (worker) → `http://api-service:3000`

### Roadmap (Excerpt)
- ✅ Scoring, Analytics, Ingestion, OCR
- 🔄 Dashboard UI
- ⏳ Auth & Optimization

See `API_DOCS.md` for complete endpoint reference.
