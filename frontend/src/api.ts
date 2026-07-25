/**
 * 統一的資料來源：Demo 模式在瀏覽器裡跑，Live 模式打本機 FastAPI。
 * 兩邊回傳同一組型別，所以 UI 完全不用知道自己接的是哪一種。
 */

import * as events from "./guard/events";
import { runGuard } from "./guard/engine";
import { stubReply } from "./guard/stub";
import type { ChatResult, GuardEvent, GuardResult, Stage, Stats } from "./types";

export type Mode = "demo" | "live";

const MODE_KEY = "guardrail-workshop:mode";
const URL_KEY = "guardrail-workshop:apiUrl";

export const DEFAULT_API_URL = "http://localhost:8000";

export function loadMode(): Mode {
  return localStorage.getItem(MODE_KEY) === "live" ? "live" : "demo";
}

export function saveMode(mode: Mode): void {
  localStorage.setItem(MODE_KEY, mode);
}

export function loadApiUrl(): string {
  return localStorage.getItem(URL_KEY) ?? DEFAULT_API_URL;
}

export function saveApiUrl(url: string): void {
  localStorage.setItem(URL_KEY, url);
}

const BLOCKED_REPLY = "抱歉，這個請求我無法處理。如果是訂單或保固問題，方便提供訂單編號嗎？";
const REASK_REPLY = "這個問題超出我能協助的範圍，我們回到訂單、出貨或保固的話題好嗎？";

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} — ${path}`);
  }
  return (await response.json()) as T;
}

export interface GuardOptions {
  enabled?: string[];
  sources?: string[];
  strictAllowlist?: boolean;
}

export interface Client {
  mode: Mode;
  guard(stage: Stage, text: string, options?: GuardOptions): Promise<GuardResult>;
  chat(message: string, options?: GuardOptions): Promise<ChatResult>;
  events(limit?: number): Promise<GuardEvent[]>;
  stats(): Promise<Stats>;
  clearEvents(): Promise<void>;
  health(): Promise<{ status: string; llm_available: boolean }>;
}

function demoClient(): Client {
  return {
    mode: "demo",
    async guard(stage, text, options = {}) {
      const result = runGuard(stage, text, options.enabled, {
        sources: options.sources,
        strictAllowlist: options.strictAllowlist,
      });
      events.record(result);
      return result;
    },
    async chat(message, options = {}) {
      const started = performance.now();
      const inputGuard = runGuard("input", message, options.enabled, {
        sources: options.sources,
        strictAllowlist: options.strictAllowlist,
      });
      events.record(inputGuard);

      if (inputGuard.outcome === "blocked" || inputGuard.outcome === "reask") {
        return {
          blocked: true,
          reply: inputGuard.outcome === "blocked" ? BLOCKED_REPLY : REASK_REPLY,
          input_guard: inputGuard,
          llm_raw: null,
          llm_provider: "stub",
          output_guard: null,
          total_latency_ms: Math.round(performance.now() - started),
        };
      }

      const raw = stubReply(inputGuard.final_text);
      const outputGuard = runGuard("output", raw, undefined, { sources: options.sources });
      events.record(outputGuard);

      let reply: string;
      if (outputGuard.outcome === "blocked") {
        reply = BLOCKED_REPLY;
      } else if (outputGuard.outcome === "reask") {
        reply =
          "（這則回覆沒通過輸出驗證，正式環境會把失敗原因回饋給 LLM 重新生成）\n" +
          `失敗原因：${outputGuard.reask_reason}`;
      } else {
        reply = outputGuard.final_text;
      }

      return {
        blocked: outputGuard.outcome === "blocked",
        reply,
        input_guard: inputGuard,
        llm_raw: raw,
        llm_provider: "stub",
        output_guard: outputGuard,
        total_latency_ms: Math.round(performance.now() - started),
      };
    },
    async events(limit = 50) {
      return events.recent(limit);
    },
    async stats() {
      return events.stats();
    },
    async clearEvents() {
      events.clear();
    },
    async health() {
      return { status: "ok", llm_available: false };
    },
  };
}

function liveClient(baseUrl: string): Client {
  return {
    mode: "live",
    guard(stage, text, options = {}) {
      return request<GuardResult>(baseUrl, `/api/guard/${stage}`, {
        method: "POST",
        body: JSON.stringify({ text, enabled: options.enabled ?? null, sources: options.sources ?? [] }),
      });
    },
    chat(message, options = {}) {
      return request<ChatResult>(baseUrl, "/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          enabled_input: options.enabled ?? null,
          sources: options.sources ?? [],
        }),
      });
    },
    events(limit = 50) {
      return request<GuardEvent[]>(baseUrl, `/api/events?limit=${limit}`);
    },
    stats() {
      return request<Stats>(baseUrl, "/api/stats");
    },
    async clearEvents() {
      await request(baseUrl, "/api/events", { method: "DELETE" });
    },
    health() {
      return request<{ status: string; llm_available: boolean }>(baseUrl, "/api/health");
    },
  };
}

export function createClient(mode: Mode, baseUrl: string): Client {
  return mode === "live" ? liveClient(baseUrl) : demoClient();
}
