#!/usr/bin/env python3
"""Apply assistant_action YAML marks inside Library markdown files.

Workflow:
- User marks actions in YAML frontmatter (assistant_action/assistant_target/assistant_note).
- This script applies those actions in batch.

Safety:
- Deletes are soft-deletes: move to 00_Inbox/_Trash/<batch_ts>/...
- Only touches .md under lib_root.

Supported actions:
- delete: move to trash
- move: move to assistant_target (folder path under lib_root)
- keep: clears assistant_action fields (ack)
- merge: not implemented (kept for future)

Returns a summary dict.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re
import shutil
from typing import Dict, Tuple


FM_RE = re.compile(r"^---\n([\s\S]*?)\n---\n?", re.M)


def parse_frontmatter(md: str) -> Tuple[Dict[str, str], str]:
    m = FM_RE.match(md)
    if not m:
        return {}, md
    fm_text = m.group(1)
    body = md[m.end() :]
    out: Dict[str, str] = {}
    for line in fm_text.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k:
            out[k] = v
    return out, body


def upsert_frontmatter(md: str, updates: Dict[str, str]) -> str:
    fm, body = parse_frontmatter(md)
    for k, v in updates.items():
        if v == "":
            fm.pop(k, None)
        else:
            fm[k] = v

    if not fm:
        return body.lstrip("\n")

    # stable ordering: assistant_* first then others
    keys = sorted(fm.keys(), key=lambda x: (0 if x.startswith("assistant_") else 1, x))
    lines = [f"{k}: {fm[k]!r}" if re.search(r"\s", fm[k]) else f"{k}: {fm[k]}" for k in keys]
    fm_block = "---\n" + "\n".join(lines) + "\n---\n\n"
    return fm_block + body.lstrip("\n")


def safe_resolve(root: Path, rel: str) -> Path:
    p = (root / rel.lstrip("/")).resolve()
    if not str(p).startswith(str(root)):
        raise ValueError("path_escape")
    return p


def apply_actions(lib_root: Path, dry_run: bool = False) -> Dict:
    lib_root = lib_root.expanduser().resolve()
    batch = datetime.now().strftime("%Y%m%d_%H%M%S")
    trash_root = lib_root / "00_Inbox" / "_Trash" / f"assistant_actions_{batch}"

    scanned = 0
    matched = 0
    applied = 0
    skipped = 0
    errors = 0

    # actions breakdown
    by_action: Dict[str, int] = {}

    for p in lib_root.rglob("*.md"):
        scanned += 1
        # skip trash
        if "00_Inbox/_Trash" in str(p.relative_to(lib_root)):
            continue

        try:
            txt = p.read_text(encoding="utf-8", errors="replace")
            fm, _ = parse_frontmatter(txt)
            act = (fm.get("assistant_action") or "").strip()
            if not act:
                continue
            matched += 1
            by_action[act] = by_action.get(act, 0) + 1

            target = (fm.get("assistant_target") or "").strip()

            if act == "delete":
                rel = p.relative_to(lib_root)
                dest = (trash_root / rel).resolve()
                if not str(dest).startswith(str(trash_root.resolve())):
                    raise ValueError("trash_escape")
                if not dry_run:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(p), str(dest))
                applied += 1
                continue

            if act == "move":
                if not target:
                    skipped += 1
                    continue
                rel = p.relative_to(lib_root)
                dest = safe_resolve(lib_root, target) / rel.name
                if not dry_run:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(p), str(dest))
                applied += 1
                continue

            if act == "keep":
                # clear assistant marks
                if not dry_run:
                    updated = upsert_frontmatter(txt, {
                        "assistant_action": "",
                        "assistant_target": "",
                        "assistant_note": "",
                    })
                    p.write_text(updated, encoding="utf-8")
                applied += 1
                continue

            if act == "merge":
                # not implemented yet
                skipped += 1
                continue

            # unknown action
            skipped += 1

        except Exception:
            errors += 1

    return {
        "dry_run": dry_run,
        "scanned": scanned,
        "matched": matched,
        "applied": applied,
        "skipped": skipped,
        "errors": errors,
        "by_action": by_action,
        "trash_root": str(trash_root),
    }


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    res = apply_actions(Path(args.root), dry_run=args.dry_run)
    print(res)
