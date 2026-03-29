#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-tj_metronome-prod}"

if docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | read -r _; then
  docker rm -f "${CONTAINER_NAME}" >/dev/null
  echo "Container '${CONTAINER_NAME}' stopped and removed."
else
  echo "Container '${CONTAINER_NAME}' not found."
fi
