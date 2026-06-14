import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User
from app.schemas.schemas import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

DISCORD_API_BASE = "https://discord.com/api/v10"


def _build_discord_oauth_url() -> str:
    params = {
        "client_id": settings.discord_client_id,
        "redirect_uri": settings.discord_redirect_uri,
        "response_type": "code",
        "scope": "identify",
    }
    return f"https://discord.com/oauth2/authorize?{urlencode(params)}"


def _create_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm="HS256")


@router.get("/discord")
async def discord_login():
    return RedirectResponse(url=_build_discord_oauth_url(), status_code=302)


@router.get("/discord/callback")
async def discord_callback(
    code: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if error or not code:
        return RedirectResponse(url=f"{settings.frontend_url}/login?auth_error=cancelled", status_code=302)

    async with httpx.AsyncClient() as http_client:
        token_response = await http_client.post(
            f"{DISCORD_API_BASE}/oauth2/token",
            data={
                "client_id": settings.discord_client_id,
                "client_secret": settings.discord_client_secret,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.discord_redirect_uri,
            },
        )
        if token_response.status_code != 200:
            logger.error(
                "Discord token exchange failed: status=%d body=%s",
                token_response.status_code,
                token_response.text,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Discord トークン取得に失敗しました: {token_response.text}",
            )

        discord_access_token = token_response.json()["access_token"]

        user_response = await http_client.get(
            f"{DISCORD_API_BASE}/users/@me",
            headers={"Authorization": f"Bearer {discord_access_token}"},
        )
        if user_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Discord ユーザー情報の取得に失敗しました",
            )

        discord_user = user_response.json()

    discord_id: str = discord_user["id"]
    username: str = discord_user["username"]
    avatar_hash: str | None = discord_user.get("avatar")
    avatar_url = (
        f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png"
        if avatar_hash
        else None
    )

    result = await db.execute(select(User).where(User.discord_id == discord_id))
    user = result.scalar_one_or_none()

    if user:
        user.username = username
        user.avatar_url = avatar_url
    else:
        user = User(discord_id=discord_id, username=username, avatar_url=avatar_url)
        db.add(user)

    await db.commit()
    await db.refresh(user)

    token = _create_jwt(str(user.id))
    is_secure = settings.app_env == "production"

    response = RedirectResponse(url=f"{settings.frontend_url}/home", status_code=302)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="none" if is_secure else "lax",
        secure=is_secure,
        max_age=604800,
    )
    return response


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout(response: Response, _: User = Depends(get_current_user)):
    is_secure = settings.app_env == "production"
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="none" if is_secure else "lax",
        secure=is_secure,
    )
    return {"message": "ログアウトしました"}
