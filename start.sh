#!/usr/bin/env bash

shutdown(){
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

  cd open-design-open-design-v0.6.0
  pnpm tools-dev stop web
  cd ..


  echo "[app] Shutdown complete"
}

trap shutdown INT


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

cd open-design-open-design-v0.6.0
pnpm install
pnpm tools-dev start web --daemon-port 7456 --web-port 7457

cd ..

npm run dev


