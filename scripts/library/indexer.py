#!/usr/bin/env python3
"""Build a local Library index for the iCloud 資訊資料庫.

MVP goals:
- Scan *.md under SOURCE_ROOT
- Extract: id, rel_path, title, mtime, size, excerpt, headings
- Extract outbound links to other .md (relative paths), build inbound links
- Write JSON to OUT_FILE (default: data/library/index.json)

Design constraints:
- Zero build / static hosting friendly
- Treat Markdown as SSOT (PDF must be converted to MD upstream)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Tuple


MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


def sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def norm_rel(rel_path: str) -> str:
    rel_path = rel_path.replace("\\", "/")
    rel_path = re.sub(r"/+", "/", rel_path)
    rel_path = rel_path.lstrip("/")
    return rel_path


def extract_title(md: str, fallback: str) -> str:
    for line in md.splitlines()[:50]:
        m = HEADING_RE.match(line)
        if m and len(m.group(1)) == 1:
            return m.group(2).strip()
    return fallback


def extract_headings(md: str, limit: int = 30) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for line in md.splitlines():
        m = HEADING_RE.match(line)
        if not m:
            continue
        lvl = str(len(m.group(1)))
        txt = m.group(2).strip()
        out.append({"level": lvl, "text": txt})
        if len(out) >= limit:
            break
    return out


def excerpt(md: str, max_chars: int = 240) -> str:
    md2 = re.sub(r"```[\s\S]*?```", " ", md)
    md2 = re.sub(r"`[^`]+`", " ", md2)
    md2 = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", md2)  # images
    md2 = re.sub(r"\[[^\]]*\]\([^)]+\)", " ", md2)  # links
    md2 = re.sub(r"[#>*_\-]+", " ", md2)
    md2 = re.sub(r"\s+", " ", md2).strip()
    return md2[:max_chars]


def resolve_link(src_rel: str, href: str) -> str | None:
    href = href.strip()
    if not href or href.startswith("http://") or href.startswith("https://"):
        return None
    href = href.split("#", 1)[0].split("?", 1)[0]
    if not href:
        return None
    if not href.lower().endswith(".md"):
        return None

    if href.startswith("/"):
        return norm_rel(href)

    base_dir = Path(src_rel).parent
    target = norm_rel(str((base_dir / href).as_posix()))
    return target


@dataclass
class Doc:
    id: str
    rel_path: str
    doc_url: str
    title: str
    mtime: float
    size: int
    excerpt: str
    headings: List[Dict[str, str]]


def scan_md(source_root: Path) -> Tuple[List[Doc], Dict[str, List[str]]]:
    docs: List[Doc] = []
    outbound: Dict[str, List[str]] = {}

    for p in sorted(source_root.rglob("*.md")):
        try:
            rel = norm_rel(str(p.relative_to(source_root).as_posix()))
        except Exception:
            continue

        try:
            st = p.stat()
            md = read_text(p)
        except Exception:
            continue

        did = "D-" + sha1(rel)[:12]
        title = extract_title(md, fallback=p.stem)
        heads = extract_headings(md)
        ex = excerpt(md)

        docs.append(
            Doc(
                id=did,
                rel_path=rel,
                doc_url="../data/library/docs/"+rel,
                title=title,
                mtime=st.st_mtime,
                size=st.st_size,
                excerpt=ex,
                headings=heads,
            )
        )

        links: List[str] = []
        for _txt, href in MD_LINK_RE.findall(md):
            t = resolve_link(rel, href)
            if t:
                links.append(t)
        seen = set()
        links2 = []
        for x in links:
            if x in seen:
                continue
            seen.add(x)
            links2.append(x)
        outbound[did] = links2

    return docs, outbound


def build_inbound(outbound: Dict[str, List[str]], rel_to_id: Dict[str, str]) -> Dict[str, List[str]]:
    inbound: Dict[str, List[str]] = {did: [] for did in outbound.keys()}
    for src_id, rels in outbound.items():
        for rel in rels:
            tgt_id = rel_to_id.get(rel)
            if not tgt_id:
                continue
            inbound.setdefault(tgt_id, []).append(src_id)
    for k, v in inbound.items():
        seen = set()
        inbound[k] = [x for x in v if not (x in seen or seen.add(x))]
    return inbound


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--source-root",
        default=os.environ.get(
            "LIB_SOURCE_ROOT",
            "/Users/sung/Library/Mobile Documents/com~apple~CloudDocs/caiduo才多_工作空間/資訊資料庫",
        ),
    )
    ap.add_argument(
        "--out-file",
        default=os.environ.get("LIB_OUT_FILE", "data/library/index.json"),
    )
    args = ap.parse_args()

    source_root = Path(args.source_root).expanduser().resolve()
    out_file = Path(args.out_file)

    if not source_root.exists():
        print(f"ERROR: source root not found: {source_root}", file=sys.stderr)
        return 2

    t0 = time.time()
    docs, outbound = scan_md(source_root)
    rel_to_id = {d.rel_path: d.id for d in docs}
    inbound = build_inbound(outbound, rel_to_id)

    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_root": str(source_root),
        "doc_count": len(docs),
        "docs": [asdict(d) for d in docs],
        "links": {"outbound": outbound, "inbound": inbound},
        "_meta": {"elapsed_ms": int((time.time() - t0) * 1000)},
    }

    out_file.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_file.with_suffix(out_file.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(out_file)
    print(f"OK wrote {out_file} (docs={len(docs)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
