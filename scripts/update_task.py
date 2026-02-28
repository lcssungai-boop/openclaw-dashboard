#!/usr/bin/env python3
"""
update_task.py — OpenClaw 任務狀態更新工具

用法範例：
  # 更新任務狀態
  python3 update_task.py openclaw "daily_dashboard_update" --status 已完成

  # 更新狀態 + 下一步
  python3 update_task.py zhaojing "王原浦 2-1-1 合約到期催簽" --status 待處理 --next "已聯繫，2/25 約簽約"

  # 新增任務
  python3 update_task.py finance "新任務標題" --add --priority urgent --type alert --time 09:00

  # 同步完成後自動推送
  python3 update_task.py openclaw "daily_dashboard_update" --status 已完成 --push
"""
import json, sys, argparse, subprocess
from pathlib import Path
from datetime import datetime, timezone

REPO  = Path("/Users/sung/Documents/線上儀表板")
AREAS = ["openclaw", "caitodo", "zhaojing", "finance", "personal"]

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def load(area):
    p = REPO / "data" / area / "tasks.json"
    return json.loads(p.read_text(encoding="utf-8"))

def save(area, data):
    p = REPO / "data" / area / "tasks.json"
    data["updated_at"] = now_iso()
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def push(msg="OpenClaw 自動同步"):
    subprocess.run(["bash", str(REPO / "scripts" / "push.sh"), msg], check=True)

def main():
    parser = argparse.ArgumentParser(description="更新儀表板任務")
    parser.add_argument("area",  choices=AREAS, help="區域")
    parser.add_argument("title", help="任務標題（模糊比對）")
    parser.add_argument("--status",   help="新狀態: 待處理 / 阻塞 / 已完成")
    parser.add_argument("--next",     help="next_step 說明")
    parser.add_argument("--blocked",  help="blocked_reason")
    parser.add_argument("--priority", choices=["urgent","important","normal"])
    parser.add_argument("--type",     choices=["task","alert","remittance"])
    parser.add_argument("--due",      help="到期日 e.g. 2026/3/10")
    parser.add_argument("--time",     help="排程時間 e.g. 09:00")
    parser.add_argument("--add",      action="store_true", help="新增任務")
    parser.add_argument("--push",     action="store_true", help="更新後立即推送")
    args = parser.parse_args()

    data = load(args.area)

    if args.add:
        task = {
            "title":        args.title,
            "status":       args.status or "待處理",
            "next_step":    args.next or "-",
            "owner_role":   {"openclaw":"開發優化師","caitodo":"才多多","zhaojing":"兆鯨顧問","finance":"理財分析師","personal":"大總管"}[args.area],
            "blocked_reason": args.blocked or "-",
            "priority":     args.priority or "normal",
            "type":         args.type or "task",
            "due":          args.due or "-",
            "time":         args.time or "-",
            "freq":         "-",
            "updated_at":   now_iso(),
        }
        data["tasks"].insert(0, task)
        print(f"[+] 新增任務：{args.title}")
    else:
        # 模糊搜尋
        matches = [t for t in data["tasks"] if args.title in t["title"]]
        if not matches:
            print(f"[!] 找不到包含「{args.title}」的任務", file=sys.stderr)
            sys.exit(1)
        if len(matches) > 1:
            print(f"[!] 找到多筆，請縮小關鍵字：")
            for m in matches:
                print(f"   · {m['title']}")
            sys.exit(1)
        t = matches[0]
        if args.status:   t["status"]         = args.status
        if args.next:     t["next_step"]      = args.next
        if args.blocked:  t["blocked_reason"] = args.blocked
        if args.priority: t["priority"]       = args.priority
        if args.type:     t["type"]           = args.type
        if args.due:      t["due"]            = args.due
        if args.time:     t["time"]           = args.time
        t["updated_at"] = now_iso()
        print(f"[✓] 更新：{t['title']} → {t.get('status','')}")

    save(args.area, data)

    if args.push:
        push(f"OpenClaw 更新任務：{args.title}")

if __name__ == "__main__":
    main()
