# バックエンド設計：FastAPI + PostgreSQL セットアップ + Discord OAuth

## 対象フェーズ

フェーズ1（MVP）のうち、バックエンド基盤と認証機能。

## 技術スタック

| 要素 | 採用技術 |
|------|---------|
| フレームワーク | FastAPI |
| DBアクセス | SQLAlchemy (async) + asyncpg |
| マイグレーション | Alembic |
| 設定管理 | pydantic-settings |
| JWT | python-jose[cryptography] |
| HTTP クライアント | httpx（Discord API コール用） |
| DB | Supabase（PostgreSQL） — 開発・本番ともに Supabase Cloud |

## ディレクトリ構成

```
backend/
├── app/
│   ├── main.py           # アプリ起動・ミドルウェア設定
│   ├── config.py         # 環境変数（pydantic-settings）
│   ├── database.py       # SQLAlchemy engine / AsyncSession
│   ├── dependencies.py   # get_current_user など共通依存
│   ├── models/
│   │   └── models.py     # SQLAlchemy ORM モデル
│   ├── schemas/
│   │   └── schemas.py    # Pydantic スキーマ
│   └── routers/
│       ├── auth.py       # Discord OAuth + JWT Cookie
│       ├── groups.py
│       └── schedules.py
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── pyproject.toml
└── .env
```

## データモデル

### users
| カラム | 型 | 制約 |
|-------|-----|------|
| id | UUID | PK, default=uuid4 |
| discord_id | VARCHAR | UNIQUE, NOT NULL |
| username | VARCHAR | NOT NULL |
| avatar_url | VARCHAR | nullable |
| created_at | TIMESTAMP | default=now() |

### groups
| カラム | 型 | 制約 |
|-------|-----|------|
| id | UUID | PK |
| name | VARCHAR | NOT NULL |
| invite_code | VARCHAR | UNIQUE, NOT NULL |
| created_by | UUID | FK → users.id |
| created_at | TIMESTAMP | default=now() |

### group_members
| カラム | 型 | 制約 |
|-------|-----|------|
| id | UUID | PK |
| group_id | UUID | FK → groups.id |
| user_id | UUID | FK → users.id |
| joined_at | TIMESTAMP | default=now() |
複合ユニーク制約: (group_id, user_id)

### schedules
| カラム | 型 | 制約 |
|-------|-----|------|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| group_id | UUID | FK → groups.id |
| start_time | TIMESTAMP | NOT NULL |
| end_time | TIMESTAMP | NOT NULL |
| created_at | TIMESTAMP | default=now() |

## Discord OAuth フロー

```
ブラウザ
  │ GET /auth/discord
  ▼
FastAPI → 302 リダイレクト → Discord 認証画面
                                    │
                          ユーザーが認証承認
                                    │
                          GET /auth/discord/callback?code=...
                                    ▼
                              FastAPI
                              ├─ Discord API に code → access_token 交換
                              ├─ Discord API でユーザー情報取得
                              ├─ DB に users を upsert
                              ├─ JWT を発行（有効期限7日）
                              ├─ Cookie にセット（HttpOnly, Secure, SameSite=Lax）
                              └─ 302 リダイレクト → FRONTEND_URL/home
```

## 認証エンドポイント仕様

| メソッド | パス | 説明 | 認証要否 |
|---------|-----|------|---------|
| GET | /auth/discord | Discord OAuth URL へリダイレクト | 不要 |
| GET | /auth/discord/callback | コールバック処理・Cookie セット | 不要 |
| GET | /auth/me | 自分のユーザー情報取得 | 必要 |
| POST | /auth/logout | Cookie 削除 | 必要 |

### レスポンス例

**GET /auth/me**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "kazuto",
  "avatar_url": "https://cdn.discordapp.com/avatars/..."
}
```

## JWT 設定

- アルゴリズム：HS256
- 有効期限：7日（604800秒）
- ペイロード：`{ "sub": "<user_id>", "exp": <timestamp> }`
- Cookie 名：`access_token`
- Cookie 属性：`HttpOnly=True`, `SameSite=lax`, `max_age=604800`
  - ローカル開発では `Secure=False`、本番では `Secure=True`

## CORS 設定

- 許可オリジン：`FRONTEND_URL`（環境変数）
- `allow_credentials=True`（Cookie 送信に必要）
- 許可メソッド：`["GET", "POST", "DELETE"]`

## 環境変数

```env
DATABASE_URL=postgresql+asyncpg://...  # Supabase Connection String（asyncpg用に書き換え）
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:8000/auth/discord/callback
JWT_SECRET=...
FRONTEND_URL=http://localhost:5173
APP_ENV=development  # "production" にすると Cookie の Secure=True になる
```

## エラーハンドリング

- JWT が無効・期限切れ → 401 Unauthorized
- Discord API が失敗 → 502 Bad Gateway
- 認証済みルートで Cookie なし → 401 Unauthorized

## 今回の実装スコープ

1. プロジェクト初期化（pyproject.toml, 依存パッケージ）
2. 設定・DB接続層（config.py, database.py）
3. SQLAlchemy モデル定義（models.py）
4. Alembic 初期マイグレーション
5. Discord OAuth ルーター（auth.py）
6. 共通依存（dependencies.py）
7. main.py（アプリ起動・CORS・ルーター登録）
