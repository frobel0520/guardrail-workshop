"""載入 shared/guard-rules.json——前後端共用的同一份規則。

規則放在 repo 根目錄的 shared/ 底下，Python 與 TypeScript 各自讀同一份檔案，
所以「加一條 PII pattern」只需要改一個地方。
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

_ENV_KEY = "GUARDRAIL_RULES_PATH"


def rules_path() -> Path:
    override = os.getenv(_ENV_KEY)
    if override:
        return Path(override)
    # backend/app/rules.py -> backend/app -> backend -> repo root
    return Path(__file__).resolve().parents[2] / "shared" / "guard-rules.json"


@lru_cache(maxsize=1)
def load_rules() -> dict[str, Any]:
    path = rules_path()
    if not path.is_file():
        raise FileNotFoundError(
            f"找不到規則檔 {path}。可用環境變數 {_ENV_KEY} 指定路徑。"
        )
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def validator_specs(stage: str | None = None) -> list[dict[str, Any]]:
    specs = load_rules()["validators"]
    if stage is None:
        return list(specs)
    return [s for s in specs if s["stage"] == stage]


def scenarios() -> list[dict[str, Any]]:
    return list(load_rules().get("scenarios", []))


def latency_reference() -> list[dict[str, Any]]:
    return list(load_rules().get("latency_reference", []))


def reset_cache() -> None:
    """測試用：改完規則檔後清掉快取。"""
    load_rules.cache_clear()
