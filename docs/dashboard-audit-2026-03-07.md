# Dashboard Audit / Fix Log — 2026-03-07

## 問題清單（修前）
1. 手機版 Tasks 頁實際吃 `openclaw_public_state.schedules` 的殘留邏輯，沒有把 `caitodo/tasks.json` / `finance/tasks.json` 納進來。
2. 手機版 Control / Intel / Finance 頁面吃不存在的 `controls/intels/finances` 欄位，前端不是空白就是誤判為無資料。
3. 手機版 Today / 桌面版 Overview 直接把內部條目、過期條目、部門空 JSON 與 CRM 主檔混成同一層，造成「看起來有資料、實際不可查核」。
4. 桌面版分頁語言仍是 `Overview / 專案 / CRM / 系統`，與手機主規格不一致。
5. 桌面版管理部 / 財務部空值時，前端沒有明確表達「來源為空」，容易被誤認為渲染失敗。
6. 資料來源角色分工沒有落到畫面：`customer_index.md` / `project_index.md` / `dept/*.json` / `openclaw_public_state.json` / `tasks.json` 各自職責不明。
7. `data/customers/recent.json` 與索引 markdown 存在更新時間差，前台未揭露來源與優先權。

## 根因
- 前台長期疊補邏輯，未建立共享資料層。
- `dept/*.json` 被拿來當 SSOT，但實際上目前只是交流/摘要視圖，不是主索引。
- `openclaw_public_state.json` 是 Today 視圖資料，但被誤用成 CRM / Tasks / 專案主來源。
- 桌面版保留舊的 command-center 心智，未跟手機版對齊。

## 本次最小修正
- 新增 `assets/js/dashboard-data.js`：集中載入與正規化資料。
- 重寫手機入口 `index.html`：
  - Today 只以 `openclaw_public_state.json` 為時序主卡。
  - Customers 以 `customer_index.md` 為 SSOT，`recent.json` 為手機快取，`caitodo/tasks.json` 為案件補充。
  - Tasks 顯示未完成待辦、過期未結清、以及未來時程。
  - Exchange 只顯示三部 JSON 現況，不再假裝它們是主索引。
  - Control 直接揭露資料源角色/空值狀況。
  - Intel 以 `knowledge_index.md` 摘要呈現。
  - Finance 以 `財務部.json` + `finance/tasks.json` 呈現。
- 重寫桌面入口 `desktop/index.html`：
  - 分頁改為 `Today / Customers / Tasks / Exchange / Control / Intel / Finance`。
  - 與手機共用同一資料層；桌面只做展開視圖。
  - 明示管理部/財務部空值是來源空，不是前端壞掉。
- Today timeline 改為優先看公開時序，不再把無日期財務待辦塞到首頁主時程。
- 補一份審計文件（本檔），方便之後追修。

## 現在的資料來源分工
- `data/index/customer_index.md`：客戶 SSOT。
- `data/index/project_index.md`：專案 SSOT。
- `data/customers/recent.json`：手機端近期客戶快取/排序結果，不是主檔。
- `data/openclaw_public_state.json`：Today 主卡、首頁時序、公開狀態摘要。
- `data/caitodo/tasks.json`：才多多案件待辦（尤其看護工/客戶追蹤）。
- `data/finance/tasks.json`：財務待辦。
- `data/dept/管理部.json` / `資訊部.json` / `財務部.json`：三部交流與摘要視圖，不是客戶/專案 SSOT。
- `data/index/knowledge_index.md`：Intel / 知識索引入口。

## 尚未補齊
1. `管理部.json.projects` / `recent_clients` 目前仍為空，需補同步腳本，否則 Exchange 只能顯示「待補資料」。
2. `財務部.json.pending_invoices` 目前仍為空，需決定請款/案件金額的正式同步來源。
3. `recent.json` 生成腳本仍讀舊路徑（workspace memory topics），未完全改成現在 repo 內 `data/index/*.md` 為來源。
4. `openclaw_public_state.json` 內仍有舊格式日期（如 `6 am06:20`），雖已前端容錯，但最好在生成端修正成標準 ISO/`YYYY-MM-DD HH:mm`。
