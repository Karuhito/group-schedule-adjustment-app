# スケジュール API 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** グループ内の空き時間を一括登録・取得する 2 エンドポイント（PUT / GET）を TDD で実装する。

**Architecture:** 既存の `backend/app/routers/groups.py` と同じパターン（SQLAlchemy 2.x async + Pydantic v2 + pytest-asyncio）で `backend/app/routers/schedules.py` を新規作成する。PUT は既存スロットを全削除→全挿入で実装し、GET は `end_time >= NOW()` でフィルタした結果を `user_id` ごとにグループ化して返す。

**Tech Stack:** FastAPI, SQLAlchemy 2.x async (asyncpg / aiosqlite), Pydantic v2, pytest-asyncio, httpx.AsyncClient

---

## ファイル構成

| ファイル | 操作 | 内容 |
|---------|------|------|
| `backend/app/schemas/schemas.py` | 修正 | `ScheduleSlot`, `ScheduleUpsert`, `ScheduleResponse`, `MemberScheduleResponse` を追加 |
| `backend/app/routers/schedules.py` | 新規作成 | `PUT /{group_id}/schedules` と `GET /{group_id}/schedules` の実装 |
| `backend/app/main.py` | 修正 | schedules ルーターを登録、CORS に `PUT` を追加 |
| `backend/tests/test_schedules.py` | 新規作成 | 10 件のテスト |

---

### Task 1: Pydantic スキーマの追加

**Files:**
- Modify: `backend/app/schemas/schemas.py`

- [ ] **Step 1: スキーマを追加する**

`backend/app/schemas/schemas.py` の先頭 import に `datetime` と `model_validator` を追加し、ファイル末尾に以下を追加する。

先頭の import を修正（`uuid` はすでにある）：

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, model_validator
```

ファイル末尾に追加：

```python
class ScheduleSlot(BaseModel):
    start_time: datetime
    end_time: datetime

    @model_validator(mode='after')
    def validate_time_range(self) -> 'ScheduleSlot':
        if self.start_time >= self.end_time:
            raise ValueError('end_time は start_time より後にしてください')
        return self


class ScheduleUpsert(BaseModel):
    slots: list[ScheduleSlot]


class ScheduleResponse(BaseModel):
    slots: list[ScheduleSlot]


class MemberScheduleResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    avatar_url: str | None
    slots: list[ScheduleSlot]
```

- [ ] **Step 2: インポートが通ることを確認する**

作業ディレクトリ: `backend/`

```bash
.venv/bin/python -c "from app.schemas.schemas import ScheduleSlot, ScheduleUpsert, ScheduleResponse, MemberScheduleResponse; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: コミット**

```bash
git add backend/app/schemas/schemas.py
git commit -m "[2026-05-09] 追加: スケジュール API 用 Pydantic スキーマを追加"
```

---

### Task 2: スケジュールルーター骨格 + main.py 登録

**Files:**
- Create: `backend/app/routers/schedules.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: スケジュールルーターをスタブで作成する**

`backend/app/routers/schedules.py` を新規作成：

```python
import uuid as uuid_lib

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User
from app.schemas.schemas import MemberScheduleResponse, ScheduleResponse, ScheduleUpsert

router = APIRouter(prefix="/groups", tags=["schedules"])


