# バックエンド基盤 + Discord OAuth 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FastAPI + SQLAlchemy(async) + Alembic でバックエンド基盤を構築し、Discord OAuth2 認証（HTTPOnly Cookie + JWT）を動作させる

**Architecture:** SQLAlchemy 2.0 の async ORM でモデル定義し、Alembic で Supabase Cloud に対してマイグレーションを実行する。Discord の OAuth2 コードフローでユーザー情報を取得・upsert し、JWT を HTTPOnly Cookie にセットしてフロントエンドにリダイレクトする。

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy[asyncio], asyncpg, Alembic, pydantic-settings, python-jose[cryptography], httpx, pytest, pytest-asyncio, aiosqlite（テスト用）

---

## ファイルマップ

| ファイル | 役割 |
|---------|------|
| `backend/pyproject.toml` | 依存パッケージ・ツール設定 |
| `backend/.env.example` | 環境変数テンプレート |
| `backend/app/__init__.py` | パッケージ宣言 |
| `backend/app/config.py` | 環境変数読み込み（pydantic-settings） |
| `backend/app/database.py` | AsyncEngine / AsyncSession / Base |
| `backend/app/models/__init__.py` | パッケージ宣言 |
| `backend/app/models/models.py` | SQLAlchemy ORM モデル（User, Group, GroupMember, Schedule） |
| `backend/app/schemas/__init__.py` | パッケージ宣言 |
| `backend/app/schemas/schemas.py` | Pydantic スキーマ（UserResponse 等） |
| `backend/app/dependencies.py` | `get_current_user` 依存注入 |
| `backend/app/routers/__init__.py` | パッケージ宣言 |
| `backend/app/routers/auth.py` | Discord OAuth ルーター |
| `backend/app/main.py` | FastAPI 起動・ミドルウェア・ルーター登録 |
| `backend/alembic.ini` | Alembic 設定 |
| `backend/alembic/env.py` | Alembic 非同期マイグレーション設定 |
| `backend/alembic/versions/` | マイグレーションファイル格納先 |
| `backend/tests/conftest.py` | pytest フィクスチャ（SQLite インメモリ DB） |
| `backend/tests/test_config.py` | config.py のテスト |
| `backend/tests/test_models.py` | モデルのテスト |
| `backend/tests/test_auth.py` | 認証エンドポイントのテスト |

---

## Task 1: プロジェクト構造の初期化

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: ディレクトリ構造を作成する**

```bash
mkdir -p backend/app/models backend/app/schemas backend/app/routers
mkdir -p backend/alembic/versions backend/tests
touch backend/app/__init__.py
touch backend/app/models/__init__.py
touch backend/app/schemas/__init__.py
touch backend/app/routers/__init__.py
touch backend/tests/__init__.py
```

- [ ] **Step 2: pyproject.toml を作成する**

`backend/pyproject.toml` を以下の内容で作成する：

```toml
[project]
name = "group-schedule-adjustment-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    "pydantic-settings>=2.0.0",
    "python-jose[cryptography]>=3.3.0",
    "httpx>=0.27.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-mock>=3.12.0",
    "aiosqlite>=0.20.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-mock>=3.12.0",
    "aiosqlite>=0.20.0",
]
```

- [ ] **Step 3: .env.example を作成する**

`backend/.env.example` を以下の内容で作成する：

```env
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>:<port>/<db>
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:8000/auth/discord/callback
JWT_SECRET=your_random_secret_key_min_32_chars
FRONTEND_URL=http://localhost:5173
APP_ENV=development
```

- [ ] **Step 4: 依存パッケージをインストールする**

```bash
cd backend
uv sync --extra dev
```

期待される出力: `Resolved N packages` のようなメッセージ（エラーなし）

- [ ] **Step 5: コミットする**

```bash
git init
git add backend/pyproject.toml backend/.env.example backend/app/__init__.py \
        backend/app/models/__init__.py backend/app/schemas/__init__.py \
        backend/app/routers/__init__.py backend/tests/__init__.py
git commit -m "バックエンドプロジェクトの初期構造を作成"
```

---

## Task 2: 設定管理 (config.py)

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/tests/test_config.py`

- [ ] **Step 1: テストを書く**

`backend/tests/test_config.py` を以下の内容で作成する：

```python
import pytest
from unittest.mock import patch


