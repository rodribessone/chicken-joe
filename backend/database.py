"""
SQLite database setup using aiosqlite.
Tables:
  - reports           : community surf reports per beach
  - beach_suggestions : user-submitted beach suggestions (pending approval)
  - beaches_community : admin-approved community beaches
"""

import json
import re
from datetime import datetime, timedelta, timezone
import aiosqlite

# Queensland: UTC+10, no daylight saving
AEST = timezone(timedelta(hours=10))

DB_PATH = "chicken_joe.db"


# ---------------------------------------------------------------------------
# Init
# ---------------------------------------------------------------------------

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                beach_id    TEXT    NOT NULL,
                beach_name  TEXT    NOT NULL,
                text        TEXT    NOT NULL,
                tags        TEXT    NOT NULL DEFAULT '[]',
                user_id     INTEGER DEFAULT NULL,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS beach_suggestions (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                name         TEXT    NOT NULL,
                state        TEXT    NOT NULL,
                lat          REAL    NOT NULL,
                lon          REAL    NOT NULL,
                notes        TEXT,
                status       TEXT    NOT NULL DEFAULT 'pending',
                submitted_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS beaches_community (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                slug         TEXT    NOT NULL UNIQUE,
                name         TEXT    NOT NULL,
                state        TEXT    NOT NULL,
                lat          REAL    NOT NULL,
                lon          REAL    NOT NULL,
                description  TEXT    NOT NULL DEFAULT '',
                ocean_facing INTEGER NOT NULL DEFAULT 90,
                approved_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                email           TEXT    NOT NULL UNIQUE,
                username        TEXT    NOT NULL UNIQUE,
                hashed_password TEXT    NOT NULL,
                is_admin        INTEGER NOT NULL DEFAULT 0,
                created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS beach_flags (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                beach_id   TEXT    NOT NULL,
                user_id    INTEGER NOT NULL REFERENCES users(id),
                reason     TEXT    NOT NULL,
                created_at TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(beach_id, user_id)
            )
        """)
        await db.commit()

        await db.execute("""
            CREATE TABLE IF NOT EXISTS report_votes (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                user_id    INTEGER NOT NULL REFERENCES users(id),
                vote       INTEGER NOT NULL CHECK(vote IN (1, -1)),
                created_at TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(report_id, user_id)
            )
        """)
        await db.commit()

        # Migrations: add columns to existing tables if not present
        for migration in [
            "ALTER TABLE reports ADD COLUMN user_id INTEGER DEFAULT NULL",
        ]:
            try:
                await db.execute(migration)
                await db.commit()
            except Exception:
                pass  # column already exists


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

async def insert_report(
    beach_id: str, beach_name: str, text: str, tags: list[str], user_id: int | None = None
) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO reports (beach_id, beach_name, text, tags, user_id) VALUES (?, ?, ?, ?, ?)",
            (beach_id, beach_name, text, json.dumps(tags), user_id),
        )
        await db.commit()
        return cursor.lastrowid


_REPORT_SELECT = """
    SELECT r.id, r.beach_id, r.beach_name, r.text, r.tags, r.created_at,
           u.username,
           COALESCE(SUM(CASE WHEN v.vote =  1 THEN 1 ELSE 0 END), 0) AS upvotes,
           COALESCE(SUM(CASE WHEN v.vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN report_votes v ON r.id = v.report_id
"""
_REPORT_GROUP = " GROUP BY r.id "


async def get_reports(beach_id: str, limit: int = 20) -> list[dict]:
    """All recent reports regardless of date (used internally)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            _REPORT_SELECT + " WHERE r.beach_id = ?" + _REPORT_GROUP + "ORDER BY r.created_at DESC LIMIT ?",
            (beach_id, limit),
        )
        rows = await cursor.fetchall()
        return [{**dict(row), "tags": json.loads(row["tags"])} for row in rows]


def _aest_today_utc_str() -> str:
    """Return today's AEST midnight expressed as a UTC datetime string for SQLite."""
    today_aest = datetime.now(AEST).replace(hour=0, minute=0, second=0, microsecond=0)
    return today_aest.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


async def get_reports_today(beach_id: str, limit: int = 50) -> list[dict]:
    """Reports from today (AEST midnight → now)."""
    start = _aest_today_utc_str()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            _REPORT_SELECT + " WHERE r.beach_id = ? AND r.created_at >= ?" +
            _REPORT_GROUP + "ORDER BY r.created_at DESC LIMIT ?",
            (beach_id, start, limit),
        )
        rows = await cursor.fetchall()
        return [{**dict(row), "tags": json.loads(row["tags"])} for row in rows]


async def get_reports_history(beach_id: str, days_back: int = 7, limit: int = 40) -> list[dict]:
    """Reports from the past N days, NOT including today."""
    today_utc = _aest_today_utc_str()
    past_aest = (datetime.now(AEST) - timedelta(days=days_back)).replace(hour=0, minute=0, second=0, microsecond=0)
    past_utc = past_aest.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            _REPORT_SELECT +
            " WHERE r.beach_id = ? AND r.created_at >= ? AND r.created_at < ?" +
            _REPORT_GROUP + "ORDER BY r.created_at DESC LIMIT ?",
            (beach_id, past_utc, today_utc, limit),
        )
        rows = await cursor.fetchall()
        return [{**dict(row), "tags": json.loads(row["tags"])} for row in rows]


async def get_all_reports_admin(limit: int = 50) -> list[dict]:
    """Admin: all recent reports across all beaches."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            _REPORT_SELECT + _REPORT_GROUP + "ORDER BY r.created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [{**dict(row), "tags": json.loads(row["tags"])} for row in rows]


async def get_recent_tags(beach_id: str, limit: int = 20) -> list[str]:
    """Today's tags for surf score adjustment. Falls back to yesterday if none today."""
    reports = await get_reports_today(beach_id, limit=limit)
    if not reports:
        reports = await get_reports_history(beach_id, days_back=1, limit=limit)
    tags: list[str] = []
    for r in reports:
        tags.extend(r["tags"])
    return tags


# ---------------------------------------------------------------------------
# Beach suggestions
# ---------------------------------------------------------------------------

async def insert_suggestion(name: str, state: str, lat: float, lon: float, notes: str | None) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO beach_suggestions (name, state, lat, lon, notes) VALUES (?, ?, ?, ?, ?)",
            (name, state, lat, lon, notes),
        )
        await db.commit()
        return cursor.lastrowid


