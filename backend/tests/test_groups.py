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


@pytest.mark.asyncio
async def test_list_groups_empty(client, test_user):
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.get("/groups")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_groups(client, test_user):
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    await client.post("/groups", json={"name": "グループA"})
    await client.post("/groups", json={"name": "グループB"})
    response = await client.get("/groups")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {g["name"] for g in data}
    assert names == {"グループA", "グループB"}
    for g in data:
        assert g["is_owner"] is True
        assert g["member_count"] == 1


@pytest.mark.asyncio
async def test_list_groups_only_mine(client, test_user, other_user):
    """自分が参加していないグループは一覧に含まれないこと"""
    # test_user がグループを作成
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    await client.post("/groups", json={"name": "オーナーのグループ"})

    # other_user がグループを作成
    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    await client.post("/groups", json={"name": "他人のグループ"})

    # test_user の一覧は自分のグループのみ
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.get("/groups")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "オーナーのグループ"


@pytest.mark.asyncio
async def test_preview_group(client, test_user):
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "プレビューテスト"})
    invite_code = create_r.json()["invite_code"]

    response = await client.get(f"/groups/by-code/{invite_code}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "プレビューテスト"
    assert data["member_count"] == 1
    assert "invite_code" not in data


@pytest.mark.asyncio
async def test_preview_group_not_found(client, test_user):
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.get("/groups/by-code/notexist")
    assert response.status_code == 404
