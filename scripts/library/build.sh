#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"

SOURCE_ROOT="${LIB_SOURCE_ROOT:-/Users/sung/Library/Mobile Documents/com~apple~CloudDocs/caiduo才多_工作空間/資訊資料夾/資訊資料庫}"
OUT_FILE="${LIB_OUT_FILE:-data/library/index.json}"

LOCK="/tmp/openclaw-library-index.lock"
if ! ( set -o noclobber; echo "$$" > "$LOCK" ) 2>/dev/null; then
  echo "Library indexer already running (lock: $LOCK)" >&2
  exit 2
fi
trap 'rm -f "$LOCK"' EXIT

echo "[library] source=$SOURCE_ROOT"
echo "[library] out=$OUT_FILE"

# safety: do not wipe existing docs if source is empty
MD_COUNT=$(find "$SOURCE_ROOT" -type f -name "*.md" 2>/dev/null | wc -l | tr -d " ")
if [ "$MD_COUNT" = "0" ]; then
  echo "[library] WARNING: source has 0 .md; skip sync+index (to avoid wiping docs)" >&2
  exit 2
fi

/usr/bin/python3 scripts/library/sync_docs.py --source-root "$SOURCE_ROOT" --dest-root "data/library/docs" --exclude-rel ".obsidian"
/usr/bin/python3 scripts/library/indexer.py --source-root "$SOURCE_ROOT" --out-file "$OUT_FILE"
