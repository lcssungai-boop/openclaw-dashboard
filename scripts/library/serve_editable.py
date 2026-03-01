#!/usr/bin/env python3
"""Serve dashboard + library with a tiny local edit API.

Why:
- Static `python -m http.server` can't save edits back to disk.
- This server serves files AND offers:
  - GET /api/library/read?rel=<rel_path>
  - POST /api/library/write  {rel_path, content}

Security (MVP):
- Only allow requests from localhost or Tailscale CGNAT (100.64.0.0/10).
- Only allow writing under LIB_SOURCE_ROOT and only to .md
"""

from __future__ import annotations

import argparse
import ipaddress
import json
import os
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

TAILSCALE_NET = ipaddress.ip_network("100.64.0.0/10")


def client_allowed(addr: str) -> bool:
    try:
        ip = ipaddress.ip_address(addr)
    except Exception:
        return False
    return ip.is_loopback or ip in TAILSCALE_NET


class Handler(SimpleHTTPRequestHandler):
    server_version = "OpenClawLibrary/0.1"

    def end_headers(self):
        # allow fetch from browsers (edit API can be called from a different port)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(204)
        self.end_headers()
        return

    @property
    def lib_root(self) -> Path:
        return Path(os.environ.get(
            "LIB_SOURCE_ROOT",
            "/Users/sung/Library/Mobile Documents/com~apple~CloudDocs/caiduo才多_工作空間/資訊資料夾/資訊資料庫",
        )).expanduser().resolve()

    def _deny(self, code=403, msg="forbidden"):
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": False, "error": msg}, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        if self.path.startswith("/api/library/read"):
            if not client_allowed(self.client_address[0]):
                return self._deny(403, "client_not_allowed")

            qs = parse_qs(urlparse(self.path).query)
            rel = (qs.get("rel") or [""])[0]
            rel = rel.lstrip("/")
            if not rel.endswith(".md"):
                return self._deny(400, "only_md_allowed")

            p = (self.lib_root / rel).resolve()
            if not str(p).startswith(str(self.lib_root)):
                return self._deny(400, "path_escape")
            if not p.exists():
                return self._deny(404, "not_found")

            data = p.read_text(encoding="utf-8", errors="replace")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "rel_path": rel, "content": data}, ensure_ascii=False).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/library/write"):
            if not client_allowed(self.client_address[0]):
                return self._deny(403, "client_not_allowed")

            n = int(self.headers.get("Content-Length") or "0")
            raw = self.rfile.read(n)
            try:
                body = json.loads(raw.decode("utf-8"))
            except Exception:
                return self._deny(400, "bad_json")

            rel = str(body.get("rel_path") or "").lstrip("/")
            content = body.get("content")
            if not rel.endswith(".md"):
                return self._deny(400, "only_md_allowed")
            if not isinstance(content, str):
                return self._deny(400, "content_required")

            p = (self.lib_root / rel).resolve()
            if not str(p).startswith(str(self.lib_root)):
                return self._deny(400, "path_escape")

            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "saved": rel}, ensure_ascii=False).encode("utf-8"))
            return

        return self._deny(404, "unknown_api")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bind", default=os.environ.get("BIND", "127.0.0.1"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8799")))
    ap.add_argument("--dir", default=os.environ.get("SERVE_DIR", os.getcwd()))
    args = ap.parse_args()

    os.chdir(args.dir)
    httpd = ThreadingHTTPServer((args.bind, args.port), Handler)
    print(f"Serving {args.dir} on http://{args.bind}:{args.port} (editable API enabled)")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
