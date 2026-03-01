---
標籤: #系統管理 #OpenClaw #更新
建立日期: 2026-02-15
---

# OpenClaw 更新方式

## 版本資訊
- 目前版本：2026.2.13
- 最新版本：2026.2.14

---

## 更新方式

### 方式一：簡單更新（推薦）
```bash
openclaw update run
```
- 不會影響目前運作
- 會重啟 Gateway

### 方式二：先備份再更新
```bash
# 備份 config
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup
# 執行更新
openclaw update run
```

---

## 常用指令

```bash
# 檢查版本
openclaw --version

# 檢查最新版本
npm view openclaw version

# 查看 Gateway 狀態
openclaw gateway status

# 查看完整狀態
openclaw status
```

---

建立：才多多 Word Agent

---

## 重要通知（2026-02-15）

所有 Agent 的儀表板（HTML）檔案，請統一存放到 Google Drive 的「sungAI共用」資料夾。

路徑：~/Library/CloudStorage/GoogleDrive-sunglin1981@gmail.com/sungAI共用/
