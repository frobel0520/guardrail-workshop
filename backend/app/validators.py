"""Validator：單一檢查邏輯——一個 validator 只驗一種風險。

四種 engine：
  regex       正規表示式比對（PII、injection、政策違規、危險工具參數）
  keyword     關鍵詞命中（moderation 的最小示範，生產環境請換成分類器）
  topic       主題邊界（allowlist / blocklist）
  grounding   對照來源文件驗證回覆有憑有據 + 過度自信的語言樣式
  json_schema 結構化輸出驗證
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from jsonschema import Draft202012Validator
from jsonschema import ValidationError as SchemaValidationError

from .models import OnFailAction, Stage, Violation


def _compile(pattern: dict[str, Any]) -> re.Pattern[str]:
    flags = 0
    if "i" in pattern.get("flags", ""):
        flags |= re.IGNORECASE
    return re.compile(pattern["regex"], flags)


@dataclass
class ValidationOutcome:
    violations: list[Violation] = field(default_factory=list)
    fixed_text: str | None = None
    detail: str | None = None

    @property
    def passed(self) -> bool:
        return not self.violations


@dataclass
class Validator:
    """對應 Guardrails AI 的 Validator 概念：id + 檢查邏輯 + 失敗策略。"""

    id: str
    name: str
    stage: Stage
    category: str
    severity: str
    on_fail: OnFailAction
    latency_ms: int
    description: str
    engine: str
    enabled_by_default: bool
    spec: dict[str, Any]

    def validate(self, text: str, context: dict[str, Any] | None = None) -> ValidationOutcome:
        context = context or {}
        handler = getattr(self, f"_run_{self.engine}", None)
        if handler is None:
            raise ValueError(f"未知的 engine：{self.engine}（validator={self.id}）")
        return handler(text, context)

    # ---------- engines ----------

    def _run_regex(self, text: str, context: dict[str, Any]) -> ValidationOutcome:
        violations: list[Violation] = []
        working = text
        for pattern in self.spec.get("patterns", []):
            regex = _compile(pattern)
            mask = pattern.get("mask")
            # 在「目前的 working 文字」上比對，這樣前一條規則遮罩掉的內容
            # 不會被後一條重複命中。
            for match in list(regex.finditer(working)):
                violations.append(
                    Violation(
                        label=pattern["label"],
                        matched_text=match.group(0),
                        start=match.start(),
                        end=match.end(),
                    )
                )
            if mask:
                working = regex.sub(mask, working)
        fixed = working if working != text else None
        return ValidationOutcome(violations=violations, fixed_text=fixed)

    def _run_keyword(self, text: str, context: dict[str, Any]) -> ValidationOutcome:
        lowered = text.lower()
        violations = []
        for word in self.spec.get("keywords", []):
            idx = lowered.find(word.lower())
            if idx >= 0:
                violations.append(
                    Violation(
                        label="有害詞彙",
                        matched_text=word,
                        start=idx,
                        end=idx + len(word),
                    )
                )
        return ValidationOutcome(violations=violations)

    def _run_topic(self, text: str, context: dict[str, Any]) -> ValidationOutcome:
        lowered = text.lower()
        violations = []
        for word in self.spec.get("blocked_topics", []):
            idx = lowered.find(word.lower())
            if idx >= 0:
                violations.append(
                    Violation(
                        label="不允許的主題",
                        matched_text=word,
                        start=idx,
                        end=idx + len(word),
                    )
                )
        if violations:
            return ValidationOutcome(
                violations=violations,
                detail="輸入落在允許主題範圍外，建議把使用者導回可服務的範圍。",
            )

        strict = bool(context.get("strict_allowlist", self.spec.get("strict_allowlist", False)))
        if strict:
            allowed = self.spec.get("allowed_topics", [])
            hit = any(word.lower() in lowered for word in allowed)
            if not hit:
                return ValidationOutcome(
                    violations=[
                        Violation(label="未命中允許主題", matched_text=text[:40], start=0, end=min(40, len(text)))
                    ],
                    detail="嚴格模式：輸入沒有命中任何允許主題的關鍵詞。",
                )
        return ValidationOutcome()

    _CLAIM_RE = re.compile(r"\d+(?:\.\d+)?\s*(?:%|年|個月|天|元|美元|USD|GB|TB|次)?")

    def _run_grounding(self, text: str, context: dict[str, Any]) -> ValidationOutcome:
        violations: list[Violation] = []
        for pattern in self.spec.get("overconfidence_patterns", []):
            regex = _compile(pattern)
            for match in regex.finditer(text):
                violations.append(
                    Violation(
                        label=pattern["label"],
                        matched_text=match.group(0),
                        start=match.start(),
                        end=match.end(),
                    )
                )

        sources: list[str] = context.get("sources") or []
        detail: str | None = None
        if sources:
            corpus = "\n".join(sources)
            claims = [m.group(0).strip() for m in self._CLAIM_RE.finditer(text)]
            claims = [c for c in claims if c]
            if claims:
                grounded = [c for c in claims if c in corpus]
                ratio = len(grounded) / len(claims)
                threshold = float(self.spec.get("min_grounding_ratio", 0.5))
                detail = (
                    f"可對照的數值主張 {len(claims)} 項，來源文件中找得到 "
                    f"{len(grounded)} 項（grounding {ratio:.0%}，門檻 {threshold:.0%}）。"
                )
                if ratio < threshold:
                    ungrounded = [c for c in claims if c not in corpus]
                    for claim in ungrounded:
                        idx = text.find(claim)
                        violations.append(
                            Violation(
                                label="來源查無此數據",
                                matched_text=claim,
                                start=max(idx, 0),
                                end=max(idx, 0) + len(claim),
                            )
                        )
        else:
            detail = "沒有提供來源文件，只跑了過度自信語言樣式的偵測。"

        return ValidationOutcome(violations=violations, detail=detail)

    def _run_json_schema(self, text: str, context: dict[str, Any]) -> ValidationOutcome:
        schema = self.spec.get("schema", {})
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            return ValidationOutcome(
                violations=[Violation(label="不是合法的 JSON", matched_text=text[:60], start=0, end=min(60, len(text)))],
                detail=f"JSON 解析失敗：{exc.msg}（第 {exc.lineno} 行）",
            )

        errors = sorted(Draft202012Validator(schema).iter_errors(payload), key=lambda e: list(e.path))
        if not errors:
            return ValidationOutcome(detail="輸出符合 schema。")

        violations = []
        for err in errors:
            location = "/".join(str(p) for p in err.path) or "(root)"
            violations.append(
                Violation(label=f"schema：{location}", matched_text=str(err.message)[:120], start=0, end=0)
            )
        return ValidationOutcome(
            violations=violations,
            detail=_first_error_hint(errors[0]),
        )


def _first_error_hint(err: SchemaValidationError) -> str:
    location = "/".join(str(p) for p in err.path) or "(root)"
    return f"{location}: {err.message}"


def build_validator(spec: dict[str, Any]) -> Validator:
    return Validator(
        id=spec["id"],
        name=spec["name"],
        stage=Stage(spec["stage"]),
        category=spec["category"],
        severity=spec["severity"],
        on_fail=OnFailAction(spec["on_fail"]),
        latency_ms=int(spec.get("latency_ms", 5)),
        description=spec.get("description", ""),
        engine=spec["engine"],
        enabled_by_default=bool(spec.get("enabled_by_default", True)),
        spec=spec,
    )
