#!/bin/bash
# ─────────────────────────────────────────────────────────────
# daily_reset.sh — 每日 06:00 由 launchd 自動執行
# 1. 重設 freq=daily/weekly/monthly 的已完成任務 → 待處理
# 2. 有變動就 push 上線
# ─────────────────────────────────────────────────────────────
REPO="/Users/sunglin/Documents/線上儀表板"
LOG="$REPO/logs/cron.log"
PYTHON="/usr/bin/python3"

mkdir -p "$REPO/logs"
echo "" >> "$LOG"
echo "═══════════════════════════════════" >> "$LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] daily_reset 開始" >> "$LOG"

# 執行重設腳本
OUTPUT=$("$PYTHON" "$REPO/scripts/daily_reset.py" 2>&1)
echo "$OUTPUT" >> "$LOG"
echo "$OUTPUT"

# 檢查是否有任何重設發生（輸出含「reset」就代表有變動）
if echo "$OUTPUT" | grep -q "\[reset\]"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 有變動，執行 push" >> "$LOG"
    PUSH_OUT=$(bash "$REPO/scripts/push.sh" "cron 自動重設 $(date '+%Y-%m-%d')" 2>&1)
    echo "$PUSH_OUT" >> "$LOG"
    echo "$PUSH_OUT"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 無變動，跳過 push" >> "$LOG"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] daily_reset 完成" >> "$LOG"
