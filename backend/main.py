import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Header, Path, Security
from fastapi.middleware.cors import CORSMiddleware

from auth import auth_router, get_current_user, get_optional_user
from beaches import BEACHES
from database import (
    approve_suggestion,
    get_community_beach_by_slug,
    delete_community_beach,
    dismiss_flag,
    get_all_flags,
    get_community_beaches,
    get_flags_for_beach,
    delete_report,
    get_recent_tags,
    get_report_by_id,
    get_user_profile_stats,
    get_user_reports,
    update_report,
    get_reports,
    get_reports_today,
    get_reports_history,
    get_suggestions,
    get_user_vote,
    get_vote_counts,
    init_db,
    insert_beach_flag,
    insert_community_beach,
    insert_report,
    insert_suggestion,
    upsert_vote,
)
from marine_api import fetch_conditions, fetch_forecast
from models import (
    Beach,
    BeachCreate,
    BeachFlag,
    BeachFlagAdmin,
    BeachFlagCreate,
    BeachSuggestion,
    BeachSuggestionCreate,
    Conditions,
    ForecastDay,
    Report,
    ReportCreate,
    ReportUpdate,
    REPORT_TAGS,
    TideEvent,
    TidesResponse,
    UserProfile,
    UserProfileStats,
    VoteCreate,
    VoteResponse,
)
from scoring import calculate_score
from tides import get_tides_today


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Chicken Joe API",
    description="Surf conditions for the Sunshine Coast, Australia.",
    version="0.2.0",
    lifespan=lifespan,
)

_CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _CORS_ORIGINS],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

ADMIN_KEY = os.getenv("ADMIN_KEY", "chickenjoe-admin-2024")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _estimate_ocean_facing(lat: float, lon: float) -> int:
    """
    Rough ocean-facing direction (degrees) for Australian coastal beaches.
    Used as default for the surf-score wind calculation.
    """
    # East coast: QLD, NSW — faces E/ESE
    if lon > 151:
        return 90
    # Victoria south coast & eastern SA — faces S/SSE
    if lat < -36 and lon > 138:
        return 165
    # South Australia — faces S/SW
    if lat < -32 and 130 < lon <= 138:
        return 200
    # WA south coast — faces SW
    if lon < 130 and lat < -30:
        return 240
    # WA west coast — faces W/NW
    if lon < 120:
        return 280
    return 90  # safe default


async def _resolve_beach(beach_id: str) -> dict | None:
    """Look up a beach from hardcoded list or community DB."""
    if beach_id in BEACHES:
        return BEACHES[beach_id]
    row = await get_community_beach_by_slug(beach_id)
    if row:
        # Normalize community beach to match BEACHES structure
        return {
            "id":           row["slug"],
            "name":         row["name"],
            "lat":          row["lat"],
            "lon":          row["lon"],
            "description":  row["description"],
            "ocean_facing": row["ocean_facing"],
            "state":        row["state"],
            "is_community": True,
        }
    return None


async def _require_admin(current_user: dict = Depends(get_current_user)):
    """Allow access only to users with is_admin=True in their JWT."""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ---------------------------------------------------------------------------
# Beaches
# ---------------------------------------------------------------------------

@app.get("/beaches", response_model=list[Beach], tags=["beaches"])
async def list_beaches():
    """Return all beaches (hardcoded + approved community beaches)."""
    hardcoded = [
        Beach(
            id=b["id"], name=b["name"], lat=b["lat"], lon=b["lon"],
            description=b["description"], state="QLD",
        )
        for b in BEACHES.values()
    ]
    community_rows = await get_community_beaches()
    community = [
        Beach(
            id=r["slug"], name=r["name"], lat=r["lat"], lon=r["lon"],
            description=r["description"], state=r["state"], is_community=True,
        )
        for r in community_rows
    ]
    return hardcoded + community


@app.post("/beaches", response_model=Beach, status_code=201, tags=["beaches"])
async def add_beach(payload: BeachCreate):
    """
    Immediately add a new community beach.
    The beach is available for conditions + reports right away.
    """
    from database import _slugify  # local import to reuse helper
    slug         = _slugify(payload.name)
    ocean_facing = _estimate_ocean_facing(payload.lat, payload.lon)
    description  = payload.description or f"Community beach in {payload.state}"

    final_slug = await insert_community_beach(
        slug, payload.name, payload.state,
        payload.lat, payload.lon,
        description, ocean_facing,
    )
    return Beach(
        id=final_slug,
        name=payload.name,
        lat=payload.lat,
        lon=payload.lon,
        description=description,
        state=payload.state,
        is_community=True,
    )


