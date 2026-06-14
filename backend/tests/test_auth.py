import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from jose import jwt
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.models.models import User


def _make_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm="HS256")


def _mock_discord_client(discord_id: str = "999888777", username: str = "newuser", avatar: str | None = "abcdef123") -> AsyncMock:
    mock_token_response = MagicMock()
    mock_token_response.status_code = 200
    mock_token_response.json.return_value = {"access_token": "discord_access_token"}

    mock_user_response = MagicMock()
    mock_user_response.status_code = 200
    mock_user_response.json.return_value = {"id": discord_id, "username": username, "avatar": avatar}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_token_response)
    mock_client.get = AsyncMock(return_value=mock_user_response)
    return mock_client


@pytest.mark.asyncio
async def test_discord_login_redirect(client):
    """/auth/discord が state 付きで Discord OAuth URL にリダイレクトし oauth_state Cookie をセットすること"""
    response = await client.get("/auth/discord", follow_redirects=False)

    assert response.status_code == 302
    location = response.headers["location"]
    assert "discord.com/oauth2/authorize" in location
    assert "client_id=" in location
    assert "scope=identify" in location
    assert "state=" in location
    assert "oauth_state" in response.cookies


@pytest.mark.asyncio
async def test_discord_callback_creates_user(client, db_session):
    """/auth/discord/callback で新規ユーザーが作成され、Cookie がセットされること"""
    state = "valid_state_value"
    client.cookies.set("oauth_state", state)

    with patch("app.routers.auth.httpx.AsyncClient", return_value=_mock_discord_client()):
        response = await client.get(
            f"/auth/discord/callback?code=test_code&state={state}",
            follow_redirects=False,
        )

    assert response.status_code == 302
    assert response.headers["location"].endswith("/home")
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_discord_callback_upserts_existing_user(client, db_session):
    """/auth/discord/callback で既存ユーザーの username が更新されること"""
    from sqlalchemy import select

    existing_user = User(discord_id="111222333", username="oldname", avatar_url=None)
    db_session.add(existing_user)
    await db_session.commit()

    state = "valid_state_value"
    client.cookies.set("oauth_state", state)

    with patch("app.routers.auth.httpx.AsyncClient", return_value=_mock_discord_client(discord_id="111222333", username="newname", avatar=None)):
        response = await client.get(
            f"/auth/discord/callback?code=test_code&state={state}",
            follow_redirects=False,
        )

    assert response.status_code == 302

    result = await db_session.execute(select(User).where(User.discord_id == "111222333"))
    user = result.scalar_one()
    assert user.username == "newname"


@pytest.mark.asyncio
async def test_discord_callback_rejects_missing_state(client):
    """/auth/discord/callback で state が欠落しているとき /login?auth_error=invalid_state にリダイレクトすること"""
    response = await client.get("/auth/discord/callback?code=test_code", follow_redirects=False)

    assert response.status_code == 302
    assert "auth_error=invalid_state" in response.headers["location"]


@pytest.mark.asyncio
async def test_discord_callback_rejects_invalid_state(client):
    """/auth/discord/callback で state が不一致のとき /login?auth_error=invalid_state にリダイレクトすること"""
    client.cookies.set("oauth_state", "correct_state")

    response = await client.get(
        "/auth/discord/callback?code=test_code&state=wrong_state",
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert "auth_error=invalid_state" in response.headers["location"]


@pytest.mark.asyncio
async def test_get_me_returns_user(client, db_session):
    """/auth/me が Cookie の JWT からユーザー情報を返すこと"""
    user = User(discord_id="777666555", username="meuser", avatar_url=None)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = _make_jwt(str(user.id))
    client.cookies.set("access_token", token)

    response = await client.get("/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "meuser"
    assert data["id"] == str(user.id)


@pytest.mark.asyncio
async def test_get_me_without_cookie_returns_401(client):
    """/auth/me で Cookie がないとき 401 を返すこと"""
    response = await client.get("/auth/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_deletes_cookie(client, db_session):
    """/auth/logout で Cookie が削除されること（属性が set_cookie と一致すること）"""
    user = User(discord_id="444333222", username="logoutuser", avatar_url=None)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = _make_jwt(str(user.id))
    client.cookies.set("access_token", token)

    response = await client.post("/auth/logout")

    assert response.status_code == 200

    set_cookie = response.headers.get("set-cookie", "")
    assert "access_token" in set_cookie
    assert "httponly" in set_cookie.lower()
    assert "samesite=lax" in set_cookie.lower()


@pytest.mark.asyncio
async def test_logout_then_me_returns_401(client, db_session):
    """ログアウト後に /auth/me が 401 を返すこと"""
    user = User(discord_id="555444333", username="logoutcheck", avatar_url=None)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = _make_jwt(str(user.id))
    client.cookies.set("access_token", token)

    logout_response = await client.post("/auth/logout")
    assert logout_response.status_code == 200

    client.cookies.delete("access_token")

    me_response = await client.get("/auth/me")
    assert me_response.status_code == 401
