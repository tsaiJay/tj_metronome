#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build"
ENV_FILE="${BUILD_DIR}/env.config"

IMAGE_NAME="${IMAGE_NAME:-tj_metronome:dev}"
CONTAINER_NAME="${CONTAINER_NAME:-tj_metronome-local}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

PROD_PORT="${PROD_PORT:-8080}"

docker build -f "${BUILD_DIR}/Dockerfile" -t "${IMAGE_NAME}" "${ROOT_DIR}"

if docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | read -r _; then
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

docker run -d --restart unless-stopped \
  --name "${CONTAINER_NAME}" \
  -p "${PROD_PORT}:80" \
  "${IMAGE_NAME}"

echo "Container '${CONTAINER_NAME}' is running at http://localhost:${PROD_PORT}"