def test_settings_load_from_env():
    """環境変数からすべての必須フィールドを読み込めること"""
    env_vars = {
        "DATABASE_URL": "postgresql+asyncpg://user:pass@host:5432/db",
        "DISCORD_CLIENT_ID": "test_client_id",
        "DISCORD_CLIENT_SECRET": "test_client_secret",
        "DISCORD_REDIRECT_URI": "http://localhost:8000/auth/discord/callback",
        "JWT_SECRET": "test_secret_key_that_is_long_enough",
        "FRONTEND_URL": "http://localhost:5173",
        "APP_ENV": "development",
    }
    with patch.dict("os.environ", env_vars, clear=True):
        # モジュールを再インポートして環境変数を反映させる
        import importlib
        import app.config as config_module
        importlib.reload(config_module)
        settings = config_module.Settings()

        assert settings.database_url == env_vars["DATABASE_URL"]
        assert settings.discord_client_id == env_vars["DISCORD_CLIENT_ID"]
        assert settings.app_env == "development"


def test_settings_app_env_default():
    """APP_ENV が未設定のとき development がデフォルトであること"""
    env_vars = {
        "DATABASE_URL": "postgresql+asyncpg://user:pass@host:5432/db",
        "DISCORD_CLIENT_ID": "id",
        "DISCORD_CLIENT_SECRET": "secret",
        "DISCORD_REDIRECT_URI": "http://localhost:8000/auth/discord/callback",
        "JWT_SECRET": "secret_key",
        "FRONTEND_URL": "http://localhost:5173",
    }
    with patch.dict("os.environ", env_vars, clear=True):
        import importlib
        import app.config as config_module
        importlib.reload(config_module)
        settings = config_module.Settings()

        assert settings.app_env == "development"
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd backend
uv run pytest tests/test_config.py -v
```

期待される出力: `ModuleNotFoundError` または `ImportError`（config.py が存在しないため）

- [ ] **Step 3: config.py を実装する**

`backend/app/config.py` を以下の内容で作成する：

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    discord_client_id: str
    discord_client_secret: str
    discord_redirect_uri: str
    jwt_secret: str
    frontend_url: str
    app_env: str = "development"


settings = Settings()
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd backend
uv run pytest tests/test_config.py -v
```

期待される出力: `2 passed`

- [ ] **Step 5: コミットする**

```bash
git add backend/app/config.py backend/tests/test_config.py
git commit -m "設定管理モジュールを追加（pydantic-settings）"
```

---

## Task 3: データベース接続 (database.py)

**Files:**
- Create: `backend/app/database.py`

- [ ] **Step 1: database.py を実装する**

`backend/app/database.py` を以下の内容で作成する：

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


engine = create_async_engine(settings.database_url, echo=settings.app_env == "development")
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 2: インポートが通ることを確認する**

`.env` ファイルを作成する（Supabase の接続情報を使用）：

```bash
cp backend/.env.example backend/.env
# backend/.env を編集して実際の Supabase の DATABASE_URL を設定する
# Supabase ダッシュボード → Settings → Database → Connection string → URI をコピー
# postgresql://... の部分を postgresql+asyncpg://... に変更する
```

```bash
cd backend
uv run python -c "from app.database import Base, engine, get_db; print('OK')"
```

期待される出力: `OK`

- [ ] **Step 3: コミットする**

```bash
git add backend/app/database.py
git commit -m "SQLAlchemy 非同期データベース接続を追加"
```

---

## Task 4: SQLAlchemy モデル定義 (models.py)

**Files:**
- Create: `backend/app/models/models.py`
- Create: `backend/tests/test_models.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: テスト用フィクスチャ (conftest.py) を作成する**

`backend/tests/conftest.py` を以下の内容で作成する：

```python
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

# テスト用インメモリ SQLite
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
async def client(db_session):
    """DB をオーバーライドした FastAPI テストクライアントを提供する"""
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

- [ ] **Step 2: モデルのテストを書く**

`backend/tests/test_models.py` を以下の内容で作成する：

