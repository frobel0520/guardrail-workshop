import { useMemo, useState } from "react";
import type { Client } from "../api";
import { RULES, defaultEnabledIds, validatorsForStage } from "../guard/engine";
import type { ChatResult, GuardResult, Stage } from "../types";
import { GuardResultView } from "./ResultView";
import { PageHeader } from "./ui";

type Mode = "pipeline" | Stage;

const MODE_LABEL: Record<Mode, string> = {
  pipeline: "完整 pipeline",
  input: "只跑 Input Guard",
  output: "只跑 Output Guard",
  tool: "只跑 Tool Guard",
};

const DEFAULT_SOURCES = `本款無線耳機提供 5 年有限保固，需於購買後 30 天內完成線上註冊。
保固不含人為損壞。標準出貨時間為下單後 2 個工作天。`;

export function Playground({ client }: { client: Client }) {
  const [mode, setMode] = useState<Mode>("pipeline");
  const [text, setText] = useState(
    RULES.scenarios.find((s) => s.id === "clean")?.text ?? "",
  );
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [useSources, setUseSources] = useState(false);
  const [enabled, setEnabled] = useState<Record<Stage, string[]>>({
    input: defaultEnabledIds("input"),
    output: defaultEnabledIds("output"),
    tool: defaultEnabledIds("tool"),
  });
  const [guardResult, setGuardResult] = useState<GuardResult | null>(null);
  const [chatResult, setChatResult] = useState<ChatResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStage: Stage = mode === "pipeline" ? "input" : mode;
  const scenarios = useMemo(
    () => RULES.scenarios.filter((s) => (mode === "pipeline" ? s.stage === "input" : s.stage === mode)),
    [mode],
  );

  function toggle(stage: Stage, id: string) {
    setEnabled((prev) => {
      const list = prev[stage];
      return {
        ...prev,
        [stage]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      };
    });
  }

  async function run() {
    setBusy(true);
    setError(null);
    setGuardResult(null);
    setChatResult(null);
    const options = {
      enabled: enabled[activeStage],
      sources: useSources ? [sources] : [],
    };
    try {
      if (mode === "pipeline") {
        setChatResult(await client.chat(text, options));
      } else {
        setGuardResult(await client.guard(mode, text, options));
      }
    } catch (err) {
      setError(
        `呼叫失敗：${(err as Error).message}。Live 模式請確認後端有跑起來（uvicorn app.main:app --app-dir backend），或切回 Demo 模式。`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="互動實驗場"
        subtitle="貼一段輸入或輸出，看每一層攔了什麼、用什麼策略處理、花了多少延遲。左側可以逐條開關 validator，觀察防護變薄之後會漏掉什麼。"
      />

      <div className="chips" style={{ marginBottom: 20 }}>
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <button
            key={m}
            className={`pill-btn ${mode === m ? "on" : ""}`}
            onClick={() => {
              setMode(m);
              setGuardResult(null);
              setChatResult(null);
            }}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="play">
        <div className="panel">
          <h4>輸入</h4>
          <textarea
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="貼上要檢查的文字⋯"
          />
          <div className="chips">
            {scenarios.map((s) => (
              <button key={s.id} className="chip" onClick={() => setText(s.text)}>
                {s.label}
              </button>
            ))}
          </div>

          {(mode === "output" || mode === "pipeline") && (
            <>
              <label className="toggle-row" style={{ borderBottom: 0 }}>
                <input type="checkbox" checked={useSources} onChange={(e) => setUseSources(e.target.checked)} />
                <span>
                  <strong>提供來源文件</strong>
                  <div className="toggle-meta">幻覺偵測會拿輸出裡的數值主張跟這份文件對照。</div>
                </span>
              </label>
              {useSources ? (
                <textarea
                  className="input"
                  style={{ minHeight: 90 }}
                  value={sources}
                  onChange={(e) => setSources(e.target.value)}
                />
              ) : null}
            </>
          )}

          <h4 style={{ marginTop: 22 }}>啟用的 validator（{activeStage}）</h4>
          {validatorsForStage(activeStage).map((spec) => (
            <label className="toggle-row" key={spec.id}>
              <input
                type="checkbox"
                checked={enabled[activeStage].includes(spec.id)}
                onChange={() => toggle(activeStage, spec.id)}
              />
              <span>
                <strong>{spec.name}</strong>
                <div className="toggle-meta">
                  {spec.description}（on_fail: <code>{spec.on_fail}</code> · {spec.latency_ms} ms）
                </div>
              </span>
            </label>
          ))}

          <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn" onClick={run} disabled={busy || !text.trim()}>
              {busy ? "檢查中⋯" : "跑一次檢查"}
            </button>
            <span className="toggle-meta">
              目前資料來源：<strong>{client.mode === "live" ? "本機 FastAPI" : "瀏覽器 Demo"}</strong>
            </span>
          </div>
        </div>

        <div className="panel">
          <h4>結果</h4>
          {error ? <div className="error-box">{error}</div> : null}

          {!guardResult && !chatResult && !error ? (
            <div className="empty">還沒有結果。左邊挑一個情境，按「跑一次檢查」。</div>
          ) : null}

          {guardResult ? <GuardResultView result={guardResult} /> : null}

          {chatResult ? (
            <>
              <GuardResultView result={chatResult.input_guard} title="① Input Guard" />
              {chatResult.llm_raw ? (
                <>
                  <h4 style={{ margin: "26px 0 12px", fontSize: 15 }}>
                    ② LLM 原始輸出（provider：{chatResult.llm_provider}）
                  </h4>
                  <p className="text-out">{chatResult.llm_raw}</p>
                </>
              ) : (
                <p className="note" style={{ marginTop: 20 }}>
                  ② LLM 沒有被呼叫——輸入就被擋下來了，token 與延遲都省下來了。
                </p>
              )}
              {chatResult.output_guard ? (
                <div style={{ marginTop: 26 }}>
                  <GuardResultView result={chatResult.output_guard} title="③ Output Guard" />
                </div>
              ) : null}
              <h4 style={{ margin: "26px 0 12px", fontSize: 15 }}>④ 使用者實際看到的回覆</h4>
              <p className="text-out">{chatResult.reply}</p>
              <div className="metrics">
                <div>
                  <b>{chatResult.total_latency_ms} ms</b>
                  整條 pipeline 實測耗時
                </div>
                <div>
                  <b>{chatResult.blocked ? "是" : "否"}</b>
                  是否被攔下
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
