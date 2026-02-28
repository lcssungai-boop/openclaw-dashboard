# Knowledge Index

> 用途：資訊資料庫索引（SSOT）初版；依 2026-02-27 外部路徑掃描結果建立。

## Metadata
- version: v1-initial-discovered
- updated_at: 2026-02-28
- owner: 小c
- id_rule: `K-YYYYMMDD-###`
- scan_target: `/Users/sunglin/Library/Mobile Documents/com~apple~CloudDocs/caiduo才多_工作空間`

## Classification Rules
知識索引僅收錄以下 source_type：`regulation`、`meeting_note`、`operations_doc`、`migration_doc`。
- **禁止收錄** `customer_doc`：客戶摘要/客戶資料文件 → 應進 `customer_index`，在此僅以 `related_customer_ids` 交叉引用。
- **禁止收錄** `system_log`：流程操作日誌 → 屬運維資料，不屬長期知識庫。

## Columns
| knowledge_id | date | topic | source_type | source_ref | related_customer_ids | related_project_ids | action_required | action_owner | action_due | summary |
|---|---|---|---|---|---|---|---|---|---|---|
| K-20260227-001 | 2026-02-27 | 企業防制強迫勞動參考指引 | regulation | 資訊資料庫/📁 勞動法規/2026-02-27_MOL_88232_企業防制強迫勞動參考指引.md | C-TBD | P-0005, P-0006, P-0007, P-0009 | yes | TBD | TBD | 勞動法規更新，疑似影響人力相關專案 |
| K-20260227-002 | 2026-02-27 | 稅務庫存開票彙整 | operations_doc | 資訊資料庫/兆鯨/11501-02/市場部銷貨品項數據/稅務庫存開票_彙整_2026-02-26.md | C-0002 | P-0001 | yes | TBD | TBD | 兆鯨銷貨/庫存/開票對帳彙整 |
| K-20260225-001 | 2026-02-25 | 系統測試上線會議議程 | meeting_note | 資訊資料庫/專案項目/新南向人力銀行/2026-03-03_系統測試上線會議_議程與會前備忘.md | C-TBD | P-0006 | yes | TBD | 2026-03-03 | 會前備忘與上線測試安排 |
| K-20260224-001 | 2026-02-24 | 新南向平台 Notion 匯入項目 | migration_doc | 資訊資料庫/📁 系統管理/Notion匯入_2026-02-21_PAI首頁/PAI首頁/ToDo/新南向人力銀行平台系統/ | C-TBD | P-0007 | no | - | - | 多份功能頁面文件匯入，支援平台系統需求 |

## Assumptions
- `knowledge_id` 由檔名日期推估並依掃描次序編號。
- 優先收錄近期（2026-02-24 至 2026-02-27）且可直接定位的文件。
- `related_customer_ids`/`related_project_ids` 先依路徑語意關聯，未知者保留 `TBD`。

## Data Quality Caveats
- 尚未做全文內容解析，`summary` 依檔名與路徑推估。
- 資訊資料庫存在多套平行目錄（有/無 emoji 前綴），可能造成重複收錄風險。

## Changelog
- 2026-02-28：移除 `customer_doc` 條目（K-20260225-002/003/004）及 `system_log` 條目（K-20260225-005/006）；正確歸類至 customer_index。新增 Classification Rules 區塊。
- 2026-02-27：因專案索引合併，`K-20260227-001` 的關聯專案移除 `P-0008`，保留 `P-0009`。