@app.get("/beaches/{beach_id}", response_model=Beach, tags=["beaches"])
async def get_beach(beach_id: str = Path(...)):
    beach = await _resolve_beach(beach_id)
    if not beach:
        raise HTTPException(status_code=404, detail=f"Beach '{beach_id}' not found.")
    return Beach(
        id=beach["id"], name=beach["name"], lat=beach["lat"], lon=beach["lon"],
        description=beach["description"],
        state=beach.get("state", "QLD"),
        is_community=beach.get("is_community", False),
    )


# ---------------------------------------------------------------------------
# Tides
# ---------------------------------------------------------------------------

@app.get("/beaches/{beach_id}/tides", response_model=TidesResponse, tags=["conditions"])
async def get_tides(beach_id: str = Path(...)):
    """
    Return today's approximate high/low tides for the beach (AEST).
    Based on M2 harmonic model calibrated for the Sunshine Coast.
    """
    beach = await _resolve_beach(beach_id)
    if not beach:
        raise HTTPException(status_code=404, detail=f"Beach '{beach_id}' not found.")

    events = get_tides_today()
    return TidesResponse(
        beach_id=beach_id,
        events=[TideEvent(**e) for e in events],
    )


# ---------------------------------------------------------------------------
# Conditions
# ---------------------------------------------------------------------------

@app.get("/beaches/{beach_id}/conditions", response_model=Conditions, tags=["conditions"])
async def get_conditions(beach_id: str = Path(...)):
    beach = await _resolve_beach(beach_id)
    if not beach:
        raise HTTPException(status_code=404, detail=f"Beach '{beach_id}' not found.")

    try:
        data = await fetch_conditions(beach["lat"], beach["lon"])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch marine data: {exc}")

    recent_tags = await get_recent_tags(beach_id)

    score, label = calculate_score(
        wave_height_m=data["wave"]["height_m"],
        wave_period_s=data["wave"]["period_s"],
        wind_speed_kmh=data["wind"]["speed_kmh"],
        wind_dir_deg=data["wind"]["direction_deg"],
        ocean_facing_deg=beach["ocean_facing"],
        recent_tags=recent_tags,
    )

    return Conditions(
        beach_id=beach_id,
        beach_name=beach["name"],
        fetched_at=datetime.now(timezone.utc),
        wave=data["wave"],
        wind=data["wind"],
        water_temp_c=data["water_temp_c"],
        surf_score=score,
        score_label=label,
        is_community=beach.get("is_community", False),
        webcam_url=beach.get("webcam_url"),
    )


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------

@app.get("/beaches/{beach_id}/forecast", response_model=list[ForecastDay], tags=["forecast"])
async def get_forecast(beach_id: str = Path(...)):
    beach = await _resolve_beach(beach_id)
    if not beach:
        raise HTTPException(status_code=404, detail=f"Beach '{beach_id}' not found.")
    try:
        days = await fetch_forecast(beach["lat"], beach["lon"], beach["ocean_facing"])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch forecast: {exc}")
    return days


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

@app.get("/beaches/{beach_id}/reports", response_model=list[Report], tags=["reports"])
async def list_reports(
    beach_id: str = Path(...),
    period: str = "today",   # "today" | "history"
    limit: int = 50,
):
    """
    Get reports for a beach.
    - period=today    → reports from today (AEST), default
    - period=history  → reports from the past 7 days excluding today
    """
    beach = await _resolve_beach(beach_id)
    if not beach:
        raise HTTPException(status_code=404, detail=f"Beach '{beach_id}' not found.")

    if period == "history":
        rows = await get_reports_history(beach_id, days_back=7, limit=limit)
    else:
        rows = await get_reports_today(beach_id, limit=limit)

    return [
        Report(
            id=r["id"], beach_id=r["beach_id"], beach_name=r["beach_name"],
            text=r["text"], tags=r["tags"],
            created_at=datetime.fromisoformat(r["created_at"]),
            username=r.get("username"),
        )
        for r in rows
    ]


@app.post("/beaches/{beach_id}/reports", response_model=Report, status_code=201, tags=["reports"])
async def create_report(
    payload: ReportCreate,
    beach_id: str = Path(...),
    current_user: dict | None = Depends(get_optional_user),
):
    beach = await _resolve_beach(beach_id)
    if not beach:
        raise HTTPException(status_code=404, detail=f"Beach '{beach_id}' not found.")

    if not payload.text.strip() and not payload.tags:
        raise HTTPException(status_code=422, detail="Provide at least one tag or a comment.")

    invalid = [t for t in payload.tags if t not in REPORT_TAGS]
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid tags: {invalid}. Allowed: {REPORT_TAGS}")

    user_id = current_user["id"] if current_user else None
    await insert_report(beach_id, beach["name"], payload.text, payload.tags, user_id=user_id)
    rows = await get_reports(beach_id, limit=1)
    row = rows[0]
    return Report(
        id=row["id"], beach_id=row["beach_id"], beach_name=row["beach_name"],
        text=row["text"], tags=row["tags"],
        created_at=datetime.fromisoformat(row["created_at"]),
        username=row.get("username"),
    )