```python
import uuid
import pytest
from sqlalchemy import select
from app.models.models import User, Group, GroupMember, Schedule
from datetime import datetime


@pytest.mark.asyncio
async def test_create_user(db_session):
    """User モデルを保存・取得できること"""
    user = User(
        discord_id="123456789",
        username="testuser",
        avatar_url="https://cdn.discordapp.com/avatars/123/abc.png",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert isinstance(user.id, uuid.UUID)
    assert user.discord_id == "123456789"
    assert user.username == "testuser"
    assert isinstance(user.created_at, datetime)


@pytest.mark.asyncio
async def test_user_discord_id_unique(db_session):
    """同じ discord_id を持つ User を 2 件保存するとエラーになること"""
    from sqlalchemy.exc import IntegrityError

    user1 = User(discord_id="same_id", username="user1")
    user2 = User(discord_id="same_id", username="user2")
    db_session.add(user1)
    await db_session.commit()

    db_session.add(user2)
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_group_member_unique_constraint(db_session):
    """同じ (group_id, user_id) の GroupMember を 2 件保存するとエラーになること"""
    from sqlalchemy.exc import IntegrityError

    user = User(discord_id="uid1", username="user1")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    group = Group(name="テストグループ", invite_code="ABC123", created_by=user.id)
    db_session.add(group)
    await db_session.commit()
    await db_session.refresh(group)

    member1 = GroupMember(group_id=group.id, user_id=user.id)
    member2 = GroupMember(group_id=group.id, user_id=user.id)
    db_session.add(member1)
    await db_session.commit()

    db_session.add(member2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
cd backend
uv run pytest tests/test_models.py -v
```

期待される出力: `ImportError: cannot import name 'User'`

- [ ] **Step 4: models.py を実装する**

`backend/app/models/models.py` を以下の内容で作成する：

```python
import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    discord_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    invite_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("groups.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("groups.id"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 5: テストが通ることを確認する**

```bash
cd backend
uv run pytest tests/test_models.py -v
```

期待される出力: `3 passed`

- [ ] **Step 6: コミットする**

```bash
git add backend/app/models/models.py backend/tests/conftest.py backend/tests/test_models.py
git commit -m "SQLAlchemy ORM モデルを追加（User, Group, GroupMember, Schedule）"
```

---

## Task 5: Pydantic スキーマ (schemas.py)

**Files:**
- Create: `backend/app/schemas/schemas.py`

- [ ] **Step 1: schemas.py を実装する**

`backend/app/schemas/schemas.py` を以下の内容で作成する：

```python
import uuid

from pydantic import BaseModel


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    username: str
    avatar_url: str | None
```

- [ ] **Step 2: スキーマのシリアライズを確認する**

```bash
cd backend
uv run python -c "
from app.schemas.schemas import UserResponse
import uuid

data = UserResponse(id=uuid.uuid4(), username='test', avatar_url=None)
print(data.model_dump())
"
```

期待される出力: `{'id': UUID('...'), 'username': 'test', 'avatar_url': None}`

- [ ] **Step 3: コミットする**

```bash
git add backend/app/schemas/schemas.py
git commit -m "Pydantic レスポンス スキーマを追加"
```

---

## Task 6: Alembic セットアップとマイグレーション

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (初回マイグレーションファイル)

- [ ] **Step 1: Alembic を初期化する**

```bash
cd backend
uv run alembic init alembic
```

期待される出力: `Creating directory .../alembic ...  done`

- [ ] **Step 2: alembic.ini の sqlalchemy.url を設定する**

`backend/alembic.ini` の以下の行を変更する：

```ini
# 変更前
sqlalchemy.url = driver://user:pass@localhost/dbname

# 変更後（.env から読み込むため空にする）
sqlalchemy.url =
```

- [ ] **Step 3: alembic/env.py を非同期対応に書き換える**

`backend/alembic/env.py` を以下の内容に完全に書き換える：

```python
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# モデルをインポートして Base.metadata を取得する
from app.database import Base
from app.models import models  # noqa: F401（モデルを Base に登録するため）
from app.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 環境変数から DATABASE_URL を取得する
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: 初回マイグレーションを自動生成する**

```bash
cd backend
uv run alembic revision --autogenerate -m "初期テーブル作成"
```

期待される出力: `Generating .../alembic/versions/xxxx_初期テーブル作成.py ...  done`

生成されたファイルを確認して `users`, `groups`, `group_members`, `schedules` の4テーブルが含まれていることを確認する。

