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

# 每次都 push（daily_reset.py 已更新 openclaw updated_at，確保有變動可 commit）
# 同時也會把期間手動改過的任務帶上線
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 執行 push（含所有本期間更新）" >> "$LOG"
PUSH_OUT=$(bash "$REPO/scripts/push.sh" "cron 12h 同步 $(date '+%Y-%m-%d %H:%M')" 2>&1)
echo "$PUSH_OUT" >> "$LOG"
echo "$PUSH_OUT"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] daily_reset 完成" >> "$LOG"
