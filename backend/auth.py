"""
auth.py — JWT authentication for Chicken Joe.

Provides:
  - Password hashing (bcrypt via passlib)
  - JWT creation / verification (python-jose)
  - FastAPI dependency functions: get_current_user, get_optional_user
  - APIRouter mounted at /auth with register / login / me endpoints
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
from jose import JWTError, jwt

from database import create_user, get_user_by_email, get_user_by_username, get_user_by_id
from models import Token, UserCreate, UserPublic

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production-please")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_DAYS = 7

# ---------------------------------------------------------------------------
# Crypto helpers
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {
        "sub":      str(user["id"]),
        "username": user["username"],
        "is_admin": bool(user["is_admin"]),
        "exp":      expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Dependency functions
# ---------------------------------------------------------------------------

async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict:
    """Require a valid JWT. Raises 401 if missing or invalid."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id  = int(payload.get("sub", 0))
        if not user_id:
            raise credentials_exception
    except (JWTError, ValueError):
        raise credentials_exception

    user = await get_user_by_id(user_id)
    if not user:
        raise credentials_exception
    return user


async def get_optional_user(token: str | None = Depends(oauth2_scheme)) -> dict | None:
    """Return the current user if a valid token is present, otherwise None."""
    if not token:
        return None
    try:
        return await get_current_user(token)
    except HTTPException:
        return None


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/register", response_model=UserPublic, status_code=201)
async def register(payload: UserCreate):
    """Create a new user account."""
    # Uniqueness checks
    if await get_user_by_email(payload.email):
        raise HTTPException(status_code=409, detail="Email already registered.")
    if await get_user_by_username(payload.username):
        raise HTTPException(status_code=409, detail="Username already taken.")

    hashed = hash_password(payload.password)
    user_id = await create_user(payload.email, payload.username, hashed)
    user = await get_user_by_id(user_id)
    return UserPublic(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        is_admin=bool(user["is_admin"]),
        created_at=datetime.fromisoformat(user["created_at"]),
    )


@auth_router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    Login with username (or email) + password.
    Returns a JWT bearer token.
    """
    # Accept username or email in the 'username' form field
    user = await get_user_by_username(form.username)
    if not user:
        user = await get_user_by_email(form.username)
    if not user or not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user)
    return Token(access_token=token)


@auth_router.get("/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return UserPublic(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        is_admin=bool(current_user["is_admin"]),
        created_at=datetime.fromisoformat(current_user["created_at"]),
    )