- [ ] **Step 5: Supabase にマイグレーションを適用する**

```bash
cd backend
uv run alembic upgrade head
```

期待される出力: `Running upgrade  -> xxxx, 初期テーブル作成`

Supabase ダッシュボード → Table Editor でテーブルが作成されたことを確認する。

- [ ] **Step 6: コミットする**

```bash
git add backend/alembic.ini backend/alembic/env.py backend/alembic/script.py.mako \
        backend/alembic/versions/
git commit -m "Alembic 非同期マイグレーション設定と初期テーブルを追加"
```

---

## Task 7: 認証依存関係 (dependencies.py)

**Files:**
- Create: `backend/app/dependencies.py`

- [ ] **Step 1: dependencies.py を実装する**

`backend/app/dependencies.py` を以下の内容で作成する：

```python
import uuid as uuid_lib

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.models import User


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証されていません",
        )
    try:
        payload = jwt.decode(access_token, settings.jwt_secret, algorithms=["HS256"])
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="トークンが無効です",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンが無効です",
        )

    result = await db.execute(select(User).where(User.id == uuid_lib.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーが見つかりません",
        )
    return user
```

- [ ] **Step 2: インポートが通ることを確認する**

```bash
cd backend
uv run python -c "from app.dependencies import get_current_user; print('OK')"
```

期待される出力: `OK`

- [ ] **Step 3: コミットする**

```bash
git add backend/app/dependencies.py
git commit -m "JWT Cookie 認証依存関係を追加"
```

---

## Task 8: Discord OAuth ルーター (auth.py)

**Files:**
- Create: `backend/app/routers/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: テストを書く**

`backend/tests/test_auth.py` を以下の内容で作成する：

```python
import uuid
import pytest
from unittest.mock import AsyncMock, patch
from jose import jwt
from datetime import datetime, timedelta

from app.config import settings
from app.models.models import User


def _make_jwt(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=7)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_discord_login_redirect(client):
    """/auth/discord が Discord OAuth URL にリダイレクトすること"""
    response = await client.get("/auth/discord", follow_redirects=False)

    assert response.status_code == 302
    location = response.headers["location"]
    assert "discord.com/oauth2/authorize" in location
    assert "client_id=" in location
    assert "scope=identify" in location


@pytest.mark.asyncio
async def test_discord_callback_creates_user(client, db_session):
    """/auth/discord/callback で新規ユーザーが作成され、Cookie がセットされること"""
    mock_token_response = AsyncMock()
    mock_token_response.status_code = 200
    mock_token_response.json.return_value = {"access_token": "discord_access_token"}

    mock_user_response = AsyncMock()
    mock_user_response.status_code = 200
    mock_user_response.json.return_value = {
        "id": "999888777",
        "username": "newuser",
        "avatar": "abcdef123",
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_token_response)
    mock_client.get = AsyncMock(return_value=mock_user_response)

    with patch("app.routers.auth.httpx.AsyncClient", return_value=mock_client):
        response = await client.get("/auth/discord/callback?code=test_code", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"].endswith("/home")
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_discord_callback_upserts_existing_user(client, db_session):
    """/auth/discord/callback で既存ユーザーのusernameが更新されること"""
    from sqlalchemy import select

    existing_user = User(discord_id="111222333", username="oldname", avatar_url=None)
    db_session.add(existing_user)
    await db_session.commit()

    mock_token_response = AsyncMock()
    mock_token_response.status_code = 200
    mock_token_response.json.return_value = {"access_token": "discord_access_token"}

    mock_user_response = AsyncMock()
    mock_user_response.status_code = 200
    mock_user_response.json.return_value = {
        "id": "111222333",
        "username": "newname",
        "avatar": None,
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_token_response)
    mock_client.get = AsyncMock(return_value=mock_user_response)

    with patch("app.routers.auth.httpx.AsyncClient", return_value=mock_client):
        response = await client.get("/auth/discord/callback?code=test_code", follow_redirects=False)

    assert response.status_code == 302

    result = await db_session.execute(select(User).where(User.discord_id == "111222333"))
    user = result.scalar_one()
    assert user.username == "newname"


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
    """/auth/logout で Cookie が削除されること"""
    user = User(discord_id="444333222", username="logoutuser", avatar_url=None)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = _make_jwt(str(user.id))
    client.cookies.set("access_token", token)

    response = await client.post("/auth/logout")

    assert response.status_code == 200
    assert "access_token" not in response.cookies or response.cookies.get("access_token") == ""
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd backend
uv run pytest tests/test_auth.py -v
```

期待される出力: `ImportError` または `404` エラー（auth.py が存在しないため）

- [ ] **Step 3: auth.py を実装する**

`backend/app/routers/auth.py` を以下の内容で作成する：

```python
from datetime import datetime, timedelta

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

router = APIRouter(prefix="/auth", tags=["auth"])

DISCORD_API_BASE = "https://discord.com/api/v10"


def _build_discord_oauth_url() -> str:
    params = {
        "client_id": settings.discord_client_id,
        "redirect_uri": settings.discord_redirect_uri,
        "response_type": "code",
        "scope": "identify",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"https://discord.com/oauth2/authorize?{query}"


def _create_jwt(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=7)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm="HS256")


@router.get("/discord")
async def discord_login():
    return RedirectResponse(url=_build_discord_oauth_url())


@router.get("/discord/callback")
async def discord_callback(code: str, db: AsyncSession = Depends(get_db)):
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
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Discord トークン取得に失敗しました",
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

    response = RedirectResponse(url=f"{settings.frontend_url}/home")
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        max_age=604800,
    )
    return response


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout(response: Response, _: User = Depends(get_current_user)):
    response.delete_cookie("access_token")
    return {"message": "ログアウトしました"}
