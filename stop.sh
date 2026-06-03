#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="mongo-test"

echo "=== Slide Central Shutdown ==="

if docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "[mongo] Stopping container '${CONTAINER_NAME}'..."
  docker stop "${CONTAINER_NAME}" >/dev/null
  echo "[mongo] Stopped"
else
  echo "[mongo] Container '${CONTAINER_NAME}' is not running"
fi

echo "[app] Shutdown complete"