async def get_suggestions(status: str = "pending") -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM beach_suggestions WHERE status = ? ORDER BY submitted_at DESC",
            (status,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def reject_suggestion(suggestion_id: int) -> bool:
    """Delete a pending suggestion (reject it)."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "DELETE FROM beach_suggestions WHERE id = ? AND status = 'pending'",
            (suggestion_id,),
        )
        await db.commit()
        return cursor.rowcount > 0


async def approve_suggestion(suggestion_id: int) -> dict | None:
    """Approve a suggestion: mark it approved and add to beaches_community."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM beach_suggestions WHERE id = ? AND status = 'pending'",
            (suggestion_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None

        suggestion = dict(row)
        slug = _slugify(suggestion["name"])

        await db.execute(
            """
            INSERT OR IGNORE INTO beaches_community (slug, name, state, lat, lon, description)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (slug, suggestion["name"], suggestion["state"],
             suggestion["lat"], suggestion["lon"],
             suggestion["notes"] or ""),
        )
        await db.execute(
            "UPDATE beach_suggestions SET status = 'approved' WHERE id = ?",
            (suggestion_id,),
        )
        await db.commit()
        return suggestion


# ---------------------------------------------------------------------------
# Community beaches
# ---------------------------------------------------------------------------

async def get_community_beaches() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM beaches_community ORDER BY name"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_community_beach_by_slug(slug: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM beaches_community WHERE slug = ?", (slug,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def insert_community_beach(
    slug: str,
    name: str,
    state: str,
    lat: float,
    lon: float,
    description: str,
    ocean_facing: int,
) -> str:
    """
    Directly add a new community beach.
    Returns the final slug used (may have a numeric suffix if slug was taken).
    """
    async with aiosqlite.connect(DB_PATH) as db:
        # Ensure slug uniqueness
        final_slug = slug
        counter    = 1
        while True:
            row = await db.execute("SELECT 1 FROM beaches_community WHERE slug = ?", (final_slug,))
            if not await row.fetchone():
                break
            final_slug = f"{slug}-{counter}"
            counter += 1

        await db.execute(
            """INSERT INTO beaches_community
               (slug, name, state, lat, lon, description, ocean_facing)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (final_slug, name, state, lat, lon, description, ocean_facing),
        )
        await db.commit()
        return final_slug


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

async def create_user(email: str, username: str, hashed_password: str) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO users (email, username, hashed_password) VALUES (?, ?, ?)",
            (email, username, hashed_password),
        )
        await db.commit()
        return cursor.lastrowid


async def get_user_by_email(email: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_user_by_username(username: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_user_by_id(user_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_user_profile_stats(user_id: int) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        # Count reports
        cur = await db.execute(
            "SELECT COUNT(*) FROM reports WHERE user_id = ?", (user_id,)
        )
        total_reports = (await cur.fetchone())[0]

        # Count votes received on user's reports
        cur = await db.execute(
            """SELECT
                COALESCE(SUM(CASE WHEN v.vote =  1 THEN 1 ELSE 0 END), 0) AS upvotes,
                COALESCE(SUM(CASE WHEN v.vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes
               FROM report_votes v
               JOIN reports r ON v.report_id = r.id
               WHERE r.user_id = ?""",
            (user_id,),
        )
        row = await cur.fetchone()
        return {
            "total_reports":    total_reports,
            "upvotes_received": row[0] if row else 0,
            "downvotes_received": row[1] if row else 0,
        }


async def get_user_reports(user_id: int, limit: int = 10) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            _REPORT_SELECT + " WHERE r.user_id = ?" + _REPORT_GROUP +
            "ORDER BY r.created_at DESC LIMIT ?",
            (user_id, limit),
        )
        rows = await cursor.fetchall()
        return [{**dict(row), "tags": json.loads(row["tags"])} for row in rows]


# ---------------------------------------------------------------------------
# Beach flags
# ---------------------------------------------------------------------------

async def insert_beach_flag(beach_id: str, user_id: int, reason: str) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cursor = await db.execute(
                "INSERT INTO beach_flags (beach_id, user_id, reason) VALUES (?, ?, ?)",
                (beach_id, user_id, reason),
            )
            await db.commit()
            return cursor.lastrowid
        except Exception:
            raise  # UNIQUE constraint violation → caller handles as 409


async def get_flags_for_beach(beach_id: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT f.*, u.username FROM beach_flags f
               JOIN users u ON f.user_id = u.id
               WHERE f.beach_id = ? ORDER BY f.created_at DESC""",
            (beach_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_all_flags() -> list[dict]:
    """Admin: all flags ordered by most recent."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT f.*, u.username,
                      COALESCE(bc.name, f.beach_id) AS beach_name
               FROM beach_flags f
               JOIN users u ON f.user_id = u.id
               LEFT JOIN beaches_community bc ON f.beach_id = bc.slug
               ORDER BY f.created_at DESC"""
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def dismiss_flag(flag_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM beach_flags WHERE id = ?", (flag_id,))
        await db.commit()
        return cursor.rowcount > 0


async def delete_community_beach(slug: str) -> bool:
    """Admin: permanently remove a community beach and its flags."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM beach_flags WHERE beach_id = ?", (slug,))
        cursor = await db.execute("DELETE FROM beaches_community WHERE slug = ?", (slug,))
        await db.commit()
        return cursor.rowcount > 0


# ---------------------------------------------------------------------------
# Report votes
# ---------------------------------------------------------------------------

async def upsert_vote(report_id: int, user_id: int, vote: int) -> None:
    """
    Insert or update a vote. If the user votes the same way twice, remove it (toggle).
    vote must be +1 or -1.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        row = await db.execute(
            "SELECT vote FROM report_votes WHERE report_id = ? AND user_id = ?",
            (report_id, user_id),
        )
        existing = await row.fetchone()
        if existing is None:
            await db.execute(
                "INSERT INTO report_votes (report_id, user_id, vote) VALUES (?, ?, ?)",
                (report_id, user_id, vote),
            )
        elif existing[0] == vote:
            # Same vote → toggle off
            await db.execute(
                "DELETE FROM report_votes WHERE report_id = ? AND user_id = ?",
                (report_id, user_id),
            )
        else:
            # Different vote → update
            await db.execute(
                "UPDATE report_votes SET vote = ? WHERE report_id = ? AND user_id = ?",
                (vote, report_id, user_id),
            )
        await db.commit()


async def get_report_by_id(report_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            _REPORT_SELECT + " WHERE r.id = ?" + _REPORT_GROUP,
            (report_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return {**dict(row), "tags": json.loads(row["tags"])}


async def update_report(report_id: int, text: str, tags: list[str]) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "UPDATE reports SET text = ?, tags = ? WHERE id = ?",
            (text, json.dumps(tags), report_id),
        )
        await db.commit()
        return cursor.rowcount > 0


async def delete_report(report_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        # Cascade-delete votes first
        await db.execute("DELETE FROM report_votes WHERE report_id = ?", (report_id,))
        cursor = await db.execute("DELETE FROM reports WHERE id = ?", (report_id,))
        await db.commit()
        return cursor.rowcount > 0


async def get_vote_counts(report_id: int) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """SELECT
                COALESCE(SUM(CASE WHEN vote =  1 THEN 1 ELSE 0 END), 0) AS upvotes,
                COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes
               FROM report_votes WHERE report_id = ?""",
            (report_id,),
        )
        row = await cursor.fetchone()
        return {"upvotes": row[0], "downvotes": row[1]}


async def get_user_vote(report_id: int, user_id: int) -> int | None:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT vote FROM report_votes WHERE report_id = ? AND user_id = ?",
            (report_id, user_id),
        )
        row = await cursor.fetchone()
        return row[0] if row else None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
