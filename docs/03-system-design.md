# Guardrail Workshop 系統設計（精簡版）

| 文件項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件日期 | 2026-11-14 |
| 狀態 | 依現況盤點補齊 |
| 專案級別 | 公開級 |
| 依據 | Harbor `standards/DevelopmentStandards.md`、`standards/DeploymentHandbook.md` |

## 1. 設計限制

- **零月費**：公開教學站只部署純靜態前端至 GitHub Pages；預設 Demo 模式完全在瀏覽器內執行，不產生雲端算力或 LLM API 費用。
- **規則單一來源**：所有驗證器規則、模式與預設情境定義於 `shared/guard-rules.json`，由前端 TypeScript 引擎與後端 Python 引擎共同讀取。
- **安全與離線友善**：`frontend/index.html` 以 CSP 限制連線對象為 `'self'`、`harbor-1wk.pages.dev` 與本機 `localhost`／`127.0.0.1`；Harbor 維護腳本設 800ms fail-open 逾時，不阻塞頁面渲染。

## 2. 架構總覽

```text
shared/guard-rules.json（9 個驗證器、10 個情境、延遲基準）
  ├─ 前端 SPA（React 19 + TypeScript + Vite → GitHub Pages）
  │    ├─ Demo 模式（預設）：frontend/src/guard/engine.ts + stub.ts + localStorage
  │    └─ Live API 模式（本機練習）：HTTP fetch → http://127.0.0.1:8000/api/*
  └─ 後端服務（Python 3.12 + FastAPI + SQLite，本機選用啟動）
       ├─ backend/app/guard.py + validators.py（regex / keyword / topic / grounding / json_schema）
       ├─ backend/app/llm.py（預設確定性 stub；有 API key 時可選用 Anthropic SDK）
       └─ backend/app/store.py（SQLite events 資料表）
```

## 3. 目錄與模組

```text
shared/guard-rules.json       前後端共用規則與情境單一來源
frontend/src/
  App.tsx                     Hash 路由（11 單元 + #playground + #dashboard）
  api.ts                      Demo／Live API 雙模式切換介面
  content/lessons.tsx         11 個教學單元內容
  components/                 Playground.tsx、Dashboard.tsx、ResultView.tsx、ui.tsx
  guard/                      瀏覽器端護欄引擎（engine.ts）、stub（stub.ts）、localStorage（events.ts）
backend/app/
  main.py                     FastAPI 應用與 REST API 端點
  guard.py / validators.py    護欄執行器與 5 類驗證引擎（優先序：exception > reask > fix > noop）
  rules.py / models.py        規則載入與 Pydantic 資料模型
  llm.py / store.py           LLM 介面／stub 與 SQLite 事件儲存
backend/tests/                24 項 pytest 單元與 API 整合測試
```

## 4. 部署與 CI 驗證

- **CI（`.github/workflows/ci.yml`）**：
  - 後端（Python 3.12 + `uv`）：安裝 `backend/requirements-dev.txt`、執行 `pip-audit`、執行 `python -m pytest`（24 項測試）。
  - 前端（Node 24.22.1）：`npm ci`、`npm audit --audit-level=high`、`npm run build`。
- **部署（`.github/workflows/deploy-pages.yml`）**：僅於 `refs/heads/main` 且 actor 為 repo 擁有者時，帶入 `VITE_BASE=/guardrail-workshop/` 建置 `frontend/dist`，複製 `index.html` 為 `404.html`，部署至 GitHub Pages。

## 5. 零月費與效能邊界

| 項目 | 現況與邊界 |
|---|---|
| 託管與資料庫 | 公開站使用 GitHub Pages 免費靜態託管；狀態存於瀏覽器 `localStorage` 或本機 SQLite |
| LLM 成本控制 | 預設使用確定性 stub 回覆；`/api/chat` 於 Input Guard 觸發阻斷或重問時立即短路，不呼叫 LLM |
| 延遲模型與體積 | Playground 與 `/api/config` 內建 regex（~5ms）、小型分類器（~30ms）與 LLM（~1000ms）之循序／並行延遲對比；前端產物約 ~85KB gzip |
| 效能驗收狀態 | 後端 24 項測試與前端建置通過 CI；正式站實際瀏覽器載入分位數（p50/p95）尚未獨立量測（待補） |
