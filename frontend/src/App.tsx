import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_API_URL,
  createClient,
  loadApiUrl,
  loadMode,
  saveApiUrl,
  saveMode,
  type Mode,
} from "./api";
import { Dashboard } from "./components/Dashboard";
import { Playground } from "./components/Playground";
import { Icon, PageHeader } from "./components/ui";
import { LESSONS } from "./content/lessons";
import { RULES } from "./guard/engine";

const LAB_ROUTES = [
  { id: "playground", nav: "互動實驗場" },
  { id: "dashboard", nav: "攔截事件" },
];

const ALL_ROUTES = [...LESSONS.map((l) => l.id), ...LAB_ROUTES.map((l) => l.id)];

function useHashRoute(): [string, (id: string) => void] {
  const read = () => {
    const raw = window.location.hash.replace(/^#\/?/, "");
    return ALL_ROUTES.includes(raw) ? raw : LESSONS[0].id;
  };
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return [route, (id: string) => { window.location.hash = `/${id}`; }];
}

function ModeSwitch({
  mode,
  setMode,
  apiUrl,
  setApiUrl,
  health,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  apiUrl: string;
  setApiUrl: (u: string) => void;
  health: "unknown" | "ok" | "bad";
}) {
  return (
    <div className="topbar">
      <div className="mode-switch">
        <span style={{ color: "var(--muted)" }}>資料來源</span>
        <button className={`pill-btn ${mode === "demo" ? "on" : ""}`} onClick={() => setMode("demo")}>
          Demo（瀏覽器）
        </button>
        <button className={`pill-btn ${mode === "live" ? "on" : ""}`} onClick={() => setMode("live")}>
          Live API（本機後端）
        </button>
        {mode === "live" ? (
          <>
            <input
              className="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={DEFAULT_API_URL}
              aria-label="後端位址"
            />
            <span style={{ color: "var(--muted)" }}>
              <span className={`status-dot ${health === "ok" ? "ok" : health === "bad" ? "bad" : ""}`} />
              {health === "ok" ? "已連線" : health === "bad" ? "連不上" : "檢查中"}
            </span>
          </>
        ) : null}
      </div>
      <span style={{ color: "var(--muted)" }}>規則版本 v{RULES.version}</span>
    </div>
  );
}

export default function App() {
  const [route, go] = useHashRoute();
  const [mode, setModeState] = useState<Mode>(loadMode);
  const [apiUrl, setApiUrlState] = useState<string>(loadApiUrl);
  const [health, setHealth] = useState<"unknown" | "ok" | "bad">("unknown");

  const client = useMemo(() => createClient(mode, apiUrl), [mode, apiUrl]);

  useEffect(() => {
    if (mode !== "live") {
      setHealth("unknown");
      return;
    }
    let cancelled = false;
    setHealth("unknown");
    client
      .health()
      .then(() => !cancelled && setHealth("ok"))
      .catch(() => !cancelled && setHealth("bad"));
    return () => {
      cancelled = true;
    };
  }, [client, mode]);

  function setMode(next: Mode) {
    setModeState(next);
    saveMode(next);
  }

  function setApiUrl(next: string) {
    setApiUrlState(next);
    saveApiUrl(next);
  }

  const lessonIndex = LESSONS.findIndex((l) => l.id === route);
  const lesson = lessonIndex >= 0 ? LESSONS[lessonIndex] : null;

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-mark" style={{ color: "#fff" }}>
            <Icon name="shield" size={20} />
          </span>
          <span className="brand-title">Guardrail Workshop</span>
        </div>
        <p className="brand-sub">AI/ML Engineer 學習系列 · 第一課</p>

        <div className="nav-group-label">課程</div>
        {LESSONS.map((l, i) => (
          <button
            key={l.id}
            className={`nav-link ${route === l.id ? "active" : ""}`}
            onClick={() => go(l.id)}
          >
            <span className="nav-num">{String(i + 1).padStart(2, "0")}</span>
            <span>{l.nav}</span>
          </button>
        ))}

        <div className="nav-group-label">動手做</div>
        {LAB_ROUTES.map((l) => (
          <button
            key={l.id}
            className={`nav-link ${route === l.id ? "active" : ""}`}
            onClick={() => go(l.id)}
          >
            <span className="nav-num">▸</span>
            <span>{l.nav}</span>
          </button>
        ))}
      </nav>

      <main className="content">
        <ModeSwitch mode={mode} setMode={setMode} apiUrl={apiUrl} setApiUrl={setApiUrl} health={health} />

        {lesson ? (
          <>
            <PageHeader title={lesson.title} subtitle={lesson.subtitle} />
            {lesson.render()}
            <div className="pager">
              {lessonIndex > 0 ? (
                <button className="btn ghost" onClick={() => go(LESSONS[lessonIndex - 1].id)}>
                  ← {LESSONS[lessonIndex - 1].nav}
                </button>
              ) : (
                <span />
              )}
              {lessonIndex < LESSONS.length - 1 ? (
                <button className="btn ghost" onClick={() => go(LESSONS[lessonIndex + 1].id)}>
                  {LESSONS[lessonIndex + 1].nav} →
                </button>
              ) : (
                <button className="btn ghost" onClick={() => go("playground")}>
                  互動實驗場 →
                </button>
              )}
            </div>
          </>
        ) : null}

        {route === "playground" ? <Playground client={client} /> : null}
        {route === "dashboard" ? <Dashboard client={client} /> : null}
      </main>
    </div>
  );
}
