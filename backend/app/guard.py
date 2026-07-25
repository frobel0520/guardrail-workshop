"""Guard：守門員本體——掛在 LLM 呼叫外面，串起所有檢查。

一個 Guard 綁定一個掛載點（input / output / tool），內含多個 Validator。
任何一個 validator 沒過時，依它自己的 OnFailAction 決定整體結果：

    exception > reask > fix > pass

（最嚴格的策略贏——只要有一條要求攔下，整段就是 blocked。）
"""

from __future__ import annotations

from typing import Any, Iterable

from .models import GuardResult, OnFailAction, Outcome, Stage, ValidatorResult
from .rules import validator_specs
from .validators import Validator, build_validator

_ACTION_PRIORITY = {
    OnFailAction.EXCEPTION: 3,
    OnFailAction.REASK: 2,
    OnFailAction.FIX: 1,
    OnFailAction.NOOP: 0,
}


class Guard:
    def __init__(self, stage: Stage, validators: Iterable[Validator]):
        self.stage = stage
        self.validators = list(validators)

    @classmethod
    def for_stage(cls, stage: Stage, enabled: list[str] | None = None) -> "Guard":
        """`enabled=None` 代表沿用規則檔裡的 enabled_by_default。"""
        validators = []
        for spec in validator_specs(stage.value):
            validator = build_validator(spec)
            if enabled is None:
                if validator.enabled_by_default:
                    validators.append(validator)
            elif validator.id in enabled:
                validators.append(validator)
        return cls(stage, validators)

    def validate(self, text: str, context: dict[str, Any] | None = None) -> GuardResult:
        context = context or {}
        working = text
        results: list[ValidatorResult] = []
        worst = OnFailAction.NOOP
        reask_reasons: list[str] = []

        for validator in self.validators:
            outcome = validator.validate(working, context)
            results.append(
                ValidatorResult(
                    validator_id=validator.id,
                    name=validator.name,
                    stage=validator.stage,
                    category=validator.category,
                    severity=validator.severity,
                    on_fail=validator.on_fail,
                    passed=outcome.passed,
                    latency_ms=validator.latency_ms,
                    description=validator.description,
                    violations=outcome.violations,
                    detail=outcome.detail,
                )
            )

            if outcome.passed:
                continue

            if _ACTION_PRIORITY[validator.on_fail] > _ACTION_PRIORITY[worst]:
                worst = validator.on_fail

            if validator.on_fail is OnFailAction.FIX and outcome.fixed_text is not None:
                working = outcome.fixed_text
            elif validator.on_fail is OnFailAction.REASK:
                labels = "、".join(sorted({v.label for v in outcome.violations}))
                reask_reasons.append(f"{validator.name}：{labels}")

        outcome_value = {
            OnFailAction.EXCEPTION: Outcome.BLOCKED,
            OnFailAction.REASK: Outcome.REASK,
            OnFailAction.FIX: Outcome.FIXED,
            OnFailAction.NOOP: Outcome.PASS,
        }[worst]

        latencies = [v.latency_ms for v in self.validators] or [0]

        return GuardResult(
            stage=self.stage,
            outcome=outcome_value,
            original_text=text,
            final_text="" if outcome_value is Outcome.BLOCKED else working,
            results=results,
            sequential_latency_ms=sum(latencies),
            parallel_latency_ms=max(latencies),
            reask_reason="；".join(reask_reasons) or None,
        )