```

- [ ] **Step 4: テストが通ることを確認する（main.py 未作成のため一部スキップ可）**

この時点では main.py がないためテストは失敗する。Task 9 完了後に実行する。

- [ ] **Step 5: コミットする**

```bash
git add backend/app/routers/auth.py backend/tests/test_auth.py
git commit -m "Discord OAuth ルーターを追加（/auth/discord, /auth/me, /auth/logout）"
```

---

## Task 9: FastAPI メインアプリ (main.py)

**Files:**
- Create: `backend/app/main.py`

- [ ] **Step 1: main.py を実装する**

`backend/app/main.py` を以下の内容で作成する：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth

app = FastAPI(title="グループスケジュール調整API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 2: 全テストが通ることを確認する**

```bash
cd backend
uv run pytest tests/ -v
```

期待される出力: 全テスト `passed`（`test_config.py`, `test_models.py`, `test_auth.py`）

- [ ] **Step 3: 開発サーバーを起動して動作確認する**

```bash
cd backend
uv run uvicorn app.main:app --reload
```

ブラウザで `http://localhost:8000/docs` を開き、Swagger UI が表示されることを確認する。
`/health` にアクセスして `{"status": "ok"}` が返ることを確認する。

- [ ] **Step 4: コミットする**

```bash
git add backend/app/main.py
git commit -m "FastAPI メインアプリを追加（CORS・ルーター・ヘルスチェック）"
```

---

## 全体の動作確認（実装完了後）

- [ ] **Discord Developer Portal でアプリを作成する**

1. https://discord.com/developers/applications にアクセス
2. 「New Application」→ アプリ名を入力
3. 左メニュー「OAuth2」→「Redirects」に `http://localhost:8000/auth/discord/callback` を追加
4. 「Client ID」と「Client Secret」をコピーして `backend/.env` に設定

- [ ] **Supabase プロジェクトを作成する**

1. https://supabase.com にアクセスしてプロジェクトを新規作成
2. 「Settings」→「Database」→「Connection string」→「URI」をコピー
3. `postgresql://...` を `postgresql+asyncpg://...` に変更して `backend/.env` の `DATABASE_URL` に設定

- [ ] **マイグレーションを適用する**

```bash
cd backend
uv run alembic upgrade head
```

- [ ] **ブラウザで OAuth フロー全体を確認する**

1. `http://localhost:8000/auth/discord` にアクセス
2. Discord 認証ページにリダイレクトされることを確認
3. 認証後、`http://localhost:5173/home` にリダイレクトされることを確認（フロントエンドは未実装のため 404 で OK）
4. `http://localhost:8000/auth/me` にアクセスしてユーザー情報が返ることを確認
