#!/usr/bin/env python3
"""
daily_reset.py — 每日排程任務自動重設

規則：
  freq=daily      → 每天：「已完成」→「待處理」
  freq=weekly     → 週一：「已完成」→「待處理」
  freq=weekly-mon → 週一：「已完成」→「待處理」
  freq=monthly    → 每月1日：「已完成」→「待處理」

不重設：status=阻塞（阻塞需手動解除）
"""
import json, sys
from pathlib import Path
from datetime import datetime, timezone

REPO  = Path("/Users/sunglin/Documents/線上儀表板")
AREAS = ["openclaw", "caitodo", "zhaojing", "finance", "personal"]

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def main():
    now       = datetime.now()
    is_monday = now.weekday() == 0
    is_first  = now.day == 1
    date_str  = now.strftime("%Y-%m-%d %H:%M")

    print(f"[daily_reset] {date_str}  週一={is_monday}  月初={is_first}")

    total_reset = 0

    for area in AREAS:
        path = REPO / "data" / area / "tasks.json"
        if not path.exists():
            continue

        data     = json.loads(path.read_text(encoding="utf-8"))
        modified = False

        for t in data["tasks"]:
            freq   = t.get("freq", "-")
            status = t.get("status", "")

            # 只重設「已完成」，阻塞/待處理不動
            if status != "已完成":
                continue

            should_reset = (
                freq == "daily"
                or (freq in ("weekly", "weekly-mon") and is_monday)
                or (freq == "monthly" and is_first)
            )

            if should_reset:
                t["status"]     = "待處理"
                t["updated_at"] = now_iso()
                print(f"  [reset] {area} / {t['title']}  ({freq})")
                modified    = True
                total_reset += 1

        if modified:
            data["updated_at"] = now_iso()
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )

    # 每次執行都刷新 openclaw updated_at（讓儀表板顯示「最後同步時間」是活的）
    oc_path = REPO / "data" / "openclaw" / "tasks.json"
    if oc_path.exists():
        oc = json.loads(oc_path.read_text(encoding="utf-8"))
        oc["updated_at"] = now_iso()
        oc_path.write_text(json.dumps(oc, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[openclaw] updated_at 刷新 → {oc['updated_at']}")

    if total_reset == 0:
        print("[daily_reset] 無需重設")
    else:
        print(f"[daily_reset] 共重設 {total_reset} 筆")

    return total_reset

if __name__ == "__main__":
    n = main()
    sys.exit(0)
