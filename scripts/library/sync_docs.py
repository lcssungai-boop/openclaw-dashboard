#!/usr/bin/env python3
"""Sync Markdown docs from SOURCE_ROOT into repo under data/library/docs/.

Enables browser to fetch and render full text from the same static server.

Rules:
- copy only *.md
- preserve relative paths
- exclude destination subtree if SOURCE_ROOT overlaps
- DO NOT follow symlinks
"""

from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path
from typing import List


def norm(p: str) -> str:
    return p.replace('\\', '/').strip('/').lower()


def should_exclude(rel: Path, excludes: List[str]) -> bool:
    r = norm(rel.as_posix())
    for ex in excludes:
        exn = norm(ex)
        if not exn:
            continue
        if r == exn or r.startswith(exn + '/'):
            return True
    return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--source-root",
        default=os.environ.get(
            "LIB_SOURCE_ROOT",
            "/Users/sung/Library/Mobile Documents/com~apple~CloudDocs/caiduo才多_工作空間/資訊資料夾/資訊資料庫",
        ),
    )
    ap.add_argument(
        "--dest-root",
        default=os.environ.get("LIB_DOCS_DEST", "data/library/docs"),
    )
    ap.add_argument("--exclude-rel", action="append", default=[])
    args = ap.parse_args()

    src = Path(args.source_root).expanduser().resolve()
    dst = Path(args.dest_root).resolve()

    if not src.exists():
        raise SystemExit(f"source root not found: {src}")

    dst.mkdir(parents=True, exist_ok=True)

    expected = set()

    for p in src.rglob("*.md"):
        # skip symlinks
        try:
            if p.is_symlink():
                continue
        except Exception:
            continue

        rel = p.relative_to(src)
        if should_exclude(rel, args.exclude_rel):
            continue

        out = (dst / rel).resolve()
        if not str(out).startswith(str(dst) + os.sep) and str(out) != str(dst):
            continue

        expected.add(out)
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, out, follow_symlinks=False)

    # remove stale
    for p in dst.rglob("*.md"):
        rp = p.resolve()
        if rp not in expected:
            try:
                p.unlink()
            except Exception:
                pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