# ---------------------------------------------------------------------------
# Report votes
# ---------------------------------------------------------------------------

@app.post("/reports/{report_id}/vote", response_model=VoteResponse, tags=["reports"])
async def vote_report(
    payload: VoteCreate,
    report_id: int = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Upvote (+1) or downvote (-1) a report. Voting the same way again removes the vote."""
    if payload.vote not in (1, -1):
        raise HTTPException(status_code=422, detail="vote must be 1 or -1")
    await upsert_vote(report_id, current_user["id"], payload.vote)
    counts   = await get_vote_counts(report_id)
    uv       = await get_user_vote(report_id, current_user["id"])
    return VoteResponse(upvotes=counts["upvotes"], downvotes=counts["downvotes"], user_vote=uv)


# ---------------------------------------------------------------------------
# User profile
# ---------------------------------------------------------------------------

@app.get("/auth/profile", response_model=UserProfile, tags=["auth"])
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Full profile for the logged-in user: stats + recent reports."""
    stats_raw  = await get_user_profile_stats(current_user["id"])
    reports_raw = await get_user_reports(current_user["id"], limit=10)

    reports = [
        Report(
            id=r["id"], beach_id=r["beach_id"], beach_name=r["beach_name"],
            text=r["text"], tags=r["tags"],
            created_at=datetime.fromisoformat(r["created_at"]),
            username=r.get("username"),
            upvotes=r.get("upvotes", 0),
            downvotes=r.get("downvotes", 0),
        )
        for r in reports_raw
    ]

    return UserProfile(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        is_admin=bool(current_user["is_admin"]),
        created_at=datetime.fromisoformat(current_user["created_at"]),
        stats=UserProfileStats(**stats_raw),
        recent_reports=reports,
    )


# ---------------------------------------------------------------------------
# Report edit / delete
# ---------------------------------------------------------------------------

def _report_response(r: dict) -> Report:
    return Report(
        id=r["id"], beach_id=r["beach_id"], beach_name=r["beach_name"],
        text=r["text"], tags=r["tags"],
        created_at=datetime.fromisoformat(r["created_at"]),
        username=r.get("username"),
        upvotes=r.get("upvotes", 0),
        downvotes=r.get("downvotes", 0),
    )


@app.patch("/reports/{report_id}", response_model=Report, tags=["reports"])
async def edit_report(
    payload: ReportUpdate,
    report_id: int = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Edit own report text/tags. Admins can edit any report."""
    report = await get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if report.get("user_id") != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="You can only edit your own reports.")
    if not payload.text.strip() and not payload.tags:
        raise HTTPException(status_code=422, detail="Provide at least one tag or a comment.")
    invalid = [t for t in payload.tags if t not in REPORT_TAGS]
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid tags: {invalid}.")
    await update_report(report_id, payload.text, payload.tags)
    updated = await get_report_by_id(report_id)
    return _report_response(updated)


@app.delete("/reports/{report_id}", status_code=204, tags=["reports"])
async def remove_report(
    report_id: int = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Delete own report. Admins can delete any report."""
    report = await get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if report.get("user_id") != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="You can only delete your own reports.")
    await delete_report(report_id)


# ---------------------------------------------------------------------------
# Beach flags (community moderation)
# ---------------------------------------------------------------------------

@app.post("/beaches/{beach_id}/flag", status_code=201, tags=["community"])
async def flag_beach(
    payload: BeachFlagCreate,
    beach_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Flag a community beach as incorrect. Requires login. One flag per user per beach."""
    beach = await _resolve_beach(beach_id)
    if not beach:
        raise HTTPException(status_code=404, detail=f"Beach '{beach_id}' not found.")
    try:
        await insert_beach_flag(beach_id, current_user["id"], payload.reason)
    except Exception:
        raise HTTPException(status_code=409, detail="You've already flagged this beach.")
    return {"message": "Beach flagged for review. Thanks for helping keep the data accurate!"}


@app.get("/beaches/{beach_id}/flags", response_model=list[BeachFlag], tags=["community"])
async def get_beach_flags(
    beach_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Get flags for a beach. Requires login."""
    rows = await get_flags_for_beach(beach_id)
    return [
        BeachFlag(
            id=r["id"], beach_id=r["beach_id"], user_id=r["user_id"],
            username=r["username"], reason=r["reason"],
            created_at=datetime.fromisoformat(r["created_at"]),
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Beach suggestions
# ---------------------------------------------------------------------------

@app.post("/beaches/suggest", response_model=dict, status_code=201, tags=["suggestions"])
async def suggest_beach(payload: BeachSuggestionCreate):
    """Submit a new beach suggestion for admin review."""
    suggestion_id = await insert_suggestion(
        payload.name, payload.state, payload.lat, payload.lon, payload.notes
    )
    return {"id": suggestion_id, "message": "Thanks! We'll review it and add it soon."}


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@app.get("/admin/flags", response_model=list[BeachFlagAdmin], tags=["admin"])
async def admin_list_flags(_: dict = Depends(_require_admin)):
    """List all beach flags. Requires admin JWT."""
    rows = await get_all_flags()
    return [
        BeachFlagAdmin(
            id=r["id"], beach_id=r["beach_id"], user_id=r["user_id"],
            username=r["username"], reason=r["reason"],
            beach_name=r["beach_name"],
            created_at=datetime.fromisoformat(r["created_at"]),
        )
        for r in rows
    ]


@app.post("/admin/flags/{flag_id}/dismiss", tags=["admin"])
async def admin_dismiss_flag(flag_id: int = Path(...), _: dict = Depends(_require_admin)):
    """Dismiss a beach flag without removing the beach. Requires X-Admin-Key header."""
    ok = await dismiss_flag(flag_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Flag not found.")
    return {"message": "Flag dismissed."}


@app.delete("/admin/beaches/{beach_id}", tags=["admin"])
async def admin_remove_beach(
    beach_id: str = Path(...),
    _: dict = Depends(_require_admin),
):
    """Remove a community beach and all its flags. Requires X-Admin-Key header."""
    ok = await delete_community_beach(beach_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Community beach not found.")
    return {"message": f"Beach '{beach_id}' removed."}


@app.get("/admin/suggestions", response_model=list[BeachSuggestion], tags=["admin"])
async def admin_list_suggestions(_: dict = Depends(_require_admin)):
    """List pending beach suggestions. Requires admin JWT."""
    rows = await get_suggestions(status="pending")
    return [
        BeachSuggestion(
            id=r["id"], name=r["name"], state=r["state"],
            lat=r["lat"], lon=r["lon"], notes=r["notes"],
            status=r["status"],
            submitted_at=datetime.fromisoformat(r["submitted_at"]),
        )
        for r in rows
    ]


@app.post("/admin/suggestions/{suggestion_id}/approve", tags=["admin"])
async def admin_approve_suggestion(
    suggestion_id: int = Path(...),
    _: dict = Depends(_require_admin),
):
    """Approve a beach suggestion. Requires admin JWT."""
    result = await approve_suggestion(suggestion_id)
    if not result:
        raise HTTPException(status_code=404, detail="Suggestion not found or already processed.")
    return {"message": f"Beach '{result['name']}' approved and added."}


@app.delete("/admin/suggestions/{suggestion_id}", status_code=204, tags=["admin"])
async def admin_reject_suggestion(
    suggestion_id: int = Path(...),
    _: dict = Depends(_require_admin),
):
    """Reject (delete) a beach suggestion. Requires admin JWT."""
    from database import reject_suggestion
    ok = await reject_suggestion(suggestion_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Suggestion not found.")


@app.get("/admin/reports", tags=["admin"])
async def admin_list_reports(
    limit: int = 50,
    _: dict = Depends(_require_admin),
):
    """List recent reports across all beaches. Requires admin JWT."""
    from database import get_all_reports_admin
    rows = await get_all_reports_admin(limit=limit)
    return [
        {
            "id":         r["id"],
            "beach_id":   r["beach_id"],
            "beach_name": r["beach_name"],
            "text":       r["text"],
            "tags":       r["tags"],
            "username":   r.get("username"),
            "created_at": r["created_at"],
        }
        for r in rows
    ]


@app.delete("/admin/reports/{report_id}", status_code=204, tags=["admin"])
async def admin_delete_report(
    report_id: int = Path(...),
    _: dict = Depends(_require_admin),
):
    """Force-delete any report (admin only). Requires admin JWT."""
    report = await get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    await delete_report(report_id)


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------

@app.get("/tags", tags=["meta"])
async def list_tags():
    return {"tags": REPORT_TAGS}

@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "app": "Chicken Joe", "version": "0.2.0"}
