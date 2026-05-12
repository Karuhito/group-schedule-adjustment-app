# GroupSync — グループスケジュール調整アプリ

Discord ユーザー向けに、グループメンバーの空き時間を共有・可視化する Web アプリです。
「@everyone しても誰も来ない」問題を解決するために、誰がいつ暇かを一目で確認できます。

## デモ

🌐 **本番URL**: https://group-schedule-adjustment-app.vercel.app

<!-- スクリーンショットをここに追加 -->

## 主な機能

- **Discord 認証** — Discord アカウントでログイン
- **グループ管理** — グループの作成・招待コードによる参加・メンバーのキック
- **スケジュール登録** — 空き時間スロットを追加・削除・保存
- **タイムライン表示** — グループメンバー全員の空き時間を重ねて可視化

## 技術スタック

| レイヤー | 技術 |
|--------|------|
| フロントエンド | React + TypeScript + Vite + Tailwind CSS |
| バックエンド | Python + FastAPI |
| データベース | Supabase（PostgreSQL） |
| 認証 | Discord OAuth2 + JWT |
| フロントデプロイ | Vercel |
| バックエンドデプロイ | Fly.io |

## ローカル開発環境のセットアップ

### 必要なもの

- Node.js 20+
- Python 3.11+
- [uv](https://docs.astral.sh/uv/)
- Discord Developer Portal のアプリ（OAuth2 設定済み）
- Supabase プロジェクト

### バックエンド

```bash
cd backend
cp .env.example .env  # 環境変数を設定
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

#### 必要な環境変数（`.env`）

```
DATABASE_URL=postgresql+asyncpg://...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:8000/auth/discord/callback
JWT_SECRET=...
FRONTEND_URL=http://localhost:5173
```

### フロントエンド

```bash
cd frontend
cp .env.example .env  # 環境変数を設定
npm install
npm run dev
```

#### 必要な環境変数（`.env`）

```
VITE_API_URL=http://localhost:8000
```

## テスト

```bash
# フロントエンド
cd frontend && npm test

# バックエンド
cd backend && uv run pytest
```

## デプロイ

- **フロントエンド**: GitHub の `main` ブランチへのプッシュで Vercel が自動デプロイ
- **バックエンド**: `cd backend && fly deploy`

## ライセンス

MIT
