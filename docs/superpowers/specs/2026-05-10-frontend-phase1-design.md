# フロントエンド Phase 1 設計（基盤 + グループ管理）

## 対象フェーズ

フェーズ1（MVP）のフロントエンド全体。バックエンドAPIは実装済み。

## 技術スタック

| 項目 | 採用 |
|------|------|
| ビルド | Vite + React 18 + TypeScript |
| スタイル | Tailwind CSS v3（`darkMode: 'class'` 戦略） |
| ルーティング | React Router v6 |
| 状態管理 | React Context（認証のみ）+ コンポーネント内 `useState` |
| HTTP | `fetch` カスタムラッパー（`src/api/client.ts`） |

## レイアウト方針

- **PCのみ対応**（MVPスコープ。スマホ対応は将来フェーズ）
- **サイドバーレイアウト**：左サイドにナビゲーション、右にメインコンテンツ
- **カラー**：ディープパープルダークをデフォルト（`violet` + `slate`）
- **テーマ切り替え**：`<html>` の `dark` クラスで制御。MVPでは常に `dark` を付与。将来的にライト（クリーンホワイト）モードへの切り替えボタンを追加予定

## ファイル構成

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .env.local            # VITE_API_URL=http://localhost:8000
└── src/
    ├── main.tsx          # ReactDOM.createRoot + <html> に dark クラス付与
    ├── App.tsx           # React Router v6 ルーター定義
    ├── api/
    │   └── client.ts     # fetch ラッパー（baseURL, Cookie, 401処理）
    ├── contexts/
    │   └── AuthContext.tsx  # User | null の認証状態 + Provider
    ├── hooks/
    │   └── useAuth.ts    # useContext(AuthContext) の薄いラッパー
    ├── types/
    │   └── index.ts      # APIレスポンス型定義
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── HomePage.tsx      # グループ一覧
    │   └── GroupDetailPage.tsx
    └── components/
        ├── layout/
        │   ├── AppShell.tsx  # 認証チェック + Sidebar + <Outlet />
        │   └── Sidebar.tsx
        ├── groups/
        │   ├── GroupCard.tsx
        │   ├── CreateGroupModal.tsx
        │   └── JoinGroupModal.tsx
        └── members/
            └── MemberList.tsx
```

## ルーティング

| パス | コンポーネント | 認証 |
|------|-------------|------|
| `/login` | `LoginPage` | 不要 |
| `/home` | `HomePage` | 必須 |
| `/groups/:groupId` | `GroupDetailPage` | 必須 |
| その他 | `/login` にリダイレクト | — |

## 認証フロー

```
アプリ起動
  └─ GET /auth/me
       ├─ 成功 → AuthContext に User をセット → /home へ
       └─ 401  → /login へリダイレクト

ログインボタン押下
  └─ window.location = バックエンドの GET /auth/discord
       └─ Discord OAuth 完了 → バックエンドが /home にリダイレクト
            └─ アプリ再マウント → GET /auth/me（成功）→ /home 表示

ログアウト
  └─ POST /auth/logout → AuthContext をリセット → /login へ
```

`AppShell` コンポーネントが認証チェックを担当する。未認証なら `<Navigate to="/login" />` を返し、認証済みなら `Sidebar + <Outlet />` を表示する。

## APIクライアント（`src/api/client.ts`）

```typescript
const BASE_URL = import.meta.env.VITE_API_URL

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: 'DELETE' }),
}
```

## 型定義（`src/types/index.ts`）

バックエンドの Pydantic スキーマに対応する TypeScript 型。

```typescript
export interface User {
  id: string
  username: string
  avatar_url: string | null
}

export interface Group {
  id: string
  name: string
  invite_code: string
  member_count: number
  is_owner: boolean
}

export interface GroupPreview {
  id: string
  name: string
  member_count: number
}

export interface Member {
  user_id: string
  username: string
  avatar_url: string | null
  is_owner: boolean
}
```

## 各コンポーネントの責務

### `LoginPage`
- 中央にロゴ + 「Discordでログイン」ボタン
- ボタン押下で `window.location = ${VITE_API_URL}/auth/discord`

### `HomePage`
- グループ一覧を `GET /groups` で取得して `GroupCard` 一覧を表示
- 「グループを作成」ボタン → `CreateGroupModal` を開く
- 「招待コードで参加」ボタン → `JoinGroupModal` を開く
- グループカードをクリック → `/groups/:groupId` へ遷移

### `GroupDetailPage`
- `GET /groups/:groupId/members` でメンバー一覧を取得
- グループ名・招待コード・`is_owner` は `HomePage` から `navigate('/groups/:groupId', { state: group })` で渡し、`useLocation().state` で受け取る（バックエンドに `GET /groups/:groupId` 単体エンドポイントが存在しないため）
- グループ名、招待コード（クリックでコピー）、メンバー数を表示
- `MemberList` でメンバー一覧を表示
- オーナーのみ：各メンバー横に「追い出し」ボタン（`DELETE /groups/:groupId/members/:userId`）
- オーナーのみ：「グループ削除」ボタン（`DELETE /groups/:groupId`）→ 成功後 `/home` へ

### `CreateGroupModal` / `JoinGroupModal`
- 外部UIライブラリ不使用（`dialog` 要素 + Tailwind）
- 成功後はグループ一覧をリフレッシュしてモーダルを閉じる

### `Sidebar`
- ロゴ（🗓 GroupSync）
- ナビリンク：グループ一覧
- 下部：ユーザーアバター + ユーザー名 + ログアウトボタン
- アバター `null` のときはイニシャルのプレースホルダーを表示

## スタイリング方針

- Tailwind CSS v3、`darkMode: 'class'` 設定
- `main.tsx` で `document.documentElement.classList.add('dark')` を実行（MVPはダークのみ）
- カラーパレット:
  - primary: `violet-600` / `violet-500`
  - 背景: `slate-900`（ベース）、`slate-800`（サイドバー・カード）
  - テキスト: `slate-100`（メイン）、`slate-400`（サブ）
  - アクセント: `violet-400`（hover、アクティブ状態）

## 環境変数

```
frontend/.env.local
  VITE_API_URL=http://localhost:8000

frontend/.env.production
  VITE_API_URL=https://your-backend.fly.dev
```

## スコープ外（Phase 2 以降）

- スケジュール入力UI（カレンダー）
- グループメンバーの空き時間可視化
- スマホ対応
- ライトモードへの切り替えボタン
- Vercel / Fly.io デプロイ設定
