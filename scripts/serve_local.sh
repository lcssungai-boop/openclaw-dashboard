#!/usr/bin/env bash
set -euo pipefail

# Serve this dashboard locally to avoid file:// CORS issues.
# Usage:
#   bash scripts/serve_local.sh
# Optional:
#   PORT=8787 bash scripts/serve_local.sh

PORT="${PORT:-8787}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO"

echo "Serving dashboard from: $REPO"
echo "URL: http://127.0.0.1:${PORT}/"
echo "Press Ctrl+C to stop."

python3 -m http.server "$PORT" --bind 127.0.0.1
