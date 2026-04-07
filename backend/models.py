from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field


REPORT_TAGS = [
    "good for beginners",
    "good for intermediates",
    "experts only",
    "clean",
    "choppy",
    "crowded",
    "empty",
    "barreling",
    "closing out",
    "glassy",
    "pumping",
]

AUSTRALIAN_STATES = ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"]


# ---------------------------------------------------------------------------
# Beaches
# ---------------------------------------------------------------------------

class Beach(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    description: str
    state: str = "QLD"
    is_community: bool = False
    webcam_url: str | None = None


# ---------------------------------------------------------------------------
# Conditions
# ---------------------------------------------------------------------------

class WindConditions(BaseModel):
    speed_kmh: float
    direction_deg: float
    gusts_kmh: float
    label: str


class WaveConditions(BaseModel):
    height_m: float
    period_s: float
    direction_deg: float
    swell_height_m: float | None = None
    swell_period_s: float | None = None


class Conditions(BaseModel):
    beach_id: str
    beach_name: str
    fetched_at: datetime
    wave: WaveConditions
    wind: WindConditions
    water_temp_c: float | None = None
    surf_score: float = Field(ge=0, le=10)
    score_label: str
    is_community: bool = False
    webcam_url: str | None = None


# ---------------------------------------------------------------------------
# Tides
# ---------------------------------------------------------------------------

class TideEvent(BaseModel):
    type: Literal["high", "low"]
    time: str       # "HH:MM" AEST
    time_iso: str   # ISO 8601
    height_m: float


class TidesResponse(BaseModel):
    beach_id: str
    events: list[TideEvent]
    note: str = "Approximate — not official BOM tide data"


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class ForecastHour(BaseModel):
    hour: int
    wave_height_m: float
    wave_period_s: float
    wind_speed_kmh: float
    wind_dir_deg: float
    surf_score: float
    score_label: str


class ForecastDay(BaseModel):
    date: str
    label: str
    hours: list[ForecastHour]
    max_wave_m: float
    best_score: float
    best_label: str
    best_hour: int


class ReportCreate(BaseModel):
    text: str = Field(default="", max_length=500)   # optional — tags alone are enough
    tags: list[str] = Field(default_factory=list, max_length=5)


class Report(BaseModel):
    id: int
    beach_id: str
    beach_name: str
    text: str
    tags: list[str]
    created_at: datetime
    username: str | None = None
    upvotes: int = 0
    downvotes: int = 0


class ReportUpdate(BaseModel):
    text: str = Field(default="", max_length=500)
    tags: list[str] = Field(default_factory=list, max_length=5)


class VoteCreate(BaseModel):
    vote: int = Field(..., description="1 = upvote, -1 = downvote")

    @property
    def validated_vote(self) -> int:
        if self.vote not in (1, -1):
            raise ValueError("vote must be 1 or -1")
        return self.vote


class VoteResponse(BaseModel):
    upvotes: int
    downvotes: int
    user_vote: int | None   # 1, -1, or None if removed


# ---------------------------------------------------------------------------
# Beach suggestions
# ---------------------------------------------------------------------------

class BeachCreate(BaseModel):
    """Payload for immediately adding a new community beach."""
    name: str = Field(min_length=2, max_length=100)
    state: Literal["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"]
    lat: float = Field(ge=-45.0, le=-10.0, description="Australian latitude")
    lon: float = Field(ge=112.0, le=155.0, description="Australian longitude")
    description: str = Field(default="", max_length=300)


class BeachSuggestionCreate(BaseModel):
    """Legacy: suggest a beach for admin review (kept for admin workflow)."""
    name: str = Field(min_length=2, max_length=100)
    state: Literal["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"]
    lat: float = Field(ge=-45.0, le=-10.0, description="Australian latitude range")
    lon: float = Field(ge=112.0, le=155.0, description="Australian longitude range")
    notes: str | None = Field(default=None, max_length=300)


class BeachSuggestion(BaseModel):
    id: int
    name: str
    state: str
    lat: float
    lon: float
    notes: str | None
    status: str
    submitted_at: datetime


# ---------------------------------------------------------------------------
# Users & Auth
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30, pattern=r'^[a-zA-Z0-9_]+$')
    password: str = Field(min_length=8, max_length=100)


class UserPublic(BaseModel):
    id: int
    email: str
    username: str
    is_admin: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Beach flags
# ---------------------------------------------------------------------------

class UserProfileStats(BaseModel):
    total_reports: int
    upvotes_received: int
    downvotes_received: int


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    created_at: datetime
    stats: UserProfileStats
    recent_reports: list[Report]


class BeachFlagCreate(BaseModel):
    reason: str = Field(min_length=5, max_length=300)


class BeachFlag(BaseModel):
    id: int
    beach_id: str
    user_id: int
    username: str
    reason: str
    created_at: datetime


class BeachFlagAdmin(BeachFlag):
    """Extended flag info for admin view."""
    beach_name: str
