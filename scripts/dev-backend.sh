#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3101}"
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3307}"
export DB_USER="${DB_USER:-diver}"
export DB_PASSWORD="${DB_PASSWORD:-divepassword}"
export DB_NAME="${DB_NAME:-diving_db}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6380}"
export WORKER_URL="${WORKER_URL:-http://127.0.0.1:8180}"
export COMPUTE_SERVICE_URL="${COMPUTE_SERVICE_URL:-http://127.0.0.1:5101}"

cd "${ROOT_DIR}/backend"
exec bun run start:dev
