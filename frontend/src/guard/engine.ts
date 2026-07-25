/**
 * Demo 模式的 guard 引擎——瀏覽器版。
 *
 * 它跟 `backend/app/validators.py` 是「同一份規則、兩套實作」：規則全部來自
 * shared/guard-rules.json，這裡只重寫執行邏輯，所以加規則不用改兩邊。
 * GitHub Pages 是靜態站台跑不了 Python，這個檔案就是讓部署後的頁面沒有後端
 * 也能完整互動的原因。
 */

import rulesFile from "@shared/guard-rules.json";
import type {
  GuardResult,
  OnFailAction,
  Outcome,
  PatternSpec,
  RulesFile,
  Stage,
  ValidatorResult,
  ValidatorSpec,
  Violation,
} from "../types";

export const RULES = rulesFile as unknown as RulesFile;

export const VALIDATORS: ValidatorSpec[] = RULES.validators;

export function validatorsForStage(stage: Stage): ValidatorSpec[] {
  return VALIDATORS.filter((v) => v.stage === stage);
}

export function defaultEnabledIds(stage: Stage): string[] {
  return validatorsForStage(stage)
    .filter((v) => v.enabled_by_default)
    .map((v) => v.id);
}

const ACTION_PRIORITY: Record<OnFailAction, number> = {
  exception: 3,
  reask: 2,
  fix: 1,
  noop: 0,
};

const OUTCOME_BY_ACTION: Record<OnFailAction, Outcome> = {
  exception: "blocked",
  reask: "reask",
  fix: "fixed",
  noop: "pass",
};

function compile(pattern: PatternSpec): RegExp {
  const flags = `g${pattern.flags?.includes("i") ? "i" : ""}`;
  return new RegExp(pattern.regex, flags);
}

export interface GuardContext {
  sources?: string[];
  strictAllowlist?: boolean;
}

interface Outcomelet {
  violations: Violation[];
  fixedText?: string;
  detail?: string;
}

function runRegex(spec: ValidatorSpec, text: string): Outcomelet {
  const violations: Violation[] = [];
  let working = text;
  for (const pattern of spec.patterns ?? []) {
    const regex = compile(pattern);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(working)) !== null) {
      violations.push({
        label: pattern.label,
        matched_text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
      if (match[0] === "") regex.lastIndex += 1; // 防止零寬比對卡住
    }
    if (pattern.mask) {
      working = working.replace(compile(pattern), pattern.mask);
    }
  }
  return { violations, fixedText: working !== text ? working : undefined };
}

function runKeyword(spec: ValidatorSpec, text: string): Outcomelet {
  const lowered = text.toLowerCase();
  const violations: Violation[] = [];
  for (const word of spec.keywords ?? []) {
    const idx = lowered.indexOf(word.toLowerCase());
    if (idx >= 0) {
      violations.push({ label: "有害詞彙", matched_text: word, start: idx, end: idx + word.length });
    }
  }
  return { violations };
}

function runTopic(spec: ValidatorSpec, text: string, ctx: GuardContext): Outcomelet {
  const lowered = text.toLowerCase();
  const violations: Violation[] = [];
  for (const word of spec.blocked_topics ?? []) {
    const idx = lowered.indexOf(word.toLowerCase());
    if (idx >= 0) {
      violations.push({
        label: "不允許的主題",
        matched_text: word,
        start: idx,
        end: idx + word.length,
      });
    }
  }
  if (violations.length > 0) {
    return { violations, detail: "輸入落在允許主題範圍外，建議把使用者導回可服務的範圍。" };
  }

  const strict = ctx.strictAllowlist ?? spec.strict_allowlist ?? false;
  if (strict) {
    const hit = (spec.allowed_topics ?? []).some((w) => lowered.includes(w.toLowerCase()));
    if (!hit) {
      return {
        violations: [
          {
            label: "未命中允許主題",
            matched_text: text.slice(0, 40),
            start: 0,
            end: Math.min(40, text.length),
          },
        ],
        detail: "嚴格模式：輸入沒有命中任何允許主題的關鍵詞。",
      };
    }
  }
  return { violations: [] };
}

const CLAIM_RE = /\d+(?:\.\d+)?\s*(?:%|年|個月|天|元|美元|USD|GB|TB|次)?/g;

