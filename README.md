# Guardrail Workshop

> **Guardrail Fundamentals — LLM 應用的安全防護層：風險、架構與框架選型**
> AI/ML Engineer 學習系列 · 第一課

把投影片變成一個**可以動手玩、也可以 clone 下來改**的教材站：11 頁課程內容、一個即時互動的
guardrail 實驗場，加上一個真的會跑的 FastAPI 縱深防禦服務。

🔗 **線上版：** https://frobel0520.github.io/guardrail-workshop/

---

## 這個專案在教什麼

投影片的三個學習目標，在同一個 repo 匯流：

| 概念 | 在哪裡看得到 |
| --- | --- |
| Guardrail 是 LLM 與世界之間的驗證層 | 課程頁 + `backend/app/guard.py` |
| 掛載在 input / output / tool 三個位置 | 實驗場的四種模式 |
| 失敗時可以攔（exception）、修（fix）、重問（reask） | `shared/guard-rules.json` 每個 validator 的 `on_fail` |
| 每一層檢查都有延遲價目表 | 實驗場結果區的「串行 / 平行延遲」 |
| 縱深防禦才是常態 | `POST /api/chat` 的兩層 pipeline |

---

## 30 秒上手

只想看教材、玩實驗場——**什麼都不用裝**，直接開[線上版](https://frobel0520.github.io/guardrail-workshop/)。
線上版的檢查邏輯跑在你自己的瀏覽器裡，沒有任何資料送到伺服器。

想跑完整的後端版本：

```bash
git clone https://github.com/frobel0520/guardrail-workshop.git
cd guardrail-workshop
```

```bash
python -m venv .venv && .venv/Scripts/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --app-dir backend --port 8000
```

```bash
cd frontend && npm install && npm run dev
```

打開 http://localhost:5173 ，右上角切成 **Live API**，位址填 `http://localhost:8000`。

---

## 架構：為什麼前端有一份「一樣的」guard 邏輯

**GitHub Pages 只服務靜態檔案，跑不了 Python。** 所以這個專案是這樣拆的：

```
                     ┌─────────────────────────────────────┐
                     │  shared/guard-rules.json            │
                     │  規則的唯一真相：validator、pattern、  │
                     │  on_fail 策略、示範情境、延遲參考值     │
                     └───────────┬──────────────┬──────────┘
                                 │              │
                 讀同一份規則 ────┘              └──── 讀同一份規則
                                 │              │
              ┌──────────────────▼───┐    ┌─────▼─────────────────┐
              │ backend/ (Python)    │    │ frontend/ (React+TS)  │
              │ FastAPI + SQLite     │    │ 教材站 + 實驗場         │
              │ 學員本機跑            │◄───┤ Live 模式打這裡         │
              │                      │    │ Demo 模式在瀏覽器自己跑  │
              └──────────────────────┘    └───────────┬───────────┘
                                                      │
                                              GitHub Pages（靜態）
```

前端的 `src/guard/engine.ts` 是後端 `app/validators.py` 的 TypeScript 對照版——
**執行邏輯寫兩次，規則只寫一次**。加一條 PII pattern 只要改 `shared/guard-rules.json`，兩邊同時生效。

這也是這堂課想傳達的一個實務點：guardrail 的規則應該是可版控、可測試的資料，
而不是散落在程式碼裡的 if-else。

---

## 目錄

| 路徑 | 內容 |
| --- | --- |
| `shared/guard-rules.json` | 9 個 validator、10 個示範情境、延遲參考值 |
| `backend/` | FastAPI 服務（[說明](backend/README.md)） |
| `frontend/` | React 教材站（[說明](frontend/README.md)） |
| `.github/workflows/ci.yml` | pytest + tsc + vite build |
| `.github/workflows/deploy-pages.yml` | 建置並發佈到 GitHub Pages |

## 內建的 validator

| Stage | Validator | 失敗策略 | 擋什麼 |
| --- | --- | --- | --- |
| input | Injection / Jailbreak 偵測 | exception | 「忽略以上指令」、角色扮演越獄、分隔符注入 |
| input | 輸入端憑證外洩 | fix | 使用者把 API key 貼進對話 |
| input | Moderation 內容審查 | exception | 仇恨、騷擾、暴力用語 |
| input | 離題偵測 | reask | 股票明牌、寫作業、政治話題 |
| output | PII 偵測與遮罩 | fix | Email、手機、身分證、信用卡、IP |
| output | 幻覺偵測 (grounding) | reask | 對照來源文件驗證數值主張 + 過度自信語言 |
| output | 結構化輸出驗證 | reask | JSON schema（預設關閉） |
| output | 企業政策檢查 | fix | 越權的退款承諾、投資建議、內部代號 |
| tool | Tool Guard：危險參數攔截 | exception | `DROP TABLE`、`rm -rf /`、外部收件人、高額轉帳 |

---

## 動手練習

1. **加一條你自己的 PII pattern。** `shared/guard-rules.json` 的 `pii_detection` 目前抓得到電話、Email、
   身分證，但抓不到中文姓名——這是刻意留的破口。試著補上你們公司的員工編號格式，看前後端是不是同時生效。
2. **把 `pii_detection` 的 `on_fail` 從 `fix` 改成 `exception`**，跑一次 `/api/chat`，
   感受一下「遮罩後放行」與「整段攔下」對使用者體驗的差別。
3. **在實驗場關掉 `prompt_injection`**，貼一段 injection，看它一路穿到 LLM 之後會發生什麼。
4. **接真的模型：** `pip install -r backend/requirements-llm.txt`、設 `ANTHROPIC_API_KEY`，
   `/api/chat` 就會呼叫真的 Claude（`claude-opus-5`）而不是內建 stub。
5. **加一個新的 engine**（`backend/app/validators.py`），例如接 LlamaGuard 之類的外部分類器。

---

## 開發

```bash
# 後端測試（24 個）
pip install -r backend/requirements-dev.txt
cd backend && python -m pytest

# 前端型別檢查 + 建置
cd frontend && npm run build
```

## 授權

MIT — 見 [LICENSE](LICENSE)。教材內容改寫自 `guardrail-workshop-proposal.pdf`。
