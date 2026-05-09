import uuid
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.config import settings

FUTURE_SLOT = {
    "start_time": "2099-01-01T10:00:00+00:00",
    "end_time": "2099-01-01T12:00:00+00:00",
}
ANOTHER_SLOT = {
    "start_time": "2099-01-02T14:00:00+00:00",
    "end_time": "2099-01-02T16:00:00+00:00",
}
PAST_SLOT = {
    "start_time": "2000-01-01T10:00:00+00:00",
    "end_time": "2000-01-01T12:00:00+00:00",
}


def _make_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_put_schedules(client, test_user):
    """メンバーが空き時間を登録でき、200 + slots が返ること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]

    response = await client.put(
        f"/groups/{group_id}/schedules",
        json={"slots": [FUTURE_SLOT]},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["slots"]) == 1


@pytest.mark.asyncio
async def test_put_schedules_replaces(client, test_user):
    """2回目の PUT で既存スロットが全て置き換わること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]

    await client.put(f"/groups/{group_id}/schedules", json={"slots": [FUTURE_SLOT]})
    response = await client.put(
        f"/groups/{group_id}/schedules",
        json={"slots": [ANOTHER_SLOT]},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["slots"]) == 1
    assert data["slots"][0]["start_time"].startswith("2099-01-02")


@pytest.mark.asyncio
async def test_put_schedules_empty(client, test_user):
    """空配列で全スロットが削除されること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]

    await client.put(f"/groups/{group_id}/schedules", json={"slots": [FUTURE_SLOT]})
    response = await client.put(f"/groups/{group_id}/schedules", json={"slots": []})
    assert response.status_code == 200
    assert response.json()["slots"] == []


@pytest.mark.asyncio
async def test_put_schedules_invalid_time(client, test_user):
    """start_time >= end_time で 422 になること（Pydantic バリデーション）"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.put(
        f"/groups/{uuid.uuid4()}/schedules",
        json={"slots": [{"start_time": "2099-01-01T12:00:00+00:00", "end_time": "2099-01-01T10:00:00+00:00"}]},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_put_schedules_not_member(client, test_user, other_user):
    """非メンバーが PUT すると 403 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]

    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    response = await client.put(
        f"/groups/{group_id}/schedules",
        json={"slots": [FUTURE_SLOT]},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_put_schedules_group_not_found(client, test_user):
    """存在しない group_id で 404 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.put(
        f"/groups/{uuid.uuid4()}/schedules",
        json={"slots": [FUTURE_SLOT]},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_schedules(client, test_user, other_user):
    """グループ全メンバーの空き時間が取得でき、user 情報が含まれること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]
    invite_code = create_r.json()["invite_code"]

    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    await client.post(f"/groups/by-code/{invite_code}/join")

    # 両ユーザーがスケジュールを登録
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    await client.put(f"/groups/{group_id}/schedules", json={"slots": [FUTURE_SLOT]})

    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    await client.put(f"/groups/{group_id}/schedules", json={"slots": [ANOTHER_SLOT]})

    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.get(f"/groups/{group_id}/schedules")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    usernames = {m["username"] for m in data}
    assert usernames == {"owner", "member"}
    for member in data:
        assert len(member["slots"]) == 1
        assert "user_id" in member
        assert "avatar_url" in member


@pytest.mark.asyncio
async def test_get_schedules_excludes_past(client, test_user):
    """終了済みスロット（end_time < NOW()）は GET の結果に含まれないこと"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]

    # 過去スロットと未来スロットを両方登録
    await client.put(
        f"/groups/{group_id}/schedules",
        json={"slots": [PAST_SLOT, FUTURE_SLOT]},
    )

    response = await client.get(f"/groups/{group_id}/schedules")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert len(data[0]["slots"]) == 1
    assert data[0]["slots"][0]["start_time"].startswith("2099")


@pytest.mark.asyncio
async def test_get_schedules_not_member(client, test_user, other_user):
    """非メンバーが GET すると 403 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]

    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    response = await client.get(f"/groups/{group_id}/schedules")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_schedules_group_not_found(client, test_user):
    """存在しない group_id で 404 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.get(f"/groups/{uuid.uuid4()}/schedules")
    assert response.status_code == 404