@router.put("/{group_id}/schedules", response_model=ScheduleResponse)
async def put_schedules(
    group_id: uuid_lib.UUID,
    data: ScheduleUpsert,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScheduleResponse:
    raise NotImplementedError


@router.get("/{group_id}/schedules", response_model=list[MemberScheduleResponse])
async def get_schedules(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberScheduleResponse]:
    raise NotImplementedError
```

- [ ] **Step 2: main.py に schedules ルーターを登録し、CORS に PUT を追加する**

`backend/app/main.py` を以下の内容に置き換える：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, groups, schedules

app = FastAPI(title="グループスケジュール調整API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(schedules.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 3: インポートが通ることを確認する**

作業ディレクトリ: `backend/`

```bash
.venv/bin/python -c "from app.routers.schedules import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: コミット**

```bash
git add backend/app/routers/schedules.py backend/app/main.py
git commit -m "[2026-05-09] 追加: スケジュールルーター骨格と main.py 登録"
```

---

### Task 3: PUT /groups/{group_id}/schedules を TDD で実装

**Files:**
- Create: `backend/tests/test_schedules.py`
- Modify: `backend/app/routers/schedules.py`

#### 背景

- テスト用ユーザーは `conftest.py` の `test_user`（username="owner"）と `other_user`（username="member"）を使う
- `_make_jwt` はこのテストファイルにローカルで定義する（`test_groups.py` と同じパターン）
- 未来のスロットは 2099 年、過去のスロットは 2000 年を使うことでフレーキーを防ぐ

- [ ] **Step 1: テストファイルを作成する（Red）**

`backend/tests/test_schedules.py` を新規作成：

```python
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
```

- [ ] **Step 2: テストが失敗することを確認する（Red）**

作業ディレクトリ: `backend/`

```bash
.venv/bin/python -m pytest tests/test_schedules.py::test_put_schedules tests/test_schedules.py::test_put_schedules_replaces tests/test_schedules.py::test_put_schedules_empty tests/test_schedules.py::test_put_schedules_invalid_time tests/test_schedules.py::test_put_schedules_not_member tests/test_schedules.py::test_put_schedules_group_not_found -v
```

Expected: `test_put_schedules_invalid_time` は PASS（Pydantic がハンドラより先に検証）、残り 5 件は FAIL（NotImplementedError）。

- [ ] **Step 3: PUT エンドポイントを実装する（Green）**

`backend/app/routers/schedules.py` を以下の内容に置き換える：

```python
import uuid as uuid_lib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Group, GroupMember, Schedule, User
from app.schemas.schemas import (
    MemberScheduleResponse,
    ScheduleResponse,
    ScheduleSlot,
    ScheduleUpsert,
)

router = APIRouter(prefix="/groups", tags=["schedules"])


@router.put("/{group_id}/schedules", response_model=ScheduleResponse)
async def put_schedules(
    group_id: uuid_lib.UUID,
    data: ScheduleUpsert,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScheduleResponse:
    result = await db.execute(select(Group).where(Group.id == group_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="グループが見つかりません")
    membership = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="グループのメンバーではありません")
    await db.execute(
        delete(Schedule).where(
            Schedule.group_id == group_id,
            Schedule.user_id == current_user.id,
        )
    )
    for slot in data.slots:
        db.add(Schedule(
            user_id=current_user.id,
            group_id=group_id,
            start_time=slot.start_time,
            end_time=slot.end_time,
        ))
    await db.commit()
    return ScheduleResponse(slots=data.slots)


@router.get("/{group_id}/schedules", response_model=list[MemberScheduleResponse])
async def get_schedules(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberScheduleResponse]:
    raise NotImplementedError
```

- [ ] **Step 4: PUT テストが全て通ることを確認する（Green）**

作業ディレクトリ: `backend/`

```bash
.venv/bin/python -m pytest tests/test_schedules.py::test_put_schedules tests/test_schedules.py::test_put_schedules_replaces tests/test_schedules.py::test_put_schedules_empty tests/test_schedules.py::test_put_schedules_invalid_time tests/test_schedules.py::test_put_schedules_not_member tests/test_schedules.py::test_put_schedules_group_not_found -v
```

Expected: 6 件全て PASSED

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_schedules.py backend/app/routers/schedules.py
git commit -m "[2026-05-09] 追加: PUT /groups/{group_id}/schedules を TDD で実装"
```

---

### Task 4: GET /groups/{group_id}/schedules を TDD で実装

**Files:**
- Modify: `backend/tests/test_schedules.py`
- Modify: `backend/app/routers/schedules.py`

- [ ] **Step 1: GET テストを追加する（Red）**

`backend/tests/test_schedules.py` の末尾に以下を追加：

```python
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
```

- [ ] **Step 2: GET テストが失敗することを確認する（Red）**

作業ディレクトリ: `backend/`

```bash
.venv/bin/python -m pytest tests/test_schedules.py::test_get_schedules tests/test_schedules.py::test_get_schedules_excludes_past tests/test_schedules.py::test_get_schedules_not_member tests/test_schedules.py::test_get_schedules_group_not_found -v
```

Expected: 4 件全て FAIL（NotImplementedError）

- [ ] **Step 3: GET エンドポイントを実装する（Green）**

`backend/app/routers/schedules.py` を以下の内容に置き換える（`get_schedules` スタブを実装に差し替え）：

```python
import uuid as uuid_lib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Group, GroupMember, Schedule, User
from app.schemas.schemas import (
    MemberScheduleResponse,
    ScheduleResponse,
    ScheduleSlot,
    ScheduleUpsert,
)

router = APIRouter(prefix="/groups", tags=["schedules"])


@router.put("/{group_id}/schedules", response_model=ScheduleResponse)
async def put_schedules(
    group_id: uuid_lib.UUID,
    data: ScheduleUpsert,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScheduleResponse:
    result = await db.execute(select(Group).where(Group.id == group_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="グループが見つかりません")
    membership = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="グループのメンバーではありません")
    await db.execute(
        delete(Schedule).where(
            Schedule.group_id == group_id,
            Schedule.user_id == current_user.id,
        )
    )
    for slot in data.slots:
        db.add(Schedule(
            user_id=current_user.id,
            group_id=group_id,
            start_time=slot.start_time,
            end_time=slot.end_time,
        ))
    await db.commit()
    return ScheduleResponse(slots=data.slots)


@router.get("/{group_id}/schedules", response_model=list[MemberScheduleResponse])
async def get_schedules(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberScheduleResponse]:
    result = await db.execute(select(Group).where(Group.id == group_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="グループが見つかりません")
    membership = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="グループのメンバーではありません")
    now = datetime.now(timezone.utc)
    schedules_result = await db.execute(
        select(Schedule, User)
        .join(User, Schedule.user_id == User.id)
        .where(
            Schedule.group_id == group_id,
            Schedule.end_time >= now,
        )
    )
    rows = schedules_result.all()
    user_slots: dict[uuid_lib.UUID, tuple[User, list[ScheduleSlot]]] = {}
    for row in rows:
        schedule: Schedule = row.Schedule
        user: User = row.User
        if user.id not in user_slots:
            user_slots[user.id] = (user, [])
        user_slots[user.id][1].append(
            ScheduleSlot(start_time=schedule.start_time, end_time=schedule.end_time)
        )
    return [
        MemberScheduleResponse(
            user_id=user.id,
            username=user.username,
            avatar_url=user.avatar_url,
            slots=slots,
        )
        for user, slots in user_slots.values()
    ]
```

- [ ] **Step 4: 全 GET テストが通ることを確認する（Green）**

作業ディレクトリ: `backend/`

```bash
.venv/bin/python -m pytest tests/test_schedules.py -v
```

Expected: 10 件全て PASSED

- [ ] **Step 5: コミット**

```bash
git add backend/tests/test_schedules.py backend/app/routers/schedules.py
git commit -m "[2026-05-09] 追加: GET /groups/{group_id}/schedules を TDD で実装"
```

---

### Task 5: 全テスト実行・変更ログ更新

**Files:**
- Create: `docs/changelog/2026-05-09.md`

- [ ] **Step 1: 全テストを実行して PASSED を確認する**

作業ディレクトリ: `backend/`

```bash
.venv/bin/python -m pytest tests/ -v
```

Expected: test_auth.py 6 件 + test_config.py 2 件 + test_groups.py 20 件 + test_models.py 3 件 + test_schedules.py 10 件 = **41 件全て PASSED**

- [ ] **Step 2: 変更ログを作成する**

`docs/changelog/2026-05-09.md` を新規作成（HH:MM は実際の作業完了時刻に変更すること）：

```markdown
# 2026-05-09 作業ログ

---

## HH:MM - スケジュール API 実装

**種別**: 追加
**対象ファイル**: `backend/app/routers/schedules.py`, `backend/app/schemas/schemas.py`, `backend/app/main.py`, `backend/tests/test_schedules.py`

### 変更内容
- スケジュール用 Pydantic スキーマを追加（ScheduleSlot, ScheduleUpsert, ScheduleResponse, MemberScheduleResponse）
- `PUT /groups/{group_id}/schedules`: 自分の空き時間を一括登録（既存スロットを全削除→全挿入）
- `GET /groups/{group_id}/schedules`: グループ全メンバーの空き時間を取得（end_time >= NOW() でフィルタ）
- CORS の許可メソッドに `PUT` を追加
- テスト 10 件全て PASSED

### 理由
スケジュール調整アプリの中核機能。「空き時間を選択して送る」一括置き換えモデルを採用し、フロントのカレンダー UI と自然に対応する設計にした。avatar_url が null の場合はそのまま返し、デフォルト画像はフロント側で処理する。
```

- [ ] **Step 3: 変更ログをコミットする**

```bash
git add docs/changelog/2026-05-09.md
git commit -m "[2026-05-09] 追加: スケジュール API 実装完了・変更ログ作成"
```
