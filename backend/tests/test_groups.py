from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.config import settings


def _make_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_create_group(client, test_user):
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.post("/groups", json={"name": "深夜ゲーム部"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "深夜ゲーム部"
    assert "invite_code" in data
    assert len(data["invite_code"]) == 8
    assert data["member_count"] == 1
    assert data["is_owner"] is True


@pytest.mark.asyncio
async def test_create_group_unauthenticated(client):
    response = await client.post("/groups", json={"name": "テスト"})
    assert response.status_code == 401
