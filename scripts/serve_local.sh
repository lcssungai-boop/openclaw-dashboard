#!/usr/bin/env bash
set -euo pipefail

# Serve this dashboard locally to avoid file:// CORS issues.
# Usage:
#   bash scripts/serve_local.sh
# Optional:
#   PORT=8787 bash scripts/serve_local.sh
#   BIND=127.0.0.1 PORT=8787 bash scripts/serve_local.sh
#   BIND=0.0.0.0   PORT=8787 bash scripts/serve_local.sh   # LAN / Tailscale interface
#   BIND=100.x.x.x PORT=8787 bash scripts/serve_local.sh   # Tailscale IP (recommended)

PORT="${PORT:-8787}"
BIND="${BIND:-127.0.0.1}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO"

echo "Serving dashboard from: $REPO"
echo "Bind: $BIND"
echo "URL: http://${BIND}:${PORT}/"
echo "Press Ctrl+C to stop."

python3 -m http.server "$PORT" --bind "$BIND"
