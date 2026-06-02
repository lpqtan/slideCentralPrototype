#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="mongo-test"
MONGO_IMAGE="mongo:7"
MONGO_PORT="27017"

echo "=== Slide Central Startup ==="

# Check if Docker is available
if ! command -v docker &>/dev/null; then
  echo "ERROR: docker not found. Install Docker Desktop or Colima."
  exit 1
fi

# Start MongoDB container if not running
if docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "[mongo] Container '${CONTAINER_NAME}' already running"
elif docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "[mongo] Starting existing container '${CONTAINER_NAME}'..."
  docker start "${CONTAINER_NAME}" >/dev/null
  echo "[mongo] Started"
else
  echo "[mongo] Creating and starting container '${CONTAINER_NAME}'..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -p "${MONGO_PORT}:27017" \
    -v mongo-data:/data/db \
    "${MONGO_IMAGE}" >/dev/null
  echo "[mongo] Created — port ${MONGO_PORT}"
fi

# Wait for MongoDB to be ready
echo "[mongo] Waiting for readiness..."
until docker exec "${CONTAINER_NAME}" mongosh --quiet --eval "db.runCommand({ping:1})" &>/dev/null; do
  sleep 1
done
echo "[mongo] Ready"

echo "[app] Starting Next.js dev server..."
npm run dev
