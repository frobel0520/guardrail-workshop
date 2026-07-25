"""API 的 request / response schema。"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class Stage(str, Enum):
    INPUT = "input"
    OUTPUT = "output"
    TOOL = "tool"


class OnFailAction(str, Enum):
    """對應投影片「檢查沒過的時候，Guard 可以怎麼做」。"""

    EXCEPTION = "exception"  # 攔下：直接中止
    FIX = "fix"  # 修正：遮罩 / 裁掉違規片段
    REASK = "reask"  # 重問：把失敗原因回饋給 LLM
    NOOP = "noop"  # 只記錄，不動作


class Outcome(str, Enum):
    PASS = "pass"
    FIXED = "fixed"
    REASK = "reask"
    BLOCKED = "blocked"


class Violation(BaseModel):
    label: str
    matched_text: str
    start: int
    end: int


class ValidatorResult(BaseModel):
    validator_id: str
    name: str
    stage: Stage
    category: str
    severity: str
    on_fail: OnFailAction
    passed: bool
    latency_ms: int
    description: str = ""
    violations: list[Violation] = Field(default_factory=list)
    detail: str | None = None


class GuardResult(BaseModel):
    stage: Stage
    outcome: Outcome
    original_text: str
    final_text: str
    results: list[ValidatorResult]
    sequential_latency_ms: int = Field(
        description="所有檢查串起來跑的總延遲（毫秒，量級示意）"
    )
    parallel_latency_ms: int = Field(
        description="互相獨立的檢查同時跑時的延遲＝最慢那一個"
    )
    reask_reason: str | None = None


class GuardRequest(BaseModel):
    text: str
    enabled: list[str] | None = Field(
        default=None, description="要啟用的 validator id；None 代表用預設值"
    )
    sources: list[str] = Field(
        default_factory=list, description="grounding 用的來源文件（幻覺檢查會對照它）"
    )


class ChatRequest(BaseModel):
    message: str
    enabled_input: list[str] | None = None
    enabled_output: list[str] | None = None
    sources: list[str] = Field(default_factory=list)
    use_llm: bool = Field(
        default=True, description="False 時強制走內建 stub，不呼叫真的模型"
    )


class ChatResponse(BaseModel):
    blocked: bool
    reply: str
    input_guard: GuardResult
    llm_raw: str | None = None
    llm_provider: Literal["anthropic", "stub"] = "stub"
    output_guard: GuardResult | None = None
    total_latency_ms: int = 0


class EventOut(BaseModel):
    id: int
    created_at: str
    stage: Stage
    validator_id: str
    category: str
    severity: str
    on_fail: OnFailAction
    outcome: Outcome
    label: str
    excerpt: str


class StatsOut(BaseModel):
    total_events: int
    by_stage: dict[str, int]
    by_category: dict[str, int]
    by_outcome: dict[str, int]
    recent: list[EventOut]


class ValidatorInfo(BaseModel):
    id: str
    name: str
    stage: Stage
    category: str
    severity: str
    on_fail: OnFailAction
    latency_ms: int
    description: str
    enabled_by_default: bool
    engine: str


class ConfigOut(BaseModel):
    version: str
    validators: list[ValidatorInfo]
    scenarios: list[dict[str, Any]]
    latency_reference: list[dict[str, Any]]
    llm_available: bool
