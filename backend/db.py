"""SQLite database — users and audit history."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "data" / "copilot.db"


def get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    UNIQUE NOT NULL,
            email         TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audits (
            id            TEXT    PRIMARY KEY,
            user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            source_url    TEXT,
            source_type   TEXT    NOT NULL,
            page_title    TEXT,
            ux_score      INTEGER NOT NULL DEFAULT 0,
            pages_crawled INTEGER NOT NULL DEFAULT 1,
            report_json   TEXT    NOT NULL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_audits_user
            ON audits(user_id, created_at DESC);
    """)
    conn.commit()
    conn.close()


# ── User helpers ─────────────────────────────────────────────────────────────

def get_user_by_id(user_id: int) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_username(username: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(username: str, email: str, password_hash: str) -> dict:
    conn = get_db()
    conn.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        (username, email.lower(), password_hash),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return dict(row)


# ── Audit helpers ─────────────────────────────────────────────────────────────

def save_audit(user_id: int, audit_id: str, source_url: Optional[str],
               source_type: str, page_title: Optional[str],
               ux_score: int, pages_crawled: int, report_json: str) -> None:
    conn = get_db()
    conn.execute(
        """INSERT INTO audits
               (id, user_id, source_url, source_type, page_title, ux_score, pages_crawled, report_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (audit_id, user_id, source_url, source_type, page_title, ux_score, pages_crawled, report_json),
    )
    conn.commit()
    conn.close()


def list_audits(user_id: int) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        """SELECT id, source_url, source_type, page_title, ux_score, pages_crawled, created_at
           FROM audits WHERE user_id = ? ORDER BY created_at DESC""",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_audit(audit_id: str, user_id: int) -> Optional[dict]:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM audits WHERE id = ? AND user_id = ?",
        (audit_id, user_id),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_user_audits(user_id: int) -> int:
    conn = get_db()
    cursor = conn.execute("DELETE FROM audits WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount


def delete_audit(audit_id: str, user_id: int) -> bool:
    conn = get_db()
    cursor = conn.execute("DELETE FROM audits WHERE id = ? AND user_id = ?", (audit_id, user_id))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0
