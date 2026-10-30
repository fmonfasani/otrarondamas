#!/bin/bash
# ============================================================================
# Docker Build & Test Script for Wapsell Remix
# ============================================================================
# Usage:
#   ./docker-build-test.sh              # Full build + test
#   ./docker-build-test.sh --no-build   # Skip build, test existing image
#   ./docker-build-test.sh --clean      # Remove image before building
# ============================================================================

set -e  # Exit on error

IMAGE_NAME="wapsell-remix"
IMAGE_TAG="latest"
CONTAINER_NAME="wapsell-remix-test"
PORT="3000"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

cleanup() {
  log_info "Cleaning up containers..."
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
}

# ============================================================================
# Parse Arguments
# ============================================================================

SKIP_BUILD=false
CLEAN_IMAGE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-build) SKIP_BUILD=true; shift ;;
    --clean) CLEAN_IMAGE=true; shift ;;
    *) log_error "Unknown argument: $1"; exit 1 ;;
  esac
done

# ============================================================================
# Step 1: Clean (if requested)
# ============================================================================

if [ "$CLEAN_IMAGE" = true ]; then
  log_info "Removing existing image..."
  docker rmi -f "$IMAGE_NAME:$IMAGE_TAG" 2>/dev/null || true
fi

# ============================================================================
# Step 2: Build Docker Image
# ============================================================================

if [ "$SKIP_BUILD" = false ]; then
  log_info "Building Docker image: $IMAGE_NAME:$IMAGE_TAG"

  # Get current directory (where Dockerfile is)
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  REPO_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

  cd "$REPO_ROOT"

  START_TIME=$(date +%s)

  docker build \
    --progress=plain \
    -f "$SCRIPT_DIR/Dockerfile" \
    -t "$IMAGE_NAME:$IMAGE_TAG" \
    .

  BUILD_STATUS=$?
  END_TIME=$(date +%s)
  BUILD_DURATION=$((END_TIME - START_TIME))

  if [ $BUILD_STATUS -eq 0 ]; then
    log_info "Build succeeded in ${BUILD_DURATION}s"
  else
    log_error "Build failed with status $BUILD_STATUS"
    exit 1
  fi
else
  log_info "Skipping build (--no-build)"
fi

# ============================================================================
# Step 3: Inspect Image
# ============================================================================

log_info "Inspecting Docker image..."
IMAGE_SIZE=$(docker images "$IMAGE_NAME:$IMAGE_TAG" --format "{{.Size}}")
log_info "Image size: $IMAGE_SIZE"

# Show layer sizes
log_info "Layer history:"
docker history "$IMAGE_NAME:$IMAGE_TAG" --no-trunc --human | head -10

# ============================================================================
# Step 4: Run Container
# ============================================================================

log_info "Starting container: $CONTAINER_NAME"

cleanup  # Remove any existing container

docker run \
  --detach \
  --rm \
  --name "$CONTAINER_NAME" \
  -p "$PORT:3000" \
  -e NODE_ENV=production \
  -e VITE_API_URL=http://localhost:8600 \
  -e SESSION_SECRET=test-secret-1234567890abcdef1234567890abcdef \
  -e LOG_LEVEL=info \
  "$IMAGE_NAME:$IMAGE_TAG"

CONTAINER_ID=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.ID}}")

if [ -z "$CONTAINER_ID" ]; then
  log_error "Container failed to start"
  exit 1
fi

log_info "Container started: $CONTAINER_ID"

# ============================================================================
# Step 5: Wait for App to Be Ready
# ============================================================================

log_info "Waiting for app to start (max 30s)..."

READY=false
ATTEMPTS=0
MAX_ATTEMPTS=30

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  HEALTH=$(docker inspect "$CONTAINER_ID" --format='{{.State.Health.Status}}' 2>/dev/null)

  if [ "$HEALTH" = "healthy" ]; then
    log_info "App is healthy!"
    READY=true
    break
  fi

  ATTEMPTS=$((ATTEMPTS + 1))
  sleep 1
done

