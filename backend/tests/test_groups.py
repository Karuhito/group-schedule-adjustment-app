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


@pytest.mark.asyncio
async def test_join_group(client, test_user, other_user):
    # オーナーがグループを作成
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "参加テスト"})
    assert create_r.status_code == 201
    invite_code = create_r.json()["invite_code"]

    # other_user として参加
    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    join_r = await client.post(f"/groups/by-code/{invite_code}/join")
    assert join_r.status_code == 200
    data = join_r.json()
    assert data["member_count"] == 2
    assert data["is_owner"] is False

    # other_user の一覧にグループが表示されること
    list_r = await client.get("/groups")
    assert len(list_r.json()) == 1


@pytest.mark.asyncio
async def test_join_group_already_member(client, test_user, other_user):
    """既にメンバーのグループに参加しようとすると 409 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    invite_code = create_r.json()["invite_code"]

    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    await client.post(f"/groups/by-code/{invite_code}/join")

    # 2回目の参加は 409
    join_again_r = await client.post(f"/groups/by-code/{invite_code}/join")
    assert join_again_r.status_code == 409


@pytest.mark.asyncio
async def test_join_group_not_found(client, test_user):
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.post("/groups/by-code/notexist/join")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_members(client, test_user, other_user):
    # グループを作成し other_user が参加
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "メンバーテスト"})
    group_id = create_r.json()["id"]
    invite_code = create_r.json()["invite_code"]

    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    await client.post(f"/groups/by-code/{invite_code}/join")

    # test_user としてメンバー一覧を取得
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.get(f"/groups/{group_id}/members")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    owner = next(m for m in data if m["is_owner"])
    assert owner["username"] == "owner"
    non_owner = next(m for m in data if not m["is_owner"])
    assert non_owner["username"] == "member"


@pytest.mark.asyncio
async def test_list_members_not_member(client, test_user, other_user):
    """非メンバーがメンバー一覧を取得しようとすると 403 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]

    # other_user（非メンバー）はアクセス不可
    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    response = await client.get(f"/groups/{group_id}/members")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_members_group_not_found(client, test_user):
    import uuid
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.get(f"/groups/{uuid.uuid4()}/members")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_group(client, test_user):
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "削除テスト"})
    group_id = create_r.json()["id"]

    response = await client.delete(f"/groups/{group_id}")
    assert response.status_code == 204

    # 削除後はグループ一覧に出ないこと
    list_r = await client.get("/groups")
    assert list_r.json() == []


@pytest.mark.asyncio
async def test_delete_group_not_owner(client, test_user, other_user):
    """オーナー以外がグループを削除しようとすると 403 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]
    invite_code = create_r.json()["invite_code"]

    # other_user が参加してから削除を試みる
    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    await client.post(f"/groups/by-code/{invite_code}/join")
    response = await client.delete(f"/groups/{group_id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_group_not_found(client, test_user):
    import uuid
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.delete(f"/groups/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_remove_member(client, test_user, other_user):
    # グループ作成 & other_user が参加
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "追い出しテスト"})
    group_id = create_r.json()["id"]
    invite_code = create_r.json()["invite_code"]

    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    await client.post(f"/groups/by-code/{invite_code}/join")

    # オーナーが other_user を追い出す
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.delete(f"/groups/{group_id}/members/{other_user.id}")
    assert response.status_code == 204

    # メンバーが1人（オーナーのみ）になっていること
    members_r = await client.get(f"/groups/{group_id}/members")
    assert len(members_r.json()) == 1


@pytest.mark.asyncio
async def test_remove_self_as_owner(client, test_user):
    """オーナーが自分自身を追い出そうとすると 400 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]

    response = await client.delete(f"/groups/{group_id}/members/{test_user.id}")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_remove_member_not_owner(client, test_user, other_user):
    """オーナー以外がメンバーを追い出そうとすると 403 になること"""
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    create_r = await client.post("/groups", json={"name": "テスト"})
    group_id = create_r.json()["id"]
    invite_code = create_r.json()["invite_code"]

    client.cookies.set("access_token", _make_jwt(str(other_user.id)))
    await client.post(f"/groups/by-code/{invite_code}/join")

    # other_user がオーナー（test_user）を追い出そうとする
    response = await client.delete(f"/groups/{group_id}/members/{test_user.id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_remove_member_group_not_found(client, test_user, other_user):
    import uuid
    client.cookies.set("access_token", _make_jwt(str(test_user.id)))
    response = await client.delete(f"/groups/{uuid.uuid4()}/members/{other_user.id}")
    assert response.status_code == 404
