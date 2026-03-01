# 線上儀表板｜本地網頁架構（草案）

> 目的：把目前「單檔 HTML + 內嵌 JS」逐步整理成可維護的本地網頁架構，但維持 **零 build / 零 bundler**（GitHub Pages 友善）。

## 現況
- 每個分頁（`/`, `/caitodo/`, `/openclaw/`...）各自是單檔 `index.html`
- JS 直接在 HTML 內 `fetch data/**/*.json` 或 `data/index/*.md`
- 優點：部署簡單；缺點：重複碼多、版面調整要多檔同步。

## 建議的漸進式目標
### 1) 共用 core（不破壞現有結構）
- 新增：`assets/js/core.js`
  - `fetchJson(url)` / `fetchText(url)`
  - `fmtTs(iso)`
  - `parseMdTable(text)`（目前才多多頁面已用到）
  - `safeStr()` / `escapeHtml()`
- 每個分頁保留自己的 render，但共用工具函式。

### 2) 共用 UI primitives
- 新增：`assets/js/ui.js`
  - `renderCardList(items, options)`
  - `renderTags(tags)`
  - 常用樣式 class mapping

### 3) 資料來源 SSOT 原則
- `data/index/*.md`：索引（customer/project/knowledge）做為 SSOT
- `data/*/tasks.json`：各域待辦清單
- `data/*/crm.json`：各域 CRM/進度摘要
- 需要跨頁呈現時：
  - 優先在前端讀 SSOT（markdown tables）
  - 若效能/解析成本變高，再加 export script 產 JSON

## 變更控制
- 先做最小可行改動：新增共用 JS 檔並逐頁替換（一次只動一頁）
- 每次改版都要保留：
  - 無 JS build
  - fetch 失敗可降級
  - 版面不閃爍（loading state）

