import type { GuardResult, Outcome, ValidatorResult } from "../types";

const OUTCOME_TEXT: Record<Outcome, { label: string; hint: string }> = {
  pass: { label: "通過", hint: "所有啟用的檢查都過了，原文直接放行。" },
  fixed: { label: "已修正 (fix)", hint: "有 validator 沒過，但策略是修正——違規片段已被遮罩後放行。" },
  reask: { label: "要求重問 (reask)", hint: "沒過且策略是重問——正式環境會把失敗原因回饋給 LLM 重新生成。" },
  blocked: { label: "已攔下 (exception)", hint: "有高風險 validator 沒過，整段內容不放行。" },
};

const ACTION_LABEL: Record<string, string> = {
  exception: "攔下",
  fix: "修正",
  reask: "重問",
  noop: "記錄",
};

function ValidatorRow({ item, revealMatches }: { item: ValidatorResult; revealMatches: boolean }) {
  return (
    <div className="result-row">
      <span className={`result-dot ${item.passed ? "ok" : "fail"}`} />
      <div style={{ flex: 1 }}>
        <div>
          <strong>{item.name}</strong>
          <span className={`tag ${item.on_fail}`} title="這個 validator 沒過時採取的策略">
            失敗時：{ACTION_LABEL[item.on_fail] ?? item.on_fail}
          </span>
          <span className="tag">{item.latency_ms} ms</span>
        </div>
        {item.violations.length > 0 ? (
          <div className="violation">
            {item.violations.slice(0, 6).map((v, i) => (
              <div key={`${v.label}-${i}`}>
                {v.label}
                {revealMatches ? (
                  <>
                    ：<code>{v.matched_text.slice(0, 80)}</code>
                  </>
                ) : null}
              </div>
            ))}
            {item.violations.length > 6 ? <div>⋯還有 {item.violations.length - 6} 筆</div> : null}
          </div>
        ) : null}
        {item.detail ? <div className="violation">{item.detail}</div> : null}
      </div>
    </div>
  );
}

export function GuardResultView({
  result,
  title,
  revealOriginal = true,
}: {
  result: GuardResult;
  title?: string;
  revealOriginal?: boolean;
}) {
  const info = OUTCOME_TEXT[result.outcome];
  const changed = result.final_text !== result.original_text;
  // blocked／reask 的內容不會交付給使用者，Production 檢視不能顯示。
  const withheld = !revealOriginal && (result.outcome === "blocked" || result.outcome === "reask");

  return (
    <section>
      {title ? <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>{title}</h4> : null}
      <div className={`outcome-banner outcome-${result.outcome}`}>
        <span>{info.label}</span>
        <span style={{ fontWeight: 400, fontSize: 13.5 }}>{info.hint}</span>
      </div>

      {changed && revealOriginal ? (
        <>
          <div className="toggle-meta">處理前</div>
          <p className="text-out">{result.original_text}</p>
          <div className="toggle-meta">處理後（送出去的內容）</div>
          <p className="text-out">{result.final_text || "（整段被攔下，不送出）"}</p>
        </>
      ) : withheld ? (
        <div className="raw-hidden">Production 模式不顯示未交付給使用者的內容。</div>
      ) : (
        <p className="text-out">{result.final_text || result.original_text}</p>
      )}

      {result.reask_reason ? <div className="violation">重問原因：{result.reask_reason}</div> : null}

      <div style={{ marginTop: 8 }}>
        {result.results.length === 0 ? (
          <p className="note">這一層沒有啟用任何 validator。</p>
        ) : (
          result.results.map((item) => (
            <ValidatorRow key={item.validator_id} item={item} revealMatches={revealOriginal} />
          ))
        )}
      </div>

      <div className="metrics">
        <div>
          <b>{result.results.filter((r) => !r.passed).length}</b>
          沒通過的檢查
        </div>
        <div>
          <b>{result.sequential_latency_ms} ms</b>
          串行總延遲
        </div>
        <div>
          <b>{result.parallel_latency_ms} ms</b>
          平行執行延遲
        </div>
      </div>
    </section>
  );
}