function runGrounding(spec: ValidatorSpec, text: string, ctx: GuardContext): Outcomelet {
  const violations: Violation[] = [];
  for (const pattern of spec.overconfidence_patterns ?? []) {
    const regex = compile(pattern);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      violations.push({
        label: pattern.label,
        matched_text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
      if (match[0] === "") regex.lastIndex += 1;
    }
  }

  const sources = ctx.sources ?? [];
  let detail: string | undefined;
  if (sources.length > 0) {
    const corpus = sources.join("\n");
    const claims = Array.from(text.matchAll(CLAIM_RE))
      .map((m) => m[0].trim())
      .filter(Boolean);
    if (claims.length > 0) {
      const grounded = claims.filter((c) => corpus.includes(c));
      const ratio = grounded.length / claims.length;
      const threshold = spec.min_grounding_ratio ?? 0.5;
      detail =
        `可對照的數值主張 ${claims.length} 項，來源文件中找得到 ${grounded.length} 項` +
        `（grounding ${Math.round(ratio * 100)}%，門檻 ${Math.round(threshold * 100)}%）。`;
      if (ratio < threshold) {
        for (const claim of claims.filter((c) => !corpus.includes(c))) {
          const idx = Math.max(text.indexOf(claim), 0);
          violations.push({
            label: "來源查無此數據",
            matched_text: claim,
            start: idx,
            end: idx + claim.length,
          });
        }
      }
    }
  } else {
    detail = "沒有提供來源文件，只跑了過度自信語言樣式的偵測。";
  }

  return { violations, detail };
}

/** 只支援規則檔用到的 JSON Schema 子集：type / required / properties / minimum / maximum。 */
function checkSchema(value: unknown, schema: Record<string, any>, path: string): string[] {
  const errors: string[] = [];
  const where = path || "(root)";

  const expected = schema.type as string | undefined;
  if (expected) {
    const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
    const ok =
      expected === "integer"
        ? typeof value === "number" && Number.isInteger(value)
        : expected === "number"
          ? typeof value === "number"
          : actual === expected;
    if (!ok) {
      errors.push(`${where}: 型別應為 ${expected}，實際是 ${actual}`);
      return errors;
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${where}: ${value} 小於最小值 ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${where}: ${value} 大於最大值 ${schema.maximum}`);
    }
  }

  if (schema.type === "object" && value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of (schema.required ?? []) as string[]) {
      if (!(key in obj)) errors.push(`${where}: 缺少必要欄位 "${key}"`);
    }
    for (const [key, sub] of Object.entries((schema.properties ?? {}) as Record<string, any>)) {
      if (key in obj) {
        errors.push(...checkSchema(obj[key], sub, path ? `${path}/${key}` : key));
      }
    }
  }

  return errors;
}

function runJsonSchema(spec: ValidatorSpec, text: string): Outcomelet {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (err) {
    return {
      violations: [
        {
          label: "不是合法的 JSON",
          matched_text: text.slice(0, 60),
          start: 0,
          end: Math.min(60, text.length),
        },
      ],
      detail: `JSON 解析失敗：${(err as Error).message}`,
    };
  }

  const errors = checkSchema(payload, (spec.schema ?? {}) as Record<string, any>, "");
  if (errors.length === 0) return { violations: [], detail: "輸出符合 schema。" };

  return {
    violations: errors.map((message) => ({
      label: `schema：${message.split(":")[0]}`,
      matched_text: message,
      start: 0,
      end: 0,
    })),
    detail: errors[0],
  };
}

function runValidator(spec: ValidatorSpec, text: string, ctx: GuardContext): Outcomelet {
  switch (spec.engine) {
    case "regex":
      return runRegex(spec, text);
    case "keyword":
      return runKeyword(spec, text);
    case "topic":
      return runTopic(spec, text, ctx);
    case "grounding":
      return runGrounding(spec, text, ctx);
    case "json_schema":
      return runJsonSchema(spec, text);
    default:
      return { violations: [] };
  }
}

export function runGuard(
  stage: Stage,
  text: string,
  enabledIds?: string[],
  ctx: GuardContext = {},
): GuardResult {
  const specs = validatorsForStage(stage).filter((spec) =>
    enabledIds ? enabledIds.includes(spec.id) : spec.enabled_by_default,
  );

  let working = text;
  let worst: OnFailAction = "noop";
  const results: ValidatorResult[] = [];
  const reaskReasons: string[] = [];

  for (const spec of specs) {
    const outcome = runValidator(spec, working, ctx);
    const passed = outcome.violations.length === 0;

    results.push({
      validator_id: spec.id,
      name: spec.name,
      stage: spec.stage,
      category: spec.category,
      severity: spec.severity,
      on_fail: spec.on_fail,
      passed,
      latency_ms: spec.latency_ms,
      description: spec.description,
      violations: outcome.violations,
      detail: outcome.detail ?? null,
    });

    if (passed) continue;

    if (ACTION_PRIORITY[spec.on_fail] > ACTION_PRIORITY[worst]) worst = spec.on_fail;

    if (spec.on_fail === "fix" && outcome.fixedText !== undefined) {
      working = outcome.fixedText;
    } else if (spec.on_fail === "reask") {
      const labels = Array.from(new Set(outcome.violations.map((v) => v.label))).sort().join("、");
      reaskReasons.push(`${spec.name}：${labels}`);
    }
  }

  const outcome = OUTCOME_BY_ACTION[worst];
  const latencies = specs.length > 0 ? specs.map((s) => s.latency_ms) : [0];

  return {
    stage,
    outcome,
    original_text: text,
    final_text: outcome === "blocked" ? "" : working,
    results,
    sequential_latency_ms: latencies.reduce((a, b) => a + b, 0),
    parallel_latency_ms: Math.max(...latencies),
    reask_reason: reaskReasons.join("；") || null,
  };
}
