"""攔截事件日誌（SQLite）。

投影片的 capstone 寫 PostgreSQL；workshop 用 SQLite 是為了讓學員 clone 完
不用先裝資料庫就能跑。schema 一模一樣，要換 Postgres 只要換這一個檔案。
"""

from __future__ import annotations

import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

from .models import EventOut, GuardResult, Outcome, StatsOut

_LOCK = threading.Lock()
_CONN: sqlite3.Connection | None = None

_SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at   TEXT    NOT NULL,
    stage        TEXT    NOT NULL,
    validator_id TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    severity     TEXT    NOT NULL,
    on_fail      TEXT    NOT NULL,
    outcome      TEXT    NOT NULL,
    label        TEXT    NOT NULL,
    excerpt      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at DESC);
"""


def db_path() -> str:
    override = os.getenv("GUARDRAIL_DB")
    if override:
        return override
    return str(Path(__file__).resolve().parents[1] / "guardrail_events.db")


def connect() -> sqlite3.Connection:
    global _CONN
    with _LOCK:
        if _CONN is None:
            _CONN = sqlite3.connect(db_path(), check_same_thread=False)
            _CONN.row_factory = sqlite3.Row
            _CONN.executescript(_SCHEMA)
            _CONN.commit()
        return _CONN


def reset() -> None:
    """測試用：關掉連線，下次 connect() 會重開。"""
    global _CONN
    with _LOCK:
        if _CONN is not None:
            _CONN.close()
            _CONN = None


def record(result: GuardResult) -> int:
    """把一次 guard 執行中「沒過的 validator」寫進事件表。回傳寫入筆數。"""
    if result.outcome is Outcome.PASS:
        return 0

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    rows = []
    for item in result.results:
        if item.passed:
            continue
        labels = sorted({v.label for v in item.violations}) or ["未分類"]
        excerpt = _excerpt(item.violations[0].matched_text if item.violations else result.original_text)
        rows.append(
            (
                now,
                item.stage.value,
                item.validator_id,
                item.category,
                item.severity,
                item.on_fail.value,
                result.outcome.value,
                "、".join(labels),
                excerpt,
            )
        )

    if not rows:
        return 0

    conn = connect()
    with _LOCK:
        conn.executemany(
            "INSERT INTO events "
            "(created_at, stage, validator_id, category, severity, on_fail, outcome, label, excerpt) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rows,
        )
        conn.commit()
    return len(rows)


def _excerpt(text: str, limit: int = 120) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _row_to_event(row: sqlite3.Row) -> EventOut:
    return EventOut(
        id=row["id"],
        created_at=row["created_at"],
        stage=row["stage"],
        validator_id=row["validator_id"],
        category=row["category"],
        severity=row["severity"],
        on_fail=row["on_fail"],
        outcome=row["outcome"],
        label=row["label"],
        excerpt=row["excerpt"],
    )


def recent(limit: int = 50) -> list[EventOut]:
    conn = connect()
    cur = conn.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,))
    return [_row_to_event(row) for row in cur.fetchall()]


def _count_by(column: str) -> dict[str, int]:
    conn = connect()
    cur = conn.execute(f"SELECT {column} AS key, COUNT(*) AS n FROM events GROUP BY {column}")
    return {row["key"]: row["n"] for row in cur.fetchall()}


def stats(recent_limit: int = 20) -> StatsOut:
    conn = connect()
    total = conn.execute("SELECT COUNT(*) AS n FROM events").fetchone()["n"]
    return StatsOut(
        total_events=total,
        by_stage=_count_by("stage"),
        by_category=_count_by("category"),
        by_outcome=_count_by("outcome"),
        recent=recent(recent_limit),
    )


def clear() -> None:
    conn = connect()
    with _LOCK:
        conn.execute("DELETE FROM events")
        conn.commit()
