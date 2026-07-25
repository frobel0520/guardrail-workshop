"""FastAPI 服務：把兩層防護（輸入篩查 + 輸出驗證）接成一條可觀察的 pipeline。"""

from __future__ import annotations

import os
import time

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from . import __version__, llm, store
from .guard import Guard
from .models import (
    ChatRequest,
    ChatResponse,
    ConfigOut,
    EventOut,
    GuardRequest,
    GuardResult,
    Outcome,
    Stage,
    StatsOut,
    ValidatorInfo,
)
from .rules import latency_reference, load_rules, scenarios, validator_specs

BLOCKED_REPLY = "抱歉，這個請求我無法處理。如果是訂單或保固問題，方便提供訂單編號嗎？"
REASK_REPLY = "這個問題超出我能協助的範圍，我們回到訂單、出貨或保固的話題好嗎？"

app = FastAPI(
    title="Guardrail Workshop API",
    version=__version__,
    description="LLM 應用的安全防護層：Input Guard / Output Guard / Tool Guard 的可跑實作。",
)

_origins = os.getenv("GUARDRAIL_CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _origins == "*" else [o.strip() for o in _origins.split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "version": __version__,
        "rules_version": load_rules()["version"],
        "llm_available": llm.anthropic_available(),
    }


@app.get("/api/config", response_model=ConfigOut)
def config() -> ConfigOut:
    return ConfigOut(
        version=load_rules()["version"],
        validators=[
            ValidatorInfo(
                id=spec["id"],
                name=spec["name"],
                stage=Stage(spec["stage"]),
                category=spec["category"],
                severity=spec["severity"],
                on_fail=spec["on_fail"],
                latency_ms=spec.get("latency_ms", 5),
                description=spec.get("description", ""),
                enabled_by_default=bool(spec.get("enabled_by_default", True)),
                engine=spec["engine"],
            )
            for spec in validator_specs()
        ],
        scenarios=scenarios(),
        latency_reference=latency_reference(),
        llm_available=llm.anthropic_available(),
    )


def _run_stage(stage: Stage, payload: GuardRequest) -> GuardResult:
    guard = Guard.for_stage(stage, payload.enabled)
    result = guard.validate(payload.text, {"sources": payload.sources})
    store.record(result)
    return result


@app.post("/api/guard/input", response_model=GuardResult)
def guard_input(payload: GuardRequest) -> GuardResult:
    return _run_stage(Stage.INPUT, payload)


@app.post("/api/guard/output", response_model=GuardResult)
def guard_output(payload: GuardRequest) -> GuardResult:
    return _run_stage(Stage.OUTPUT, payload)


@app.post("/api/guard/tool", response_model=GuardResult)
def guard_tool(payload: GuardRequest) -> GuardResult:
    return _run_stage(Stage.TOOL, payload)


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    """完整 pipeline：使用者輸入 → Input Guard → LLM → Output Guard → 應用。"""
    started = time.perf_counter()

    input_guard = Guard.for_stage(Stage.INPUT, payload.enabled_input)
    input_result = input_guard.validate(payload.message, {"sources": payload.sources})
    store.record(input_result)

    if input_result.outcome is Outcome.BLOCKED:
        # 擋在昂貴的 LLM 呼叫「之前」——省下被浪費的 token 與延遲。
        return ChatResponse(
            blocked=True,
            reply=BLOCKED_REPLY,
            input_guard=input_result,
            total_latency_ms=_elapsed_ms(started),
        )
    if input_result.outcome is Outcome.REASK:
        return ChatResponse(
            blocked=True,
            reply=REASK_REPLY,
            input_guard=input_result,
            total_latency_ms=_elapsed_ms(started),
        )

    raw, provider = llm.generate(input_result.final_text, use_llm=payload.use_llm)

    output_guard = Guard.for_stage(Stage.OUTPUT, payload.enabled_output)
    output_result = output_guard.validate(raw, {"sources": payload.sources})
    store.record(output_result)

    if output_result.outcome is Outcome.BLOCKED:
        reply = BLOCKED_REPLY
    elif output_result.outcome is Outcome.REASK:
        reply = (
            "（這則回覆沒通過輸出驗證，正式環境會把失敗原因回饋給 LLM 重新生成）\n"
            f"失敗原因：{output_result.reask_reason}"
        )
    else:
        reply = output_result.final_text

    return ChatResponse(
        blocked=output_result.outcome is Outcome.BLOCKED,
        reply=reply,
        input_guard=input_result,
        llm_raw=raw,
        llm_provider=provider,
        output_guard=output_result,
        total_latency_ms=_elapsed_ms(started),
    )


def _elapsed_ms(started: float) -> int:
    return int((time.perf_counter() - started) * 1000)


@app.get("/api/events", response_model=list[EventOut])
def events(limit: int = Query(default=50, ge=1, le=500)) -> list[EventOut]:
    return store.recent(limit)


@app.get("/api/stats", response_model=StatsOut)
def stats() -> StatsOut:
    return store.stats()


@app.delete("/api/events")
def clear_events() -> dict[str, str]:
    store.clear()
    return {"status": "cleared"}
