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
