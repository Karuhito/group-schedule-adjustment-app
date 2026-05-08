# グループ API 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FastAPI バックエンドにグループ管理 API（7エンドポイント）を実装する

**Architecture:** 既存の `auth.py` ルーターパターンに従い `groups.py` を新規作成する。認証は既存の JWT Cookie（`get_current_user` 依存）を使用。テストは既存の conftest.py（SQLite in-memory + httpx.AsyncClient）パターンに従い、JWT Cookie を差し替えることで複数ユーザーのシナリオを検証する。

**Tech Stack:** FastAPI, SQLAlchemy 2.x async, Pydantic v2, pytest-asyncio, httpx, aiosqlite（既に pyproject.toml に追加済み）

---

## ファイル構成

| ファイル | 変更種別 | 役割 |
|---------|---------|------|
| `backend/app/schemas/schemas.py` | 修正 | グループ用スキーマ4種を追加 |
| `backend/app/routers/groups.py` | 新規 | グループ管理の全エンドポイント |
| `backend/app/main.py` | 修正 | groups ルーターを登録 |
| `backend/tests/conftest.py` | 修正 | test_user・other_user フィクスチャと make_jwt ヘルパーを追加 |
| `backend/tests/test_groups.py` | 新規 | グループ API の全テスト |

---

### Task 1: Pydantic スキーマを追加

**Files:**
- Modify: `backend/app/schemas/schemas.py`

- [ ] **Step 1: schemas.py を以下の内容に置き換える**

作業ディレクトリ: `backend/`

`backend/app/schemas/schemas.py` を以下の内容に書き換える:

```python
import uuid

from pydantic import BaseModel


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    username: str
    avatar_url: str | None


class GroupCreate(BaseModel):
    name: str


class GroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    invite_code: str
    member_count: int
    is_owner: bool


class GroupPreviewResponse(BaseModel):
    id: uuid.UUID
    name: str
    member_count: int


class MemberResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    avatar_url: str | None
    is_owner: bool
```

- [ ] **Step 2: インポートエラーがないことを確認**

```bash
.venv/bin/python -c "from app.schemas.schemas import GroupCreate, GroupResponse, GroupPreviewResponse, MemberResponse; print('OK')"
```

期待出力: `OK`

- [ ] **Step 3: コミット**

```bash
git add backend/app/schemas/schemas.py
git commit -m "[2026-05-08] 追加: グループ用 Pydantic スキーマ（GroupCreate, GroupResponse, GroupPreviewResponse, MemberResponse）を追加"
```

---

### Task 2: グループルーター骨格 + main.py 登録

**Files:**
- Create: `backend/app/routers/groups.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: groups.py を作成（全ルートをスタブとして）**

`backend/app/routers/groups.py` を以下の内容で作成:

```python
import secrets
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Group, GroupMember, Schedule, User
from app.schemas.schemas import (
    GroupCreate,
    GroupPreviewResponse,
    GroupResponse,
    MemberResponse,
)

router = APIRouter(prefix="/groups", tags=["groups"])


async def _generate_unique_invite_code(db: AsyncSession) -> str:
    for _ in range(3):
        code = secrets.token_urlsafe(6)
        result = await db.execute(select(Group).where(Group.invite_code == code))
        if not result.scalar_one_or_none():
            return code
    raise HTTPException(status_code=500, detail="招待コードの生成に失敗しました")