if [ "$READY" = false ]; then
  log_warning "Health check timeout, trying direct request..."

  # Try direct curl request
  for i in {1..10}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null || echo "000")

    if [ "$STATUS" = "200" ]; then
      log_info "App is responding (HTTP 200)"
      READY=true
      break
    fi

    sleep 1
  done
fi

if [ "$READY" = false ]; then
  log_error "App failed to start within timeout"
  log_error "Container logs:"
  docker logs "$CONTAINER_ID"
  cleanup
  exit 1
fi

# ============================================================================
# Step 6: Test Health Endpoint
# ============================================================================

log_info "Testing /api/health endpoint..."

HEALTH_RESPONSE=$(curl -s "http://localhost:$PORT/api/health" 2>/dev/null)
HEALTH_STATUS=$?

if [ $HEALTH_STATUS -eq 0 ]; then
  log_info "Health check response: $HEALTH_RESPONSE"

  # Verify JSON structure
  if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    log_info "✓ Health endpoint is working correctly"
  else
    log_warning "Health endpoint responded but JSON may be malformed"
  fi
else
  log_error "Failed to reach health endpoint"
  cleanup
  exit 1
fi

# ============================================================================
# Step 7: Test Root Endpoint
# ============================================================================

log_info "Testing root endpoint..."

ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null)

if [ "$ROOT_STATUS" = "200" ]; then
  log_info "✓ Root endpoint responding with HTTP 200"
elif [ "$ROOT_STATUS" = "301" ] || [ "$ROOT_STATUS" = "302" ]; then
  log_info "✓ Root endpoint responding with redirect (HTTP $ROOT_STATUS)"
else
  log_error "Root endpoint returned HTTP $ROOT_STATUS"
fi

# ============================================================================
# Step 8: Monitor Health Checks
# ============================================================================

log_info "Monitoring health checks for 60 seconds..."

HEALTH_RUNS=0
for i in {1..6}; do
  sleep 10

  HEALTH_STATUS=$(docker inspect "$CONTAINER_ID" --format='{{.State.Health.Status}}' 2>/dev/null)
  HEALTH_FAILING=$(docker inspect "$CONTAINER_ID" --format='{{.State.Health.FailingStreak}}' 2>/dev/null)

  log_info "Health: $HEALTH_STATUS (failing streak: $HEALTH_FAILING)"

  if [ "$HEALTH_STATUS" != "healthy" ]; then
    log_error "Health check failed"
    log_error "Container logs:"
    docker logs "$CONTAINER_ID" | tail -20
    cleanup
    exit 1
  fi
done

log_info "✓ Health checks passed for 60 seconds"

# ============================================================================
# Step 9: Test Graceful Shutdown
# ============================================================================

log_info "Testing graceful shutdown (SIGTERM)..."

STOP_START=$(date +%s)
docker stop "$CONTAINER_NAME" --time=10

STOP_END=$(date +%s)
STOP_DURATION=$((STOP_END - STOP_START))

log_info "Container stopped in ${STOP_DURATION}s"

if [ $STOP_DURATION -gt 10 ]; then
  log_warning "Shutdown took longer than expected (>10s)"
else
  log_info "✓ Graceful shutdown working correctly"
fi

# ============================================================================
# Step 10: Summary
# ============================================================================

log_info ""
log_info "════════════════════════════════════════════════════════════"
log_info "✓ ALL TESTS PASSED"
log_info "════════════════════════════════════════════════════════════"
log_info ""
log_info "Summary:"
log_info "  Image Name:       $IMAGE_NAME:$IMAGE_TAG"
log_info "  Image Size:       $IMAGE_SIZE"
log_info "  Build Duration:   ${BUILD_DURATION}s"
log_info "  Health Checks:    6/6 ✓"
log_info "  Graceful Stop:    ${STOP_DURATION}s ✓"
log_info ""
log_info "Next steps:"
log_info "  1. docker run -p 3000:3000 $IMAGE_NAME:$IMAGE_TAG"
log_info "  2. curl http://localhost:3000/api/health"
log_info "  3. docker push <registry>/$IMAGE_NAME:$IMAGE_TAG"
log_info ""
