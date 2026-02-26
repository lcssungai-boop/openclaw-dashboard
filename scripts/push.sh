#!/bin/bash
# ─────────────────────────────────────────────────────────────
# push.sh — OpenClaw 儀表板同步腳本
# 用法：bash /Users/sunglin/Documents/線上儀表板/scripts/push.sh "訊息"
# ─────────────────────────────────────────────────────────────
set -e
REPO="/Users/sunglin/Documents/線上儀表板"
MSG="${1:-OpenClaw 自動同步 $(date '+%Y-%m-%d %H:%M')}"

cd "$REPO"

# 只 commit data/ 和 index/子頁面（不含本機草稿）
git add data/ index.html openclaw/ caitodo/ zhaojing/ finance/ personal/ assets/ scripts/ crm/ .gitignore 2>/dev/null

# 有變更才 commit
if git diff --cached --quiet; then
  echo "[push.sh] 無變更，跳過"
  exit 0
fi

git commit -m "$MSG"

# 若 remote 有新 commit，先 rebase 再 push
git pull --rebase origin main
git push origin main
echo "[push.sh] 同步完成 → https://dashboard.changsung.uk"
