#!/usr/bin/env python3
"""
export_jobs.py — 把 ~/.openclaw/cron/jobs.json 匯出為儀表板可讀的 jobs.json
用法：python3 scripts/export_jobs.py
"""
import json, os, sys
from datetime import datetime, timezone

SRC = os.path.expanduser("~/.openclaw/cron/jobs.json")
DST = os.path.join(os.path.dirname(__file__), "..", "data", "openclaw", "jobs.json")
DST = os.path.normpath(DST)

def fmt_ms(ms):
    if not ms: return None
    try: return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()
    except: return None

def cron_human(expr, tz_str="Asia/Taipei"):
    """把 cron expr 轉成人讀格式（簡化版）"""
    if not expr: return "-"
    # ISO datetime
    if "T" in str(expr): return "一次性 " + str(expr)[:10]
    parts = str(expr).split()
    if len(parts) != 5: return expr
    m, h, dom, mon, dow = parts
    # 常見 pattern
    if dom == "*" and mon == "*":
        days_map = {"1-5":"週一～五","1":"週一","2":"週二","5":"週五","*":"每天"}
        day_str = days_map.get(dow, dow)
        if m == "0" and h.isdigit(): return f"{day_str} {int(h):02d}:00"
        if "," in h:
            times = ",".join(f"{int(x):02d}:00" for x in h.split(",") if x.isdigit())
            return f"{day_str} {times}"
        if "-" in h and "/" not in h: return f"{day_str} {h}:00"
        if "/" in h: return f"{day_str} 每隔"
    if dom != "*" and mon == "*": return f"每月{dom}日 {int(h):02d}:00"
    if dom != "*" and mon != "*": return f"{int(mon)}月{int(dom)}日 {int(h):02d}:00"
    return expr

# 業務分類
CATEGORIES = [
    ("財務投資", ["美股","台股","台積電","0050","KDJ","J值","散熱","定期定額","農曆"]),
    ("才多多",   ["才多多","招募","面試","入職","三年免"]),
    ("兆鯨",     ["兆鯨","王原"]),
    ("郵件",     ["郵件","附件"]),
    ("系統維護", ["備份","版本","Token","記憶","Context","健康","自我"]),
    ("排程提醒", ["BNI","咖啡","信用卡","LinePay","過濾材","聖發","澤于","Notion","蝦皮"]),
    ("每日流程", ["工作流","備忘錄","daily","Dashboard"]),
]

def categorize(name):
    for cat, keywords in CATEGORIES:
        for kw in keywords:
            if kw in name: return cat
    return "其他"

with open(SRC, encoding="utf-8") as f:
    raw = json.load(f)

jobs = []
for j in raw.get("jobs", []):
    sch = j.get("schedule", {})
    st  = j.get("state", {})
    dv  = j.get("delivery", {})
    pl  = j.get("payload", {})
    name = j.get("name", "-")
    last_dur = st.get("lastDurationMs")
    cons_err = st.get("consecutiveErrors", 0)
    last_status = st.get("lastStatus") or st.get("lastRunStatus") or "-"
    # 判斷是否超時（>290s）
    is_timeout = last_dur and last_dur > 290000

    jobs.append({
        "id":               j.get("id"),
        "name":             name,
        "category":         categorize(name),
        "enabled":          j.get("enabled", True),
        "schedule_expr":    sch.get("expr") or sch.get("at"),
        "schedule_human":   cron_human(sch.get("expr") or sch.get("at"), sch.get("tz")),
        "schedule_tz":      sch.get("tz"),
        "model":            pl.get("model", "-"),
        "delivery_mode":    dv.get("mode", "-"),
        "delivery_channel": dv.get("channel", "-"),
        "last_status":      last_status,
        "last_run_at":      fmt_ms(st.get("lastRunAtMs")),
        "next_run_at":      fmt_ms(st.get("nextRunAtMs")),
        "last_duration_ms": last_dur,
        "consecutive_errors": cons_err,
        "is_timeout":       bool(is_timeout),
        "delete_after_run": j.get("deleteAfterRun", False),
    })

enabled  = [j for j in jobs if j["enabled"]]
disabled = [j for j in jobs if not j["enabled"]]
errors   = [j for j in jobs if j["consecutive_errors"] > 0 or j["is_timeout"]]

output = {
    "updated_at": datetime.now(tz=timezone.utc).isoformat(),
    "summary": {
        "total":    len(jobs),
        "enabled":  len(enabled),
        "disabled": len(disabled),
        "errors":   len(errors),
    },
    "health": {
        "warnings": [
            {"id":"openai-expiry","level":"warn","title":"OpenAI OAuth 即將到期",
             "detail":"2026-03-04 01:39 CST，約 6 天後失效，需重新授權",
             "action":"重新登入 OpenAI"}
        ] + [
            {"id":f"err-{j['id'][:8]}","level":"err","title":f"任務錯誤：{j['name']}",
             "detail":f"連續錯誤 {j['consecutive_errors']} 次" + ("；上次超時 300s" if j['is_timeout'] else ""),
             "action":"檢查任務 prompt 或超時設定"}
            for j in errors
        ] + (
            [{"id":"disabled-jobs","level":"info","title":f"停用任務 {len(disabled)} 個",
              "detail":"，".join(j['name'] for j in disabled[:5]) + ("…" if len(disabled)>5 else ""),
              "action":"確認是否需要重新啟用"}] if disabled else []
        )
    },
    "jobs": jobs,
}

os.makedirs(os.path.dirname(DST), exist_ok=True)
with open(DST, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"[export_jobs] 匯出完成 → {DST}")
print(f"  total={len(jobs)}  enabled={len(enabled)}  disabled={len(disabled)}  errors={len(errors)}")
