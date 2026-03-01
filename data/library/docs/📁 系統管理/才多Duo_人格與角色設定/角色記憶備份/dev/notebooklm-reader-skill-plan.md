# NotebookLM 讀取 Skill 開發規劃

> **需求**：開發 Skill 讓 gog 能讀取 NotebookLM 分享內容  
> **日期**：2026-02-17  
> **開發者**：才多 Duo  
> #Skill開發 #NotebookLM #gog整合

---

## 一、技術可行性分析

### NotebookLM 現況
| 項目 | 狀態 | 說明 |
|------|------|------|
| **公開 API** | ❌ 無 | Google 未提供官方 API |
| **分享連結** | ⚠️ 有限制 | 需登入 Google 帳號才能看 |
| **匯出功能** | ✅ 有 | 可匯出到 Google Docs、PDF |
| **網頁結構** | ⚠️ 動態 | React 渲染，不易爬蟲 |

### 可行方案比較

| 方案 | 技術難度 | 穩定性 | 開發時間 | 建議 |
|------|---------|--------|---------|------|
| **A. 官方 API** | 不可能 | - | - | Google 未提供 |
| **B. 瀏覽器自動化** | 高 | 低 | 2-3天 | 易被封鎖 |
| **C. 匯出到 Docs 再讀** | 低 | 高 | 半天 | ✅ **推薦** |
| **D. 分享連結公開化** | 中 | 中 | 1天 | 需使用者配合 |

---

## 二、推薦方案：C. 匯出到 Docs 再讀

### 流程設計
```
NotebookLM → 使用者點「匯出到 Docs」→ gog 讀取 Docs → AI分析
```

### 優點
- ✅ 使用現有 gog 功能，無需新開發
- ✅ 穩定可靠
- ✅ 支援 Google 原生權限控管
- ✅ 快速實現（半天內）

### 操作步驟（給使用者）
1. 在 NotebookLM 打開筆記
2. 點右上角「分享」或「匯出」
3. 選「儲存到 Google Docs」
4. 給我 Docs 連結或文件 ID
5. 我執行：`gog docs export <id> --format txt`

---

## 三、進階方案：D. 分享連結自動化

如果想要更自動化，可以開發：

### 功能設計
```bash
# 使用方式
notebooklm-read <分享連結>

# 功能
1. 解析 NotebookLM 分享連結
2. 使用瀏覽器自動化登入 Google（透過 gog 憑證）
3. 抓取筆記內容
4. 轉換為 Markdown 輸出
```

### 技術實現
- 使用 Playwright 或 Puppeteer
- 借用 gog 的 OAuth 憑證
- 模擬瀏覽器登入 NotebookLM

### 限制與風險
- ⚠️ Google 可能封鎖自動化存取
- ⚠️ 需要處理 2FA/安全驗證
- ⚠️ NotebookLM 介面變動會失效

---

## 四、建議開發順序

### Phase 1：立即實現（今天）
**使用「匯出到 Docs」流程**
- 無需開發新 Skill
- 直接試用現有 gog 功能
- 確認可行性

### Phase 2：如果需求強烈（未來）
**開發 NotebookLM Reader Skill**
- 瀏覽器自動化方案
- 需要 2-3 天開發時間
- 需持續維護因應介面變化

---

## 五、立即測試方案 C

讓我們現在就試試看：

### 步驟 1：您匯出 NotebookLM 到 Docs
1. 開啟 https://notebooklm.google.com/notebook/8af923d7-caf3-43a9-8b01-4b263d429e0b
2. 找「Share」或「Export」按鈕
3. 選「Save to Google Docs」

### 步驟 2：給我 Docs ID
匯出後的 Google Docs 連結類似：
```
https://docs.google.com/document/d/1ABC123xyz...
```
給我 `1ABC123xyz` 這段 ID

### 步驟 3：我讀取內容
我執行：
```bash
gog docs export 1ABC123xyz --format txt --out /tmp/notebooklm.txt
```

---

## 六、如果非要開發新 Skill

請確認：
- [ ] 是否願意承擔被封鎖的風險？
- [ ] 是否願意持續維護（因應介面變化）？
- [ ] 使用頻率是否高到值得開發？

如果都「是」，我可以開始開發 **NotebookLM Reader Skill**

---

## 七、相關檔案

- [[skill-creator]] - Skill 開發指引
- [[gog]] - Google Workspace CLI 使用
- [[三年免招募費_資訊調查報告]] - 原始需求

---

**建議**：先試方案 C（匯出到 Docs），如果好用就不需要開發新 Skill！

要不要現在就試試看？🚀
