#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

detect_host_ip() {
  if [[ -n "${DEV_HOST_IP:-}" ]]; then
    printf '%s\n' "${DEV_HOST_IP}"
    return
  fi

  local detected
  detected="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [[ -z "${detected}" ]]; then
    detected="127.0.0.1"
  fi
  printf '%s\n' "${detected}"
}

HOST_IP="$(detect_host_ip)"

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://${HOST_IP}:3101/v1}"
export NEXT_PUBLIC_COMPUTE_URL="${NEXT_PUBLIC_COMPUTE_URL:-http://${HOST_IP}:5101}"

cd "${ROOT_DIR}/frontend"
exec bun run dev -- -H 0.0.0.0 -p "${FRONTEND_PORT:-3100}"
