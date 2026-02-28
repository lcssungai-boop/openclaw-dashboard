# Project Index

> 用途：專案主檔索引（SSOT）初版；依 2026-02-27 外部路徑掃描結果建立。

## Metadata
- version: v1-initial-discovered
- updated_at: 2026-02-27
- owner: 小c
- id_rule: `P-####`
- scan_target: `/Users/sung/Library/Mobile Documents/com~apple~CloudDocs/caiduo才多_工作空間`

## Columns
| project_id | project_name | customer_id | stage | priority | pm_owner | due_date | source_path | related_knowledge | risks | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P-0001 | 兆鯨物业 | C-0002 | active | medium | TBD | TBD | 資訊資料庫/📁 專案項目/兆鯨物业 | K-20260225-002 | 客戶命名不一致 | 與客戶「兆鯨」關聯待確認 |
| P-0002 | 兆鯨組織 | C-0002 | active | medium | TBD | TBD | 資訊資料庫/📁 專案項目/兆鯨組織 | K-20260225-002 | 範圍可能與 P-0001 重疊 | 名稱顯示為組織向專案 |
| P-0003 | 全立祥 | C-0003 | active | medium | TBD | TBD | 資訊資料庫/📁 專案項目/全立祥 | TBD | 需求資料不足 | 目前僅資料夾條目 |
| P-0004 | 利源不銹鋼 | C-0005 | active | medium | TBD | TBD | 資訊資料庫/📁 專案項目/利源不銹鋼 | K-20260225-004 | 客戶名與專案名差異 | 需確認是否單一專案 |
| P-0005 | 成大人力 | C-TBD | planning | medium | TBD | TBD | 資訊資料庫/📁 專案項目/成大人力 | K-20260227-001 | 客戶主檔未對應 | 可能新客戶或合作方 |
| P-0006 | 新南向人力銀行 | C-TBD | active | high | TBD | 2026-03-03 | 資訊資料庫/📁 專案項目/新南向人力銀行 | K-20260225-001, K-20260227-001 | 客戶未映射 | 另在 `資訊資料庫/專案項目` 有同名樹 |
| P-0007 | 新南向人力銀行平台系統 | C-TBD | active | high | TBD | TBD | 資訊資料庫/📁 專案項目/新南向人力銀行平台系統 | K-20260224-001, K-20260227-001 | 子任務與主專案邊界未明 | 含「學校相關介面、內容討論」子目錄 |
| P-0009 | 新南向白領派遣 | C-TBD | planning | medium | TBD | TBD | 資訊資料庫/📁 專案項目/新南向白領派遣 | K-20260227-001 | 原與 P-0008 名稱重複 | 別名：新南向白領及派遣（已併入） |
| P-0010 | 空間特工 | C-0011 | active | medium | TBD | TBD | 資訊資料庫/📁 專案項目/空間特工 | TBD | 與客戶命名差異 | 可能對應客戶「特工」 |

## Assumptions
- 專案掃描來源以 `資訊資料庫/📁 專案項目` 為主，並參考 `資訊資料庫/專案項目` 同名訊號。
- `customer_id` 僅在名稱足夠明確時先行映射，其餘保留 `C-TBD`。
- `due_date` 只有在文件名含明確日期時才填寫。

## Data Quality Caveats
- 目前未解析各專案內容文件，`stage/priority/risks` 多為初始值。
- 同名或近似名專案可能跨多個資料樹，尚未做 canonical path 決策。
- 多數 PM 負責人資訊不存在於資料夾命名層，後續需人工補齊。

## Changelog
- 2026-02-27：合併 `新南向白領及派遣 / 新南向白領派遣`，移除重複列 P-0008，保留 P-0009 為主。
- 2026-02-27：補記 P-0009 別名，避免後續重複建立。
