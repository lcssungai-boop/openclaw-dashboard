# SSH 雙機互援技術規劃文件

**文件版本**: v1.0  
**建立日期**: 2026-02-23  
**作者**: OpenClaw 開發 Agent  
**用途**: AI 系統管理員 SSH 雙機互援機制規劃

---

## 1. 現況分析

### 1.1 系統環境
- **主機**: sung的Mac mini (Darwin 25.3.0, arm64)
- **平台**: macOS
- **OpenClaw 版本**: 2026.2.19-2
- **Gateway Port**: 18789
- **SSH 配置**: 僅有 codespaces.auto 金鑰，無自定義 SSH config

### 1.2 現有配對設備
| 設備 ID | 平台 | 角色 | 狀態 |
|---------|------|------|------|
| c410398450a4... | darwin | operator | 已配對 |
| 228eebb51092... | Mac mini | node/operator | 已配對 |
| 332acc230503... | WebChat | operator | 已配對 |

---

## 2. SSH 雙機互援機制可行性評估

### 2.1 技術可行性: ✅ 可行

| 項目 | 評估 | 說明 |
|------|------|------|
| SSH 連線 | ✅ 可行 | 系統支援 SSH，可建立金鑰認證 |
| 遠程執行 | ✅ 可行 | 透過 SSH 執行遠程命令 |
| 自動化腳本 | ✅ 可行 | 可使用 Shell/Python 腳本 |
| 日誌監控 | ✅ 可行 | 可用 tail/grep 監控日誌 |
| 故障偵測 | ✅ 可行 | 可用 ping/health check |

### 2.2 架構選擇

#### 方案 A: 傳統 SSH 金鑰互援
```
[Mac mini] <--SSH--> [目標主機 (如 Linux 伺服器)]
```

#### 方案 B: OpenClaw Gateway 互援
```
[Mac mini Gateway:18789] <---> [目標 Gateway]
```

#### 方案 C: 混合架構 (推薦)
- 使用 SSH 進行基礎遠程控制
- 使用 OpenClaw Gateway 進行高層次控制
- 使用 Cron 排程自動監控

---

## 3. 自動監控日誌腳本需求規劃

### 3.1 監控目標

| 類型 | 監控項目 | 頻率 |
|------|----------|------|
| 系統日誌 | /var/log/system.log | 即時 |
| OpenClaw 日誌 | ~/.openclaw/logs/ | 即時 |
| SSH 連線 | 連線紀錄 | 每分鐘 |
| 服務狀態 | OpenClaw Gateway | 每分鐘 |
| 磁碟空間 | 使用率 | 每5分鐘 |
| 記憶體 | 使用量 | 每5分鐘 |

### 3.2 腳本功能需求

```bash
# 需求清單
1. 日誌監控腳本 (log_monitor.sh)
   - 監控指定日誌檔案
   - 關鍵字過濾 (ERROR, CRITICAL, FAIL)
   - 即時通知 (Telegram/Line)
   - 日誌輪轉支援

2. 健康檢查腳本 (health_check.sh)
   - Ping 檢查
   - Port 連線檢查
   - 服務程序檢查
   - 自動重啟機制

3. 故障轉移腳本 (failover.sh)
   - 主機狀態判斷
   - 自動切換邏輯
   - 通知機制
   - 切換日誌紀錄

4. 備份同步腳本 (sync.sh)
   - 設定檔同步
   - 日誌歸檔同步
   - 差異備份
```

### 3.3 腳本架構

```
~/.openclaw/scripts/
├── log_monitor.sh      # 日誌監控
├── health_check.sh     # 健康檢查
├── failover.sh         # 故障轉移
├── sync.sh             # 同步備份
└── config/
    ├── hosts.conf      # 主機列表
    ├── alerts.conf     # 通知設定
    └── thresholds.conf # 閾值設定
```

---

## 4. 實作階段規劃

### Phase 1: 基礎建設 (Week 1)
- [ ] 建立 SSH 金鑰對
- [ ] 設定 SSH config
- [ ] 測試 SSH 連線
- [ ] 建立 scripts 目錄

### Phase 2: 監控系統 (Week 2)
- [ ] 部署 log_monitor.sh
- [ ] 部署 health_check.sh
- [ ] 設定 Cron 排程
- [ ] 整合 Telegram 通知

### Phase 3: 自動化 (Week 3)
- [ ] 部署 failover.sh
- [ ] 部署 sync.sh
- [ ] 測試故障情境
- [ ] 文件化操作流程

---

## 5. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| SSH 金鑰過期 | 連線中斷 | 設定自動更新 |
| 網路中斷 | 監控失效 | 本地緩存+重連 |
| 腳本錯誤 | 誤判故障 | 多重驗證機制 |
| 日誌過大 | 效能問題 | 日誌輪轉 |

---

## 6. 預期效益

1. **自動化管理**: 減少人工干預
2. **快速回應**: 故障發生時立即通知
3. **數據備援**: 重要資料同步備份
4. **故障轉移**: 服務不中斷

---

## 7. 下一步行動

1. ✅ 技術可行性評估 - **完成**
2. ⏳ 確認目標 SSH 主機名單
3. ⏳ 建立 SSH 金鑰並配置
4. ⏳ 開發監控腳本
5. ⏳ 設定 Cron 排程
6. ⏳ 測試與文件化

---

**文件狀態**: 技術規劃階段  
**下一步**: 等待昌松確認目標主機及優先順序
