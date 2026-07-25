# Backend — FastAPI Guardrail 服務

投影片 capstone 的可跑版本：一條 `使用者輸入 → Input Guard → LLM → Output Guard → 應用` 的
pipeline，每一層攔了什麼都會回傳，並寫進 SQLite 事件表。

## 跑起來

```bash
python -m venv .venv && .venv/Scripts/activate   # macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --app-dir backend --port 8000
```

打開 http://localhost:8000/docs 看互動式 API 文件。

前端接上來（在 repo 根目錄另開一個終端）：

```bash
cd frontend && npm install && npm run dev
```

前端右上角把模式切成 **Live API**、位址填 `http://localhost:8000` 就接上了。

## 架構

| 檔案 | 角色 | 對應投影片概念 |
| --- | --- | --- |
| `app/rules.py` | 載入 `shared/guard-rules.json` | Hub：預建 validator 的市集 |
| `app/validators.py` | 單一檢查邏輯（regex / keyword / topic / grounding / json_schema） | Validator |
| `app/guard.py` | 串起多個 validator，決定 pass / fixed / reask / blocked | Guard + OnFailAction |
| `app/llm.py` | 有 `ANTHROPIC_API_KEY` 就接 Claude，否則走內建 stub | LLM |
| `app/store.py` | 攔截事件日誌（SQLite） | Dashboard 的資料來源 |
| `app/main.py` | FastAPI 路由 | 縱深防禦 demo |

失敗策略的優先序是 `exception > reask > fix > pass`——只要有一條 validator 要求攔下，整段就是 blocked。

## API

| Method | Path | 說明 |
| --- | --- | --- |
| GET | `/api/health` | 健康檢查 + 目前規則版本 |
| GET | `/api/config` | validator 清單、示範情境、延遲參考值 |
| POST | `/api/guard/input` | 只跑 input 這一層 |
| POST | `/api/guard/output` | 只跑 output 這一層 |
| POST | `/api/guard/tool` | 只跑 tool 這一層 |
| POST | `/api/chat` | 完整 pipeline（含 LLM） |
| GET | `/api/events` | 最近的攔截事件 |
| GET | `/api/stats` | 依 stage / category / outcome 的統計 |
| DELETE | `/api/events` | 清空事件表 |

`POST /api/guard/*` 的 body：

```json
{
  "text": "要檢查的文字",
  "enabled": ["prompt_injection", "toxicity"],
  "sources": ["幻覺檢查要對照的來源文件"]
}
```

`enabled` 省略時，套用規則檔裡各 validator 的 `enabled_by_default`。

## 環境變數

| 變數 | 預設 | 用途 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 無 | 設了才會呼叫真的 Claude（`claude-opus-5`），否則走 stub |
| `GUARDRAIL_DB` | `backend/guardrail_events.db` | 事件表位置 |
| `GUARDRAIL_RULES_PATH` | `shared/guard-rules.json` | 換一份規則檔 |
| `GUARDRAIL_CORS_ORIGINS` | `*` | 逗號分隔的允許來源 |

接真的模型：`pip install -r backend/requirements-llm.txt` 再設 `ANTHROPIC_API_KEY`。

## 測試

```bash
pip install -r backend/requirements-dev.txt
cd backend && python -m pytest
```

## 動手練習

1. 在 `shared/guard-rules.json` 加一條你自己的 PII pattern（例如公司員工編號），前後端會同時吃到。
2. 把 `pii_detection` 的 `on_fail` 從 `fix` 改成 `exception`，看 `/api/chat` 的行為怎麼變。
3. 在 `validators.py` 加一個新的 engine（例如接 LlamaGuard 之類的外部分類器）。
4. 把 `store.py` 換成 PostgreSQL——schema 不用動。
