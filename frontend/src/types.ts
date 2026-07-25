export type Stage = "input" | "output" | "tool";
export type OnFailAction = "exception" | "fix" | "reask" | "noop";
export type Outcome = "pass" | "fixed" | "reask" | "blocked";
export type Severity = "low" | "medium" | "high";

export interface PatternSpec {
  label: string;
  regex: string;
  flags?: string;
  mask?: string;
}

export interface ValidatorSpec {
  id: string;
  name: string;
  stage: Stage;
  category: string;
  severity: Severity;
  on_fail: OnFailAction;
  latency_ms: number;
  enabled_by_default: boolean;
  description: string;
  engine: "regex" | "keyword" | "topic" | "grounding" | "json_schema";
  patterns?: PatternSpec[];
  keywords?: string[];
  allowed_topics?: string[];
  blocked_topics?: string[];
  strict_allowlist?: boolean;
  overconfidence_patterns?: PatternSpec[];
  min_grounding_ratio?: number;
  schema?: Record<string, unknown>;
}

export interface ScenarioSpec {
  id: string;
  label: string;
  stage: Stage;
  text: string;
}

export interface LatencyRef {
  label: string;
  ms: number;
}

export interface RulesFile {
  version: string;
  description: string;
  latency_reference: LatencyRef[];
  validators: ValidatorSpec[];
  scenarios: ScenarioSpec[];
}

export interface Violation {
  label: string;
  matched_text: string;
  start: number;
  end: number;
}

export interface ValidatorResult {
  validator_id: string;
  name: string;
  stage: Stage;
  category: string;
  severity: Severity;
  on_fail: OnFailAction;
  passed: boolean;
  latency_ms: number;
  description?: string;
  violations: Violation[];
  detail?: string | null;
}

export interface GuardResult {
  stage: Stage;
  outcome: Outcome;
  original_text: string;
  final_text: string;
  results: ValidatorResult[];
  sequential_latency_ms: number;
  parallel_latency_ms: number;
  reask_reason?: string | null;
}

export interface ChatResult {
  blocked: boolean;
  reply: string;
  input_guard: GuardResult;
  llm_raw?: string | null;
  llm_provider: "anthropic" | "stub";
  output_guard?: GuardResult | null;
  total_latency_ms: number;
}

export interface GuardEvent {
  id: number;
  created_at: string;
  stage: Stage;
  validator_id: string;
  category: string;
  severity: Severity;
  on_fail: OnFailAction;
  outcome: Outcome;
  label: string;
  excerpt: string;
}

export interface Stats {
  total_events: number;
  by_stage: Record<string, number>;
  by_category: Record<string, number>;
  by_outcome: Record<string, number>;
  recent: GuardEvent[];
}
