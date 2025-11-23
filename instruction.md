You are assisting in building an MVP for a Data Analysis & Performance Tracking Platform for Competitive Diving, combining sports science, computer vision, data analytics, and web infrastructure.
🎯 Project Objective
Create a platform that:
Automatically ingests raw competition dive sheets (paper scans, CSV exports from diverecorder.co.uk, etc.).
Fully computes results using official FINA rules (1m diving, including judge panel normalization, score drops, rounding logic, dive difficulty coefficient, cumulative).
Extracts all possible performance metrics: per-judge trends, execution deviation, dive consistency, dive category strength/weakness, risk–reward vs difficulty, timing, rank evolution, etc.
Aggregates data over full career, generating automated graphs & analytics dashboards.
Outputs high-performance visuals (social-media-ready athlete card, career progression chart, dive execution quality indicators).
Can integrate with real-time competition tracking, video-analysis (future stage), and AI-based improvement recommendations.
🧠 Implementation Plan (MVP)
Data Collection Pipeline
Input sources: PDF/JPEG dive sheets (OCR), CSV from diverecorder, manual entry optional.
Normalize using schema: event, dive group (100, 200…), position (A/B/C/D), height, coeff, judges scores.
Apply FINA scoring logic: drop highest/lowest, compute sum × coeff.
Analysis Engine (core microservice)
Written in C++ (preferred) or Python (fallback)
Compute:
Full score engine (FINA rules)
Judge deviation index (score vs panel average)
Dive risk profile (difficulty vs execution potential)
Scoring consistency over career
Per-dive position profiling
Back-End API
NestJS (TypeScript) or FastAPI (Python) — microservices architecture.
Expose endpoints for computation, athlete data, pipeline triggers.
Database & Cache
MariaDB → dive records, athlete profiles, competition data
Redis → caching computational results
Infrastructure
Docker Compose setup (provide runnable MVP skeleton)
Services:
nginx (reverse proxy)
api-service
compute-service (C++ exec or Python backend)
mariadb
redis
worker-service for data ingestion
Frontend (initial MVP)
Next.js (TypeScript)
Data visualization using Recharts or ECharts
Dashboard with:
Dive summary tables
Per-dive scatter graph (execution vs difficulty)
Career score evolution
Judge deviation graph
Testing & Data Simulation
Use synthetic data based on actual dive sheet values:
Example: Maxime Cauchy, Elite – 1m, dive series as per sheet.
Write unit tests for full scoring engine validation.
🔧 Tech Stack
Component	Tech
API	NestJS (TS) or FastAPI
Compute Engine	C++17 (pref) or Python
Database	MariaDB
Cache	Redis
Reverse Proxy	nginx
Frontend	Next.js + TypeScript
Containerization	Docker & Docker Compose
PDF/OCR Input	Tesseract OCR
Data Processing	Pandas & NumPy (for Python cases), custom structs (C++)
Pipeline Worker	Python Celery or Go microservice
📚 Documentation Checklist for MVP
Diving scoring logic implementation (FINA Rulebook)
Dive categories & mapping
Judge analysis formula
REST API specs
Docker-compose usage
Local development instructions
Data input examples
Expansion plan (future: video analysis via MediaPipe, tracking algorithms)
🧪 MVP Output Examples
JSON:
{
  "diver": "Maxime Cauchy",
  "event": "Elite - 1m",
  "final_score": 113.25,
  "rank": 6,
  "dives": [
    {"code": "101C", "coeff": 1.2, "scores": [4,4,3,7,3,7,3], "computed": 11.52},
    {...}
  ],
  "judge_variance_index": {...},
  "career_trend": [...],
  "strengths": ["Forward dives", "Rip entries"],
  "weaknesses": ["Twist consistency"],
  "suggested_training_focus": [...]
}
Graphs to generate (as React demos or mockups):
Score per dive timeline
Difficulty vs execution scatter plot
Judge deviation variance graph
Career evolution curve
🚀 Claude Code Tasks
Create runnable Git repo skeleton.
Generate Docker Compose file with service placeholders.
Scaffold backend, compute engine, DB schema, and API routes.
Create frontend baseline with demo graphs.
Add documentation & dev setup with next steps.
Now generate the project structure, Dockerfiles, docker-compose.yml, backend scaffolding, and documentation as explained. Use TS where applicable, and keep compute pipeline architecture modular. Start implementing the basic computational engine.
