# Guardrail Workshop 專案計畫

| 文件項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件日期 | 2026-11-14 |
| 狀態 | 依現況盤點補齊（已上線公開級教學網站與本機可執行後端） |
| 產品類型 | LLM 安全護欄教學工作坊與互動實驗室 |
| 專案級別 | 公開級 |
| 每月預算上限 | NT$0（零月費硬性規則） |
| 版控／部署 | GitHub `frobel0520/guardrail-workshop`／GitHub Pages（前端靜態版） |
| SDLC | Planning → SA → SD／ADR → Task DAG → 開發測試 → CI／Release Gate |

## 1. 摘要

Guardrail Workshop（Guardrail Fundamentals — LLM 應用的安全防護層：風險、架構與框架選型）將投影片教材轉化為可操作、可 clone 的互動教學網站，包含 11 個教學單元、瀏覽器端即時護欄 Playground、事件儀表板，以及可在本機啟動的 FastAPI 縱深防禦後端。本專案同時作為 Learning Atlas 的「AI 安全」學習路線。

## 2. 目標學習者

- 正在開發 LLM 應用、需要導入 Input／Output／Tool Guard 的軟體工程師與 AI/ML 工程師。
- 希望在零成本環境下比較護欄檢查類型、延遲代價與框架選型的學習者。

## 3. 目標與成功標準

| 目標 | 成功標準 |
|---|---|
| 系統化掌握 LLM 護欄 | 11 個主題單元上線，涵蓋風險、掛載點、檢查類型、框架比較、延遲與縱深防禦 |
| 零門檻互動練習 | 線上版不依賴後端即能於瀏覽器 Demo 模式操作 Input／Output／Tool Guard 與完整 Chat 管線 |
| 前後端規則一致 | 前後端共用 `shared/guard-rules.json`，確保示範情境與驗證規則單一來源 |
| 可在本機對接真實後端 | 提供 FastAPI + SQLite 後端與可選的 Anthropic SDK 接線，支援 Live API 模式切換 |
| 零月費與 CI 把關 | 公開版純靜態部署於 GitHub Pages；後端 pytest（24 項測試）與前端建置通過 CI |

## 4. 範圍

### 4.1 已實作範圍（現況）

- **11 個教學單元（`frontend/src/content/lessons.tsx`）**：`intro`、`risks`、`what-is`、`mount-points`、`check-types`、`frameworks`、`guardrails-ai`、`latency`、`defense-in-depth`、`roadmap`、`takeaways`。
- **互動實驗室（`#playground`）**：支援 Input Guard、Output Guard、Tool Guard 與完整 Chat 管線，提供預設攻擊／異常情境、個別驗證器開關、循序／並行延遲估算與 Demo／Production 檢視切換。
- **事件儀表板（`#dashboard`）**：彙整攔截階段、類別與結果統計，提供篩選與清除功能。
- **FastAPI 後端（`backend/`）**：提供 `/api/health`、`/api/config`、`/api/guard/input`、`/api/guard/output`、`/api/guard/tool`、`/api/chat`、`/api/events`、`/api/stats` 端點與 SQLite 事件持久化；預設使用確定性 stub 回覆，設 `ANTHROPIC_API_KEY` 時可選接 Anthropic Claude。

### 4.2 明確排除

- 公開託管付費後端伺服器或代墊線上 LLM API 呼叫費用。
- 使用者帳號、登入驗證或多租戶資料隔離。
- 雲端外部資料庫（本機練習使用 SQLite，線上 Demo 使用 `localStorage`）。
