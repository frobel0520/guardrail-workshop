from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """每個測試用自己的 SQLite 檔，互不污染。"""
    from app import store

    monkeypatch.setenv("GUARDRAIL_DB", str(tmp_path / "events.db"))
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    store.reset()
    yield
    store.reset()
    os.environ.pop("GUARDRAIL_DB", None)