@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GroupResponse]:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.get("/by-code/{invite_code}", response_model=GroupPreviewResponse)
async def preview_group(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupPreviewResponse:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.post("/by-code/{invite_code}/join", response_model=GroupResponse)
async def join_group(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.get("/{group_id}/members", response_model=list[MemberResponse])
async def list_members(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberResponse]:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.delete("/{group_id}/members/{user_id}", status_code=204)
async def remove_member(
    group_id: uuid_lib.UUID,
    user_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    raise HTTPException(status_code=501, detail="Not Implemented")
```

- [ ] **Step 2: main.py に groups ルーターを登録**

`backend/app/main.py` を以下の内容に書き換える:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, groups

app = FastAPI(title="グループスケジュール調整API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(groups.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 3: インポートエラーがないことを確認**

```bash
.venv/bin/python -c "from app.routers.groups import router; print('OK')"
```

期待出力: `OK`

- [ ] **Step 4: コミット**

```bash
git add backend/app/routers/groups.py backend/app/main.py
git commit -m "[2026-05-08] 追加: groups ルーター骨格を作成・main.py に登録"
```

---

### Task 3: conftest.py にグループテスト用フィクスチャを追加

**Files:**
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: conftest.py を以下の内容に書き換える**

既存の `db_session` と `client` フィクスチャは保持したまま、`test_user`・`other_user` を追加する。
`make_jwt` はテストファイルに直接定義するため conftest には追加しない（既存の `test_auth.py` と同じパターン）。

`backend/tests/conftest.py` の完全な内容:

```python
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.models.models import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    """インメモリ SQLite で各テスト用のセッションを提供する"""
    from app.database import Base
    from app.models import models  # noqa: F401 — モデルを Base に登録するために必要

    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """DB をオーバーライドした FastAPI テストクライアントを提供する"""
    from app.database import get_db
    from app.main import app

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """グループテスト用のオーナーユーザーを DB に作成する"""
    user = User(discord_id="100000000001", username="owner", avatar_url=None)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def other_user(db_session: AsyncSession) -> User:
    """グループテスト用の別ユーザー（メンバー）を DB に作成する"""
    user = User(discord_id="200000000002", username="member", avatar_url=None)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user
```

- [ ] **Step 2: 既存の auth テストが引き続き通ることを確認**

```bash
.venv/bin/python -m pytest tests/test_auth.py -v
```

期待出力: 全テスト `PASSED`

- [ ] **Step 3: コミット**

```bash
git add backend/tests/conftest.py
git commit -m "[2026-05-08] 修正: conftest.py に test_user・other_user フィクスチャと make_jwt ヘルパーを追加"
```

---

### Task 4: POST /groups（グループ作成）

**Files:**
- Create: `backend/tests/test_groups.py`
- Modify: `backend/app/routers/groups.py`

- [ ] **Step 1: 失敗するテストを書く**

`backend/tests/test_groups.py` を作成:

```python
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_create_group tests/test_groups.py::test_create_group_unauthenticated -v
```

期待出力: `FAILED`（501 Not Implemented が返るため）

- [ ] **Step 3: create_group を実装**

`backend/app/routers/groups.py` の `create_group` 関数を以下に置き換える:

```python
@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    invite_code = await _generate_unique_invite_code(db)
    group = Group(name=data.name, invite_code=invite_code, created_by=current_user.id)
    db.add(group)
    await db.flush()
    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    await db.commit()
    await db.refresh(group)
    return GroupResponse(
        id=group.id,
        name=group.name,
        invite_code=group.invite_code,
        member_count=1,
        is_owner=True,
    )
```

- [ ] **Step 4: テストが通ることを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_create_group tests/test_groups.py::test_create_group_unauthenticated -v
```

期待出力: `PASSED`（2件）

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_groups.py backend/app/routers/groups.py
git commit -m "[2026-05-08] 追加: POST /groups（グループ作成）を実装"
```

---

### Task 5: GET /groups（自分のグループ一覧）

**Files:**
- Modify: `backend/tests/test_groups.py`
- Modify: `backend/app/routers/groups.py`

- [ ] **Step 1: 失敗するテストを追加**

`backend/tests/test_groups.py` に以下を追加:

```python
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_list_groups_empty tests/test_groups.py::test_list_groups tests/test_groups.py::test_list_groups_only_mine -v
```

期待出力: `FAILED`（501 が返るため）

- [ ] **Step 3: list_groups を実装**

`backend/app/routers/groups.py` の `list_groups` 関数を以下に置き換える:

```python
@router.get("", response_model=list[GroupResponse])
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GroupResponse]:
    result = await db.execute(
        select(Group, func.count(GroupMember.id).label("member_count"))
        .join(GroupMember, Group.id == GroupMember.group_id)
        .where(GroupMember.user_id == current_user.id)
        .group_by(Group.id)
    )
    rows = result.all()
    return [
        GroupResponse(
            id=row.Group.id,
            name=row.Group.name,
            invite_code=row.Group.invite_code,
            member_count=row.member_count,
            is_owner=row.Group.created_by == current_user.id,
        )
        for row in rows
    ]
```

- [ ] **Step 4: テストが通ることを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_list_groups_empty tests/test_groups.py::test_list_groups tests/test_groups.py::test_list_groups_only_mine -v
```

期待出力: `PASSED`（3件）

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_groups.py backend/app/routers/groups.py
git commit -m "[2026-05-08] 追加: GET /groups（グループ一覧）を実装"
```

---

### Task 6: GET /groups/by-code/{invite_code}（招待コードプレビュー）

**Files:**
- Modify: `backend/tests/test_groups.py`
- Modify: `backend/app/routers/groups.py`

- [ ] **Step 1: 失敗するテストを追加**

`backend/tests/test_groups.py` に以下を追加:

```python
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_preview_group tests/test_groups.py::test_preview_group_not_found -v
```

期待出力: `FAILED`

- [ ] **Step 3: preview_group を実装**

`backend/app/routers/groups.py` の `preview_group` 関数を以下に置き換える:

```python
@router.get("/by-code/{invite_code}", response_model=GroupPreviewResponse)
async def preview_group(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupPreviewResponse:
    result = await db.execute(select(Group).where(Group.invite_code == invite_code))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="招待コードが見つかりません")
    count_result = await db.execute(
        select(func.count(GroupMember.id)).where(GroupMember.group_id == group.id)
    )
    member_count = count_result.scalar_one()
    return GroupPreviewResponse(id=group.id, name=group.name, member_count=member_count)
```

- [ ] **Step 4: テストが通ることを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_preview_group tests/test_groups.py::test_preview_group_not_found -v
```

期待出力: `PASSED`（2件）

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_groups.py backend/app/routers/groups.py
git commit -m "[2026-05-08] 追加: GET /groups/by-code/{invite_code}（招待コードプレビュー）を実装"
```

---

### Task 7: POST /groups/by-code/{invite_code}/join（グループ参加）

**Files:**
- Modify: `backend/tests/test_groups.py`
- Modify: `backend/app/routers/groups.py`

- [ ] **Step 1: 失敗するテストを追加**

`backend/tests/test_groups.py` に以下を追加:

```python
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_join_group tests/test_groups.py::test_join_group_already_member tests/test_groups.py::test_join_group_not_found -v
```

期待出力: `FAILED`

- [ ] **Step 3: join_group を実装**

`backend/app/routers/groups.py` の `join_group` 関数を以下に置き換える:

```python
@router.post("/by-code/{invite_code}/join", response_model=GroupResponse)
async def join_group(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    result = await db.execute(select(Group).where(Group.invite_code == invite_code))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="招待コードが見つかりません")
    existing = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group.id,
            GroupMember.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="既にこのグループのメンバーです")
    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    await db.commit()
    count_result = await db.execute(
        select(func.count(GroupMember.id)).where(GroupMember.group_id == group.id)
    )
    member_count = count_result.scalar_one()
    return GroupResponse(
        id=group.id,
        name=group.name,
        invite_code=group.invite_code,
        member_count=member_count,
        is_owner=group.created_by == current_user.id,
    )
```

- [ ] **Step 4: テストが通ることを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_join_group tests/test_groups.py::test_join_group_already_member tests/test_groups.py::test_join_group_not_found -v
```

期待出力: `PASSED`（3件）

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_groups.py backend/app/routers/groups.py
git commit -m "[2026-05-08] 追加: POST /groups/by-code/{invite_code}/join（グループ参加）を実装"
```

---

### Task 8: GET /groups/{group_id}/members（メンバー一覧）

**Files:**
- Modify: `backend/tests/test_groups.py`
- Modify: `backend/app/routers/groups.py`

- [ ] **Step 1: 失敗するテストを追加**

`backend/tests/test_groups.py` に以下を追加:

```python
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_list_members tests/test_groups.py::test_list_members_not_member tests/test_groups.py::test_list_members_group_not_found -v
```

期待出力: `FAILED`

- [ ] **Step 3: list_members を実装**

`backend/app/routers/groups.py` の `list_members` 関数を以下に置き換える:

```python
@router.get("/{group_id}/members", response_model=list[MemberResponse])
async def list_members(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberResponse]:
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="グループが見つかりません")
    membership = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="グループのメンバーではありません")
    members_result = await db.execute(
        select(User, GroupMember)
        .join(GroupMember, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
    )
    rows = members_result.all()
    return [
        MemberResponse(
            user_id=row.User.id,
            username=row.User.username,
            avatar_url=row.User.avatar_url,
            is_owner=row.User.id == group.created_by,
        )
        for row in rows
    ]
```

- [ ] **Step 4: テストが通ることを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_list_members tests/test_groups.py::test_list_members_not_member tests/test_groups.py::test_list_members_group_not_found -v
```

期待出力: `PASSED`（3件）

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_groups.py backend/app/routers/groups.py
git commit -m "[2026-05-08] 追加: GET /groups/{group_id}/members（メンバー一覧）を実装"
```

---

### Task 9: DELETE /groups/{group_id}（グループ削除）

**Files:**
- Modify: `backend/tests/test_groups.py`
- Modify: `backend/app/routers/groups.py`

- [ ] **Step 1: 失敗するテストを追加**

`backend/tests/test_groups.py` に以下を追加:

```python
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_delete_group tests/test_groups.py::test_delete_group_not_owner tests/test_groups.py::test_delete_group_not_found -v
```

期待出力: `FAILED`

- [ ] **Step 3: delete_group を実装**

`backend/app/routers/groups.py` の `delete_group` 関数を以下に置き換える:

```python
@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="グループが見つかりません")
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="グループの削除はオーナーのみ可能です")
    await db.execute(delete(Schedule).where(Schedule.group_id == group_id))
    await db.execute(delete(GroupMember).where(GroupMember.group_id == group_id))
    await db.execute(delete(Group).where(Group.id == group_id))
    await db.commit()
