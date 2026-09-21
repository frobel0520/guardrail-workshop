import { useMemo, useState } from "react";
import type { Client } from "../api";
import { RULES, defaultEnabledIds, validatorsForStage } from "../guard/engine";
import type { ChatResult, GuardResult, Stage } from "../types";
import { GuardResultView } from "./ResultView";
import { PageHeader } from "./ui";

type Mode = "pipeline" | Stage;
type OutputView = "demo" | "production";

const MODE_LABEL: Record<Mode, string> = {
  pipeline: "完整 Pipeline",
  input: "Input Guard",
  output: "Output Guard",
  tool: "Tool Guard",
};

const DEFAULT_SOURCES = "產品保固期為 5 年；退貨需在 30 天內提出申請。延長保固最長可加購 2 年。";

export function Playground({ client }: { client: Client }) {
  const [mode, setMode] = useState<Mode>("pipeline");
  const [outputView, setOutputView] = useState<OutputView>("demo");
  const [text, setText] = useState(
    RULES.scenarios.find((scenario) => scenario.id === "clean")?.text ?? "",
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
    () => RULES.scenarios.filter((scenario) => (mode === "pipeline" ? scenario.stage === "input" : scenario.stage === mode)),
    [mode],
  );

  function toggle(stage: Stage, id: string) {
    setEnabled((previous) => {
      const ids = previous[stage];
      return {
        ...previous,
        [stage]: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
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
      setError(`執行失敗：${(err as Error).message}。若使用 Live API，請確認 FastAPI 已在 localhost:8000 啟動。`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Guardrail Playground"
        subtitle="執行 Guardrail，檢視模型原始輸出、判定依據，以及真正提供給使用者的最終內容。"
      />

      <div className="chips" style={{ marginBottom: 20 }}>
        {(Object.keys(MODE_LABEL) as Mode[]).map((item) => (
          <button
            key={item}
            className={`pill-btn ${mode === item ? "on" : ""}`}
            onClick={() => {
              setMode(item);
              setGuardResult(null);
              setChatResult(null);
            }}
          >
            {MODE_LABEL[item]}
          </button>
        ))}
      </div>

      <div className="play">
        <div className="panel">
          <h4>輸入內容</h4>
          <textarea
            className="input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="輸入要檢查的內容"
          />
          <div className="chips">
            {scenarios.map((scenario) => (
              <button key={scenario.id} className="chip" onClick={() => setText(scenario.text)}>
                {scenario.label}
              </button>
            ))}
          </div>

          {(mode === "output" || mode === "pipeline") ? (
            <>
              <label className="toggle-row" style={{ borderBottom: 0 }}>
                <input type="checkbox" checked={useSources} onChange={(event) => setUseSources(event.target.checked)} />
                <span>
                  <strong>提供 grounding 來源</strong>
                  <div className="toggle-meta">用來源資料檢查輸出中的數字與高自信主張。</div>
                </span>
              </label>
              {useSources ? (
                <textarea
                  className="input"
                  style={{ minHeight: 90 }}
                  value={sources}
                  onChange={(event) => setSources(event.target.value)}
                />
              ) : null}
            </>
          ) : null}

          <h4 style={{ marginTop: 22 }}>啟用的 validators（{activeStage}）</h4>
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
                  {spec.description}；on_fail: <code>{spec.on_fail}</code> · {spec.latency_ms} ms
                </div>
              </span>
            </label>
          ))}

          <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn" onClick={run} disabled={busy || !text.trim()}>
              {busy ? "檢查中…" : "執行 Guardrail"}
            </button>
            <span className="toggle-meta">
              目前來源：<strong>{client.mode === "live" ? "Live FastAPI" : "本機 Demo"}</strong>
            </span>
          </div>
        </div>

        <div className="panel">
          <h4>執行結果</h4>
          {error ? <div className="error-box">{error}</div> : null}

          {!guardResult && !chatResult && !error ? <div className="empty">選擇案例或輸入內容後，執行 Guardrail 查看結果。</div> : null}

          {guardResult ? <GuardResultView result={guardResult} /> : null}

          {chatResult ? (
            <>
              <div className="output-view-switch">
                <div>
                  <strong>輸出檢視</strong>
                  <div className="toggle-meta">Demo 會揭露 raw output；Production 只呈現可安全交付的內容。</div>
                </div>
                <div className="chips" style={{ margin: 0 }}>
                  {(["demo", "production"] as OutputView[]).map((item) => (
                    <button
                      key={item}
                      className={`pill-btn ${outputView === item ? "on" : ""}`}
                      onClick={() => setOutputView(item)}
                    >
                      {item === "demo" ? "Demo" : "Production"}
                    </button>
                  ))}
                </div>
              </div>

              <section className="output-stage">
                <h4>1. Input Guard</h4>
                <GuardResultView result={chatResult.input_guard} />
              </section>

              <section className="output-stage">
                <h4>2. 模型原始回覆（{chatResult.llm_provider}）</h4>
                {chatResult.llm_raw ? (
                  outputView === "demo" ? (
                    <>
                      <div className="demo-warning">僅供教學檢視：此內容可能含有尚未處理的敏感資訊。</div>
                      <p className="text-out raw-output">{chatResult.llm_raw}</p>
                    </>
                  ) : (
                    <div className="raw-hidden">Production 模式不顯示未經 Guardrail 處理的模型原始回覆。</div>
                  )
                ) : (
                  <p className="note">Input Guard 已阻擋或要求重新提問，因此沒有呼叫模型。</p>
                )}
              </section>

              {chatResult.output_guard ? (
                <section className="output-stage">
                  <h4>3. Output Guard 判定</h4>
                  <GuardResultView result={chatResult.output_guard} revealOriginal={outputView === "demo"} />
                </section>
              ) : null}

              <section className="output-stage final-output">
                <h4>{chatResult.output_guard ? "4" : "3"}. 使用者最終看到的內容</h4>
                <p className="text-out">{chatResult.reply}</p>
              </section>

              <div className="metrics">
                <div>
                  <b>{chatResult.total_latency_ms} ms</b>
                  Pipeline 總延遲
                </div>
                <div>
                  <b>{chatResult.blocked ? "是" : "否"}</b>
                  是否被阻擋
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
