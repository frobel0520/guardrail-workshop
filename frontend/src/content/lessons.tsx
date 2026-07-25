import type { ReactNode } from "react";
import { RULES } from "../guard/engine";
import { BlockTitle, Grid, Icon, InfoCard } from "../components/ui";

export interface Lesson {
  id: string;
  nav: string;
  title: string;
  subtitle: string;
  render: () => ReactNode;
}

function Pipeline() {
  return (
    <>
      <div className="pipeline">
        <div className="pipe-box steel">使用者輸入</div>
        <span className="pipe-arrow">→</span>
        <div className="pipe-box teal">Input Guard</div>
        <span className="pipe-arrow">→</span>
        <div className="pipe-box navy">LLM</div>
        <span className="pipe-arrow">→</span>
        <div className="pipe-box teal">Output Guard</div>
        <span className="pipe-arrow">→</span>
        <div className="pipe-box steel">應用 / 使用者</div>
      </div>
      <div className="pipe-captions">
        <span />
        <span>驗證輸入：擋掉攻擊與離題</span>
        <span />
        <span>驗證輸出：擋掉幻覺與外洩</span>
        <span />
      </div>
    </>
  );
}

function LatencyChart() {
  const rows = RULES.latency_reference;
  const max = Math.max(...rows.map((r) => r.ms));
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <div className="bar-label">{row.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(row.ms / max) * 100}%` }} />
            <span className="bar-value">{row.ms} ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export const LESSONS: Lesson[] = [
  {
    id: "intro",
    nav: "課程總覽",
    title: "Guardrail Fundamentals",
    subtitle: "LLM 應用的安全防護層：風險、架構與框架選型。AI/ML Engineer 學習系列 · 第一課。",
    render: () => (
      <>
        <Pipeline />
        <BlockTitle>這堂課會給你什麼</BlockTitle>
        <Grid cols={3}>
          <InfoCard
            icon="book"
            tone="steel"
            title="10 頁概念"
            body="從「沒有防護會出什麼事」一路到縱深防禦架構與三大框架選型，每頁都是一個可以獨立講完的段落。"
          />
          <InfoCard
            icon="sliders"
            tone="teal"
            title="一個互動實驗場"
            body="貼一段輸入或輸出，即時看到哪一層攔了什麼、用什麼策略處理，以及這些檢查花了多少延遲。"
          />
          <InfoCard
            icon="layers"
            tone="navy"
            title="一份可跑的原始碼"
            body="FastAPI 後端 + React 前端 + 共用規則檔。clone 下來改一條 regex，兩邊同時生效。"
          />
        </Grid>
        <p className="note">
          左邊選單由上往下就是建議的閱讀順序。想直接動手的話，跳到「互動實驗場」。
        </p>
      </>
    ),
  },
  {
    id: "risks",
    nav: "沒有防護會怎樣",
    title: "沒有防護的 LLM，會出什麼事？",
    subtitle: "LLM 的輸出本質上是機率性的——原型可以容忍，生產環境不行。",
    render: () => (
      <Grid cols={2}>
        <InfoCard
          icon="rain"
          tone="red"
          title="幻覺 Hallucination"
          body="一本正經地捏造事實、亂編引用來源，直接輸出給使用者就是事故。"
        />
        <InfoCard
          icon="lock"
          tone="red"
          title="個資外洩 PII Leak"
          body="回應中夾帶姓名、電話、Email 等敏感資料，觸犯隱私法規與內部政策。"
        />
        <InfoCard
          icon="bolt"
          tone="red"
          title="Injection 與 Jailbreak"
          body="惡意輸入劫持模型行為，讓它無視系統指令、執行攻擊者的意圖。"
        />
        <InfoCard
          icon="shuffle"
          tone="red"
          title="離題與濫用"
          body="客服機器人被拿來寫作業、聊政治，燒你的 token、傷你的品牌。"
        />
      </Grid>
    ),
  },
  {
    id: "what-is",
    nav: "Guardrail 是什麼",
    title: "Guardrail 是什麼？",
    subtitle: "一個站在 LLM 與外界之間的「驗證層」：偵測風險、攔截或修正，再放行。",
    render: () => (
      <>
        <Pipeline />
        <BlockTitle>檢查沒過的時候，Guard 可以怎麼做？</BlockTitle>
        <Grid cols={3}>
          <InfoCard
            icon="xCircle"
            tone="red"
            plain
            title="攔下 Exception"
            body="直接中止，回傳錯誤或預設回覆——高風險場景的預設。"
          />
          <InfoCard
            icon="sliders"
            tone="steel"
            plain
            title="修正 Fix"
            body="自動遮罩 PII、裁掉違規片段，修完再放行。"
          />
          <InfoCard
            icon="refresh"
            tone="teal"
            plain
            title="重問 Reask"
            body="把失敗原因回饋給 LLM，請它重新生成一次。"
          />
        </Grid>
        <p className="note">
          這三種策略在本站的實驗場都跑得到——每個 validator 各自帶一種 <code>on_fail</code>，
          同一次檢查裡最嚴格的那個決定整體結果（攔下 &gt; 重問 &gt; 修正 &gt; 通過）。
        </p>
      </>
    ),
  },
  {
    id: "mount-points",
    nav: "三個掛載點",
    title: "Guard 的三個掛載點",
    subtitle: "不同位置的檢查，防的是不同階段的災難。",
    render: () => (
      <Grid cols={3}>
        <InfoCard
          icon="login"
          tone="steel"
          title="Input Guard"
          body="在昂貴的 LLM 呼叫「之前」快速驗證使用者輸入。"
          bullets={["擋 injection、離題、惡意內容", "省下被浪費的 token 與延遲", "通常用便宜、快速的檢查"]}
        />
        <InfoCard
          icon="chat"
          tone="teal"
          title="Output Guard"
          body="在回覆送出「之前」檢查 LLM 的最終輸出。"
          bullets={["擋幻覺、PII、違規內容", "驗證結構化輸出符合 schema", "是使用者體驗的最後防線"]}
        />
        <InfoCard
          icon="wrench"
          tone="navy"
          title="Tool Guard"
          body="包住有「副作用」的工具呼叫，執行前後都驗證。"
          bullets={["寄信、下單、改資料庫前先攔", "Multi-agent 時把驗證放在工具旁", "別只依賴第一層 input guard"]}
        />
      </Grid>
    ),
  },
  {
    id: "check-types",
    nav: "常見檢查類型",
    title: "常見的檢查類型",
    subtitle: "各框架的內建檢查大同小異——這六種是共同的基本盤。",
    render: () => (
      <Grid cols={2}>
        <InfoCard
          icon="filter"
          title="Moderation 內容審查"
          body="偵測仇恨、暴力、色情等有害內容，通常接現成分類器。"
        />
        <InfoCard icon="eyeOff" title="PII 偵測與遮罩" body="找出姓名、電話、Email 等個資，攔下或自動遮罩。" />
        <InfoCard
          icon="target"
          title="Injection / Jailbreak 偵測"
          body="辨識試圖劫持模型的輸入，例如「忽略以上指令」。"
        />
        <InfoCard icon="book" title="幻覺偵測" body="對照你的知識庫或來源文件，驗證回覆有憑有據。" />
        <InfoCard icon="compass" title="離題偵測" body="確保對話待在允許的主題範圍內，不被拿去做別的事。" />
        <InfoCard icon="code" title="結構化輸出驗證" body="用 schema / regex 保證輸出格式正確，能被下游程式使用。" />
      </Grid>
    ),
  },
  {
    id: "frameworks",
    nav: "三大框架比較",
    title: "三大主流框架：定位其實錯開了",
    subtitle: "不是「哪個最好」，而是「各自解決什麼問題」。",
    render: () => (
      <Grid cols={3}>
        <InfoCard
          title="Guardrails AI"
          body={<em style={{ color: "var(--teal-dark)", fontStyle: "italic" }}>驗證器派</em>}
          bullets={[
            "用可組合的 Validator 攔截輸入輸出，並強制結構化輸出",
            "Guard + Validator + Hub 生態",
            "Provider-agnostic，不綁供應商",
            "支援 Python 與 JavaScript",
            "Pydantic 風格，上手直覺",
          ]}
          footer={<span style={{ color: "var(--teal-dark)" }}>適合：結構化輸出、通用驗證層</span>}
        />
        <InfoCard
          title="NeMo Guardrails"
          body={<em style={{ color: "var(--steel)", fontStyle: "italic" }}>對話流程控制派</em>}
          bullets={[
            "用 Colang DSL 撰寫 rails，宣告主題邊界與對話流程",
            "對話控制最靈活、最細緻",
            "可接 LlamaGuard 等外部偵測器",
            "學習曲線較陡，需要維護 rails",
            "NVIDIA 生態，開源免費",
          ]}
          footer={<span style={{ color: "var(--steel)" }}>適合：Chatbot 的主題與流程管控</span>}
        />
        <InfoCard
          title="OpenAI Guardrails"
          body={<em style={{ color: "var(--navy)", fontStyle: "italic" }}>開箱即用派</em>}
          bullets={[
            "直接替換 OpenAI client，每次呼叫自動跑檢查",
            "Drop-in + no-code Wizard 配置",
            "Tripwire 機制：觸發即中止",
            "與 Agents SDK 原生整合",
            "綁定 OpenAI 生態是主要限制",
          ]}
          footer={<span style={{ color: "var(--navy)" }}>適合：OpenAI 系應用快速上防護</span>}
        />
      </Grid>
    ),
  },
  {
    id: "guardrails-ai",
    nav: "Guardrails AI 核心",
    title: "深入一層：Guardrails AI 的核心物件",
    subtitle: "四個概念就能讀懂它的所有文件。",
    render: () => (
      <div className="grid cols-2">
        <div>
          <InfoCard
            icon="shield"
            tone="teal"
            plain
            title="Guard"
            body="守門員本體：掛在 LLM 呼叫外面，串起所有檢查。"
          />
          <div style={{ height: 12 }} />
          <InfoCard
            icon="check"
            tone="steel"
            plain
            title="Validator"
            body="單一檢查邏輯：一個 validator 只驗一種風險。"
          />
          <div style={{ height: 12 }} />
          <InfoCard
            icon="cube"
            tone="navy"
            plain
            title="Hub"
            body="預建 validator 的市集：PII、毒性、regex⋯裝了就用。"
          />
          <div style={{ height: 12 }} />
          <InfoCard
            icon="flag"
            tone="red"
            plain
            title="OnFailAction"
            body="失敗策略：exception / fix / reask，依風險等級選。"
          />
        </div>
        <pre className="code">
          <code>
            <span className="c-key">from</span> guardrails <span className="c-key">import</span> Guard, OnFailAction
            {"\n"}
            <span className="c-key">from</span> guardrails.hub <span className="c-key">import</span> RegexMatch
            {"\n\n"}
            guard = Guard().use({"\n"}
            {"    "}RegexMatch,{"\n"}
            {"    "}regex=<span className="c-str">r"\d{"{3}"}-\d{"{3}"}-\d{"{4}"}"</span>,{"\n"}
            {"    "}on_fail=OnFailAction.EXCEPTION,{"\n"}
            ){"\n\n"}
            guard.validate(<span className="c-str">"415-555-0198"</span>){"\n"}
            <span className="c-ok"># -&gt; pass</span>
            {"\n"}
            guard.validate(<span className="c-str">"hello world"</span>){"\n"}
            <span className="c-bad"># -&gt; ValidationError</span>
          </code>
        </pre>
      </div>
    ),
  },
  {
    id: "latency",
    nav: "延遲的代價",
    title: "代價：每一層檢查都是延遲",
    subtitle: "安全不是免費的——用毫秒和 token 換來的（數字為量級示意，依硬體與配置而異）。",
    render: () => (
      <div className="grid cols-2">
        <div>
          <h4 style={{ margin: "0 0 18px", fontSize: 15, color: "var(--muted)" }}>各類檢查的典型延遲（毫秒）</h4>
          <LatencyChart />
        </div>
        <div>
          <InfoCard
            icon="clock"
            tone="steel"
            plain
            title="50–100ms 是甜蜜點"
            body="多數團隊認為這個總開銷在生產環境可接受。"
          />
          <div style={{ height: 12 }} />
          <InfoCard
            icon="layers"
            tone="teal"
            plain
            title="平行執行壓延遲"
            body="互相獨立的檢查同時跑，別串成一條鏈。"
          />
          <div style={{ height: 12 }} />
          <InfoCard
            icon="bolt"
            tone="red"
            plain
            title="LLM 型檢查最貴"
            body="留給高風險路徑；每次檢查都是一次模型呼叫。"
          />
        </div>
      </div>
    ),
  },
  {
    id: "defense-in-depth",
    nav: "縱深防禦",
    title: "縱深防禦：生產環境的真實架構",
    subtitle: "沒有任何單一層是 100% 有效——所以業界的答案是「疊起來」。",
    render: () => (
      <div className="grid cols-2">
        <div>
          <div className="layer one">
            <h4>第一層｜輸入篩查</h4>
            <p>快速、便宜的 scanner 先過濾已知攻擊模式與明顯違規。</p>
          </div>
          <div className="layer-arrow">↓</div>
          <div className="layer two">
            <h4>第二層｜對話 / 流程控制</h4>
            <p>主題邊界與流程規則，讓 injection 就算穿過也無法驅動行為。</p>
          </div>
          <div className="layer-arrow">↓</div>
          <div className="layer three">
            <h4>第三層｜輸出驗證</h4>
            <p>最後防線：幻覺、PII、結構化輸出，確保送出去的東西乾淨。</p>
          </div>
        </div>
        <InfoCard
          icon="layers"
          tone="teal"
          title="實務上的常態"
          bullets={[
            "多數生產 agent 組合 2–3 個工具，不是單選題",
            "常見堆疊：快速 scanner + NeMo 管對話 + Guardrails AI 驗輸出",
            "分層的目的：每一層攔不同類型的失敗",
          ]}
        />
      </div>
    ),
  },
  {
    id: "roadmap",
    nav: "學習路線",
    title: "你的學習路線",
    subtitle: "按可遷移性排序：先學概念最通用的，再學生態綁定的。",
    render: () => (
      <>
        <Grid cols={3}>
          <InfoCard
            title="1 · Guardrails AI"
            body="概念最通用、不綁供應商。學會 Guard / Validator / Hub，動手寫自己的 validator。"
          />
          <InfoCard
            title="2 · OpenAI Guardrails"
            body="半天可上手的 drop-in。重點是理解 tripwire 與 pipeline 的設計思想。"
          />
          <InfoCard
            title="3 · NeMo Guardrails"
            body="需要對話流程控制再投資。Colang 是一項獨立技能，適合 chatbot 場景。"
          />
        </Grid>
        <div className="capstone">
          <span className="icon-circle teal" style={{ marginTop: 2 }}>
            <Icon name="map" />
          </span>
          <div>
            <h4>Capstone：縱深防禦 Demo</h4>
            <p>
              FastAPI 服務疊兩層防護（輸入篩查 + 輸出驗證）· React dashboard 即時顯示每層攔截了什麼 ·
              資料庫記錄攔截事件——三個學習目標在同一個專案匯流。
            </p>
            <p style={{ marginTop: 10 }}>
              <strong>這個網站就是那個 capstone。</strong>左邊的「互動實驗場」與「攔截事件」跑的是同一份規則，
              前端 demo 模式在瀏覽器裡跑，接上本機 FastAPI 後就是完整的後端版本。
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "takeaways",
    nav: "帶走三件事",
    title: "帶走三件事",
    subtitle: "如果今天只記得三句話，就記這三句。",
    render: () => (
      <>
        <Grid cols={3}>
          <InfoCard
            icon="shield"
            tone="teal"
            title="Guardrail 是 LLM 與世界之間的驗證層"
            body="掛在輸入、輸出、工具呼叫三個位置，失敗時可以攔、修、或重問。"
          />
          <InfoCard
            icon="clock"
            tone="steel"
            title="每一層檢查都有價目表"
            body="從幾毫秒的 regex 到秒級的 LLM 檢查——安全是用延遲與 token 買的。"
          />
          <InfoCard
            icon="layers"
            tone="red"
            title="框架不是單選題，縱深防禦才是常態"
            body="輸入篩查 + 對話控制 + 輸出驗證，各攔各的失敗類型。"
          />
        </Grid>
        <div className="capstone" style={{ marginTop: 26 }}>
          <span className="icon-circle teal" style={{ marginTop: 2 }}>
            <Icon name="wrench" />
          </span>
          <div>
            <h4>下一課：安裝 Guardrails AI，動手寫你的第一個 Validator</h4>
            <p>
              在那之前，先到「互動實驗場」把這堂課的每個概念各觸發一次——被攔下、被遮罩、被要求重問各一次，
              概念就會從投影片變成肌肉記憶。
            </p>
          </div>
        </div>
      </>
    ),
  },
];