```

- [ ] **Step 4: テストが通ることを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_delete_group tests/test_groups.py::test_delete_group_not_owner tests/test_groups.py::test_delete_group_not_found -v
```

期待出力: `PASSED`（3件）

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_groups.py backend/app/routers/groups.py
git commit -m "[2026-05-08] 追加: DELETE /groups/{group_id}（グループ削除・スケジュール連動削除）を実装"
```

---

### Task 10: DELETE /groups/{group_id}/members/{user_id}（メンバー追い出し）

**Files:**
- Modify: `backend/tests/test_groups.py`
- Modify: `backend/app/routers/groups.py`

- [ ] **Step 1: 失敗するテストを追加**

`backend/tests/test_groups.py` に以下を追加:

```python
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_remove_member tests/test_groups.py::test_remove_self_as_owner tests/test_groups.py::test_remove_member_not_owner tests/test_groups.py::test_remove_member_group_not_found -v
```

期待出力: `FAILED`

- [ ] **Step 3: remove_member を実装**

`backend/app/routers/groups.py` の `remove_member` 関数を以下に置き換える:

```python
@router.delete("/{group_id}/members/{user_id}", status_code=204)
async def remove_member(
    group_id: uuid_lib.UUID,
    user_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="グループが見つかりません")
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="メンバーの削除はオーナーのみ可能です")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="オーナー自身を追い出すことはできません")
    await db.execute(
        delete(Schedule).where(
            Schedule.group_id == group_id,
            Schedule.user_id == user_id,
        )
    )
    await db.execute(
        delete(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    )
    await db.commit()
```

- [ ] **Step 4: テストが通ることを確認**

```bash
.venv/bin/python -m pytest tests/test_groups.py::test_remove_member tests/test_groups.py::test_remove_self_as_owner tests/test_groups.py::test_remove_member_not_owner tests/test_groups.py::test_remove_member_group_not_found -v
```

期待出力: `PASSED`（4件）

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_groups.py backend/app/routers/groups.py
git commit -m "[2026-05-08] 追加: DELETE /groups/{group_id}/members/{user_id}（メンバー追い出し）を実装"
```

---

### Task 11: 全テスト実行・変更ログ更新・最終コミット

**Files:**
- Modify: `backend/docs/changelog/2026-05-08.md`（存在する場合は追記、なければ作成）

- [ ] **Step 1: 全テストを実行して全件パスすることを確認**

```bash
.venv/bin/python -m pytest tests/ -v
```

期待出力: 全テスト `PASSED`（test_auth.py + test_groups.py の全テスト）

- [ ] **Step 2: 変更ログを追記**

`docs/changelog/2026-05-08.md` に以下を追記:

```markdown
## グループ API 実装

**種別**: 追加
**対象ファイル**: `backend/app/routers/groups.py`, `backend/app/schemas/schemas.py`, `backend/app/main.py`, `backend/tests/conftest.py`, `backend/tests/test_groups.py`

### 変更内容
- グループ作成（POST /groups）を実装
- グループ一覧（GET /groups）を実装
- 招待コードプレビュー（GET /groups/by-code/{invite_code}）を実装
- グループ参加（POST /groups/by-code/{invite_code}/join）を実装
- メンバー一覧（GET /groups/{group_id}/members）を実装
- グループ削除（DELETE /groups/{group_id}）を実装：スケジュール・メンバーの連動削除あり
- メンバー追い出し（DELETE /groups/{group_id}/members/{user_id}）を実装：対象ユーザーのスケジュールも削除

### 理由
グループ管理機能の全 API を TDD で実装。招待コードは `secrets.token_urlsafe(6)` で生成（無期限）。オーナーのみグループ削除・メンバー追い出しが可能。
```

- [ ] **Step 3: 最終コミット**

```bash
git add docs/changelog/2026-05-08.md
git commit -m "[2026-05-08] 追加: グループ API 全エンドポイントの実装完了"
```
