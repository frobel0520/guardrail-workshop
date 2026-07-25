# Frontend — React 教材站 + 互動實驗場

Vite + React + TypeScript。11 頁課程內容（來自投影片）、一個互動實驗場、一個攔截事件 dashboard。

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產出 dist/
```

## 兩種資料來源

右上角可以切換：

| 模式 | 跑在哪 | 事件存在哪 | 什麼時候用 |
| --- | --- | --- | --- |
| **Demo** | 瀏覽器（`src/guard/engine.ts`） | localStorage | 預設。GitHub Pages 上的線上版就是這個 |
| **Live API** | 本機 FastAPI | 後端 SQLite | 想看真的後端、或接真的 Claude 時 |

兩邊回傳同一組型別（`src/types.ts`），所以 UI 不需要知道自己接的是哪一種。

> **為什麼要有 Demo 模式？** GitHub Pages 只服務靜態檔案，跑不了 Python。
> 為了讓線上版沒有後端也能完整互動，`src/guard/engine.ts` 用 TypeScript 重寫了一份
> guard 執行邏輯——但**規則本身不重複**：兩套實作都讀 `shared/guard-rules.json`。
> 加一條 regex 只要改那一個檔案，前後端同時生效。

## 檔案地圖

| 路徑 | 作用 |
| --- | --- |
| `src/content/lessons.tsx` | 11 頁課程內容（投影片的可讀版本） |
| `src/guard/engine.ts` | Demo 模式的 guard 引擎，對應 `backend/app/validators.py` |
| `src/guard/stub.ts` | Demo 模式的假 LLM，對應 `backend/app/llm.py` |
| `src/guard/events.ts` | Demo 模式的事件日誌，對應 `backend/app/store.py` |
| `src/api.ts` | Demo / Live 兩種 client，同一組介面 |
| `src/components/Playground.tsx` | 互動實驗場 |
| `src/components/Dashboard.tsx` | 攔截事件統計 |

## 部署

`.github/workflows/deploy-pages.yml` 會在 push 到 `main` 時建置並發佈到 GitHub Pages。
`VITE_BASE` 由 workflow 自動帶入 repo 名稱，所以 fork 或改名都不用改設定。

本機要模擬 Pages 的路徑：

```bash
VITE_BASE=/guardrail-workshop/ npm run build && npm run preview
```
