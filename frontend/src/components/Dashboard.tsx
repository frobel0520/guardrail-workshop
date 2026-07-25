import { useCallback, useEffect, useState } from "react";
import type { Client } from "../api";
import type { Stats } from "../types";
import { PageHeader } from "./ui";

const STAGE_LABEL: Record<string, string> = {
  input: "Input Guard",
  output: "Output Guard",
  tool: "Tool Guard",
};

const OUTCOME_LABEL: Record<string, string> = {
  blocked: "攔下",
  fixed: "修正",
  reask: "重問",
  pass: "通過",
};

function Breakdown({ title, data, labels }: { title: string; data: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="panel">
      <h4>{title}</h4>
      {entries.length === 0 ? (
        <p className="note">尚無資料。</p>
      ) : (
        <div className="bars">
          {entries.map(([key, n]) => (
            <div className="bar-row" key={key} style={{ gridTemplateColumns: "120px 1fr" }}>
              <div className="bar-label">{labels?.[key] ?? key}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(n / max) * 100}%` }} />
                <span className="bar-value">{n}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Dashboard({ client }: { client: Client }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setStats(await client.stats());
    } catch (err) {
      setError(`讀取失敗：${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function clearAll() {
    try {
      await client.clearEvents();
      await refresh();
    } catch (err) {
      setError(`清除失敗：${(err as Error).message}`);
    }
  }

  return (
    <>
      <PageHeader
        title="攔截事件 Dashboard"
        subtitle="每一次沒通過的檢查都會留下一筆事件。Demo 模式存在瀏覽器 localStorage，Live 模式存在後端 SQLite——這就是投影片 capstone 說的「資料庫記錄攔截事件」。"
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn ghost" onClick={() => void refresh()} disabled={busy}>
          {busy ? "更新中⋯" : "重新整理"}
        </button>
        <button className="btn ghost" onClick={() => void clearAll()}>
          清空事件
        </button>
        <span className="toggle-meta">
          資料來源：<strong>{client.mode === "live" ? "本機 FastAPI (SQLite)" : "瀏覽器 localStorage"}</strong>
        </span>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      {stats ? (
        <>
          <div className="stat-grid">
            <div className="stat">
              <div className="n">{stats.total_events}</div>
              <div className="k">攔截事件總數</div>
            </div>
            <div className="stat">
              <div className="n">{stats.by_outcome.blocked ?? 0}</div>
              <div className="k">被攔下 (exception)</div>
            </div>
            <div className="stat">
              <div className="n">{stats.by_outcome.fixed ?? 0}</div>
              <div className="k">被修正 (fix)</div>
            </div>
            <div className="stat">
              <div className="n">{stats.by_outcome.reask ?? 0}</div>
              <div className="k">要求重問 (reask)</div>
            </div>
          </div>

          <div className="grid cols-2" style={{ marginBottom: 28 }}>
            <Breakdown title="依掛載點" data={stats.by_stage} labels={STAGE_LABEL} />
            <Breakdown title="依風險類型" data={stats.by_category} />
          </div>

          <h3 className="block-title">最近的攔截</h3>
          {stats.recent.length === 0 ? (
            <div className="empty">還沒有攔截事件。到「互動實驗場」跑幾個惡意情境就會出現。</div>
          ) : (
            <div className="scroll-x">
              <table className="events">
                <thead>
                  <tr>
                    <th>時間</th>
                    <th>掛載點</th>
                    <th>Validator</th>
                    <th>命中</th>
                    <th>處理</th>
                    <th>片段</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((e) => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{e.created_at.replace("T", " ").replace("Z", "")}</td>
                      <td>{STAGE_LABEL[e.stage] ?? e.stage}</td>
                      <td>{e.validator_id}</td>
                      <td>{e.label}</td>
                      <td>
                        <span className={`tag ${e.on_fail}`}>{OUTCOME_LABEL[e.outcome] ?? e.outcome}</span>
                      </td>
                      <td className="excerpt">{e.excerpt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
