/** Demo 模式的事件日誌——存在 localStorage，等同後端的 SQLite events 表。 */

import type { GuardEvent, GuardResult, Stats } from "../types";

const KEY = "guardrail-workshop:events";
const MAX = 500;

function read(): GuardEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuardEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: GuardEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(0, MAX)));
  } catch {
    /* localStorage 滿了或被停用時，安靜降級成不記錄 */
  }
}

function excerpt(text: string, limit = 120): string {
  const compact = text.split(/\s+/).join(" ");
  return compact.length <= limit ? compact : `${compact.slice(0, limit - 1)}…`;
}

export function record(result: GuardResult): void {
  if (result.outcome === "pass") return;

  const existing = read();
  let nextId = existing.length > 0 ? existing[0].id + 1 : 1;
  const created = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const added: GuardEvent[] = [];

  for (const item of result.results) {
    if (item.passed) continue;
    const labels = Array.from(new Set(item.violations.map((v) => v.label))).sort();
    added.push({
      id: nextId++,
      created_at: created,
      stage: item.stage,
      validator_id: item.validator_id,
      category: item.category,
      severity: item.severity,
      on_fail: item.on_fail,
      outcome: result.outcome,
      label: labels.join("、") || "未分類",
      excerpt: excerpt(item.violations[0]?.matched_text ?? result.original_text),
    });
  }

  if (added.length > 0) write([...added.reverse(), ...existing]);
}

export function recent(limit = 50): GuardEvent[] {
  return read().slice(0, limit);
}

export function clear(): void {
  write([]);
}

function countBy(events: GuardEvent[], key: keyof GuardEvent): Record<string, number> {
  return events.reduce<Record<string, number>>((acc, event) => {
    const value = String(event[key]);
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

export function stats(): Stats {
  const events = read();
  return {
    total_events: events.length,
    by_stage: countBy(events, "stage"),
    by_category: countBy(events, "category"),
    by_outcome: countBy(events, "outcome"),
    recent: events.slice(0, 20),
  };
}
