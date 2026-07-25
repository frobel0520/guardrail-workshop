from __future__ import annotations

import json

import pytest

from app.guard import Guard
from app.models import Outcome, Stage
from app.rules import load_rules, scenarios
from app.validators import build_validator


def _validator(validator_id: str):
    spec = next(s for s in load_rules()["validators"] if s["id"] == validator_id)
    return build_validator(spec)


def _scenario(scenario_id: str) -> str:
    return next(s for s in scenarios() if s["id"] == scenario_id)["text"]


# ---------- Input guard ----------


def test_clean_input_passes():
    result = Guard.for_stage(Stage.INPUT).validate(_scenario("clean"))
    assert result.outcome is Outcome.PASS
    assert result.final_text == result.original_text


@pytest.mark.parametrize("scenario_id", ["injection", "injection_en"])
def test_injection_is_blocked(scenario_id):
    result = Guard.for_stage(Stage.INPUT).validate(_scenario(scenario_id))
    assert result.outcome is Outcome.BLOCKED
    assert result.final_text == ""
    failed = {r.validator_id for r in result.results if not r.passed}
    assert "prompt_injection" in failed


def test_toxic_input_is_blocked():
    result = Guard.for_stage(Stage.INPUT).validate(_scenario("toxic"))
    assert result.outcome is Outcome.BLOCKED
    assert any(r.validator_id == "toxicity" and not r.passed for r in result.results)


def test_off_topic_triggers_reask():
    result = Guard.for_stage(Stage.INPUT, ["off_topic"]).validate("幫我推薦幾支會漲的飆股")
    assert result.outcome is Outcome.REASK
    assert result.reask_reason


def test_api_key_in_input_is_masked():
    guard = Guard.for_stage(Stage.INPUT, ["input_secret"])
    result = guard.validate(_scenario("secret"))
    assert result.outcome is Outcome.FIXED
    assert "sk-ant-api03" not in result.final_text


def test_strict_allowlist_flags_unrelated_topic():
    guard = Guard.for_stage(Stage.INPUT, ["off_topic"])
    loose = guard.validate("今天天氣如何？")
    strict = guard.validate("今天天氣如何？", {"strict_allowlist": True})
    assert loose.outcome is Outcome.PASS
    assert strict.outcome is Outcome.REASK


# ---------- Output guard ----------


def test_pii_is_masked_not_blocked():
    guard = Guard.for_stage(Stage.OUTPUT, ["pii_detection"])
    result = guard.validate(_scenario("pii_leak"))
    assert result.outcome is Outcome.FIXED
    for leaked in ("0912-345-678", "ming.wang@example.com", "A123456789", "192.168.10.24"):
        assert leaked not in result.final_text
    assert "已遮罩" in result.final_text


def test_overconfident_hallucination_triggers_reask():
    guard = Guard.for_stage(Stage.OUTPUT, ["hallucination"])
    result = guard.validate(_scenario("hallucinated"))
    assert result.outcome is Outcome.REASK
    labels = {v.label for r in result.results for v in r.violations}
    assert "絕對保證" in labels or "捏造來源" in labels


def test_grounding_flags_unsupported_numbers():
    validator = _validator("hallucination")
    sources = ["本款無線耳機提供 5 年有限保固，需完成線上註冊。"]
    outcome = validator.validate("這款無線耳機保固期是 15 年。", {"sources": sources})
    assert not outcome.passed
    assert any(v.label == "來源查無此數據" for v in outcome.violations)


def test_grounding_passes_when_numbers_match_source():
    validator = _validator("hallucination")
    sources = ["本款無線耳機提供 5 年有限保固。"]
    outcome = validator.validate("這款無線耳機保固期是 5 年。", {"sources": sources})
    assert outcome.passed


def test_policy_violation_is_redacted():
    guard = Guard.for_stage(Stage.OUTPUT, ["policy_violation"])
    result = guard.validate(_scenario("policy"))
    assert result.outcome is Outcome.FIXED
    assert "無條件全額退款" not in result.final_text


def test_structured_output_validator():
    validator = _validator("structured_output")
    ok = validator.validate(json.dumps({"intent": "track_order", "confidence": 0.91}))
    assert ok.passed

    bad_type = validator.validate(json.dumps({"intent": "track_order", "confidence": 1.5}))
    assert not bad_type.passed

    missing = validator.validate(json.dumps({"intent": "track_order"}))
    assert not missing.passed

    not_json = validator.validate("{intent: track_order}")
    assert not not_json.passed
    assert "JSON 解析失敗" in (not_json.detail or "")


# ---------- Tool guard ----------


def test_tool_guard_blocks_destructive_sql():
    result = Guard.for_stage(Stage.TOOL).validate(_scenario("tool_sql"))
    assert result.outcome is Outcome.BLOCKED


def test_tool_guard_allows_safe_call():
    payload = json.dumps({"tool": "run_sql", "query": "SELECT status FROM orders WHERE id = 'A2026'"})
    result = Guard.for_stage(Stage.TOOL).validate(payload)
    assert result.outcome is Outcome.PASS


# ---------- 延遲會計 ----------


def test_latency_accounting_reports_both_modes():
    result = Guard.for_stage(Stage.OUTPUT).validate("一切正常。")
    assert result.sequential_latency_ms >= result.parallel_latency_ms
    assert result.parallel_latency_ms > 0
