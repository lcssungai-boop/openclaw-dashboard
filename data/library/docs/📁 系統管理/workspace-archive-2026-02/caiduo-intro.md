---
marp: true
theme: default
paginate: true
---

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap');

:root {
  --color-foreground: #ffffff;
  --color-heading: #ffffff;
  --color-accent: #ffd700;
  --font-default: 'Noto Sans TC', 'Hiragino Kaku Gothic ProN', sans-serif;
}

section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  color: var(--color-foreground);
  font-family: var(--font-default);
  font-weight: 400;
  box-sizing: border-box;
  position: relative;
  line-height: 1.7;
  font-size: 24px;
  padding: 56px;
}

section:nth-child(2n) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

section:nth-child(3n) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

section:nth-child(4n) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
  padding: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

h1 {
  font-size: 64px;
  line-height: 1.3;
  text-align: left;
}

h2 {
  position: absolute;
  top: 40px;
  left: 56px;
  right: 56px;
  font-size: 36px;
  padding-top: 0;
  padding-bottom: 16px;
}

h2::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 8px;
  width: 80px;
  height: 3px;
  background-color: var(--color-accent);
  box-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
}

h2 + * {
  margin-top: 100px;
}

h3 {
  color: var(--color-accent);
  font-size: 28px;
  margin-top: 24px;
  margin-bottom: 12px;
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

ul, ol {
  padding-left: 32px;
}

li {
  margin-bottom: 12px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

footer {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  position: absolute;
  left: 56px;
  right: 56px;
  bottom: 40px;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

section.lead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

section.lead h1 {
  margin-bottom: 24px;
  text-align: center;
  font-size: 72px;
}

section.lead p {
  font-size: 28px;
  color: var(--color-foreground);
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.role-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px 24px;
  margin: 12px 0;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.role-title {
  color: #ffd700;
  font-weight: 700;
  font-size: 26px;
  margin-bottom: 8px;
}

.role-desc {
  font-size: 20px;
  opacity: 0.95;
}

.emoji-big {
  font-size: 80px;
  margin-bottom: 16px;
}

.stats {
  display: flex;
  justify-content: space-around;
  margin-top: 30px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 48px;
  font-weight: 700;
  color: #ffd700;
}

.stat-label {
  font-size: 18px;
  opacity: 0.9;
}

strong {
  color: var(--color-accent);
  font-weight: 700;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
}
</style>

<!-- _class: lead -->

<div class="emoji-big">🎯</div>

# 才多 Duo

**昌松的 AI 商務特助**

v2.2 | MiniMax M2.5 | OpenClaw

---

## 四大專業角色

<div class="role-card">
<div class="role-title">🏭 才多多工作</div>
<div class="role-desc">移工/僑外生/人力資源管理</div>
</div>

<div class="role-card">
<div class="role-title">🏢 兆鯨顧問</div>
<div class="role-desc">企業顧問/物業/電商協助</div>
</div>

<div class="role-card">
<div class="role-title">💻 開發優化師</div>
<div class="role-desc">Skill開發/Bug修復/自動化</div>
</div>

<div class="role-card">
<div class="role-title">📊 理財分析師</div>
<div class="role-desc">股市追蹤/投資組合/資產配置</div>
</div>

---

## 核心特質

- **精簡高效** — 不說廢話，直接做事
- **主動前瞻** — 提前想到你需要的
- **專業嚴謹** — 法規流程準確無誤
- **記憶體優化** — 在 8GB Mac Mini 上跑得很順

---

## 技能裝備

| 類別 | 技能 |
|------|------|
| 📄 | 財務報表、差異分析、對帳 |
| 🎯 | 產品規格、路線圖、競品分析 |
| 🔍 | 網路搜尋、資料研究、PDF處理 |
| 🤖 | OpenClaw 開發、自動化流程 |
| 📝 | Apple Notes、Reminders、Obsidian |

---

## 呼叫指令

| 你說 | 我做 |
|------|------|
| "切才多多" | 切換人力資源模式 |
| "切兆鯨" | 切換企業顧問模式 |
| "kimi" | 切換 Kimi 2.5 模型 |
| "minimax" | 切換 MiniMax M2.5 |

---

<!-- _class: lead -->

<div class="emoji-big">🚀</div>

# 隨時待命

**有什麼需要幫忙的嗎？**

---

*Made with ❤️ by 才多 Duo | 2026-02*