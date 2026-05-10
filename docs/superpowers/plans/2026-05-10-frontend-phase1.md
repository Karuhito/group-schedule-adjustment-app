# フロントエンド Phase 1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** グループスケジュール調整アプリのフロントエンド Phase 1（Vite + React 18 + TypeScript + Tailwind CSS + Discord 認証 + グループ管理 UI）を実装する

**Architecture:** Vite + React 18 + TypeScript + Tailwind CSS v3（`darkMode: 'class'`）で構築。React Router v6 でルーティング、React Context で認証状態管理、fetch カスタムラッパーで API 通信。バックエンド API（FastAPI）は実装済みで `http://localhost:8000` で動作する。

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS v3, React Router v6, Vitest 2, @testing-library/react 16, jsdom

---

## ファイル構成

以下のファイルをすべて新規作成する。既存の `backend/` や `docs/` は触らない。

| ファイル | 役割 |
|---------|------|
| `frontend/package.json` | 依存関係 |
| `frontend/vite.config.ts` | Vite + Vitest 設定 |
| `frontend/tailwind.config.ts` | Tailwind darkMode 設定 |
| `frontend/postcss.config.js` | PostCSS（Tailwind 用） |
| `frontend/tsconfig.json` | TypeScript（src 用） |
| `frontend/tsconfig.node.json` | TypeScript（Vite config 用） |
| `frontend/index.html` | エントリポイント HTML |
| `frontend/.env.local` | 開発用 API URL |
| `frontend/.env.test` | テスト用 API URL |
| `frontend/src/index.css` | Tailwind ディレクティブ |
| `frontend/src/test/setup.ts` | Vitest セットアップ |
| `frontend/src/main.tsx` | ReactDOM.createRoot + dark クラス付与 |
| `frontend/src/App.tsx` | React Router v6 ルーター定義 |
| `frontend/src/types/index.ts` | API レスポンス型定義 |
| `frontend/src/api/client.ts` | fetch ラッパー（baseURL、Cookie、401処理） |
| `frontend/src/contexts/AuthContext.tsx` | User \| null の認証状態 + Provider |
| `frontend/src/hooks/useAuth.ts` | useContext(AuthContext) の薄いラッパー |
| `frontend/src/components/layout/AppShell.tsx` | 認証チェック + Sidebar + Outlet |
| `frontend/src/components/layout/Sidebar.tsx` | ナビゲーションサイドバー |
| `frontend/src/pages/LoginPage.tsx` | Discord ログインページ |
| `frontend/src/components/groups/GroupCard.tsx` | グループカード（クリックで詳細へ） |
| `frontend/src/components/members/MemberList.tsx` | メンバー一覧（追い出しボタン付き） |
| `frontend/src/components/groups/CreateGroupModal.tsx` | グループ作成モーダル |
| `frontend/src/components/groups/JoinGroupModal.tsx` | 招待コード参加モーダル |
| `frontend/src/pages/HomePage.tsx` | グループ一覧ページ |
| `frontend/src/pages/GroupDetailPage.tsx` | グループ詳細ページ |

テストファイル：

| ファイル | テスト対象 |
|---------|----------|
| `frontend/src/api/client.test.ts` | fetch ラッパーの動作 |
| `frontend/src/contexts/AuthContext.test.tsx` | 認証コンテキストの状態管理 |
| `frontend/src/components/layout/AppShell.test.tsx` | 認証チェックとリダイレクト |
| `frontend/src/pages/LoginPage.test.tsx` | ログインページのレンダリング |
| `frontend/src/components/groups/GroupCard.test.tsx` | グループカードのレンダリングとクリック |
| `frontend/src/components/members/MemberList.test.tsx` | メンバー一覧と追い出しボタン |
| `frontend/src/components/groups/CreateGroupModal.test.tsx` | グループ作成フォームの送信 |
| `frontend/src/components/groups/JoinGroupModal.test.tsx` | 参加フォームの送信 |
| `frontend/src/pages/HomePage.test.tsx` | グループ一覧の取得と表示 |
| `frontend/src/pages/GroupDetailPage.test.tsx` | メンバー一覧取得とオーナー操作 |

---

## バックエンド API 一覧（参照用）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/auth/discord` | Discord OAuth リダイレクト |
| GET | `/auth/me` | 現在のユーザー取得 |
| POST | `/auth/logout` | ログアウト |
| POST | `/groups` | グループ作成（body: `{ name: string }`） |
| GET | `/groups` | グループ一覧取得 |
| GET | `/groups/by-code/{invite_code}` | 招待コードでグループプレビュー |
| POST | `/groups/by-code/{invite_code}/join` | 招待コードで参加 |
| GET | `/groups/{group_id}/members` | メンバー一覧取得 |
| DELETE | `/groups/{group_id}` | グループ削除（オーナーのみ） |
| DELETE | `/groups/{group_id}/members/{user_id}` | メンバー追い出し（オーナーのみ） |

レスポンス型（`backend/app/schemas/schemas.py` より）：

```typescript
// UserResponse → User
{ id: UUID, username: string, avatar_url: string | null }

// GroupResponse → Group
{ id: UUID, name: string, invite_code: string, member_count: number, is_owner: boolean }

// GroupPreviewResponse → GroupPreview
{ id: UUID, name: string, member_count: number }

// MemberResponse → Member
{ user_id: UUID, username: string, avatar_url: string | null, is_owner: boolean }
```

`DELETE` エンドポイントは `204 No Content` を返す（body なし）。

---

## Task 1: プロジェクトセットアップ

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`
- Create: `frontend/.env.local`
- Create: `frontend/.env.test`
- Create: `frontend/src/index.css`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: `frontend/` ディレクトリ内の全設定ファイルを作成する**

```bash
mkdir -p frontend/src/test
```

`frontend/package.json`:
```json
{
  "name": "group-schedule-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.2",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

`frontend/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

`frontend/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`frontend/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "tailwind.config.ts"]
}
```

`frontend/index.html`:
```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GroupSync</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/.env.local`:
```
VITE_API_URL=http://localhost:8000
```

`frontend/.env.test`:
```
VITE_API_URL=http://localhost:8000
```

`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`frontend/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 2: 依存パッケージをインストールする**

```bash
cd frontend && npm install
```

Expected: `node_modules/` が生成される（エラーなし）

- [ ] **Step 3: テストが実行できることを確認する**

```bash
cd frontend && npm test
```

Expected: `No test files found` または `0 tests passed` のような出力（エラーなし）

- [ ] **Step 4: 開発サーバーが起動できることを確認する（Ctrl+C で停止）**

```bash
cd frontend && npm run dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML が返ってくる（`<html` を含む）

- [ ] **Step 5: コミット**

```bash
cd frontend && git add -A && cd .. && git commit -m "[2026-05-10] 設定: フロントエンド Vite + React + Tailwind プロジェクトセットアップ

- package.json, vite.config.ts, tailwind.config.ts を作成
- tsconfig.json, postcss.config.js, index.html を作成
- Vitest + @testing-library/react テスト環境を設定
- .env.local, .env.test に VITE_API_URL を設定"
```

---

## Task 2: 型定義・APIクライアント

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/api/client.ts`
- Test: `frontend/src/api/client.test.ts`

- [ ] **Step 1: `src/types/index.ts` を作成する**

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

- [ ] **Step 2: `src/api/client.test.ts` を作成する（テストが失敗することを確認）**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GET リクエストで fetch を正しいオプションで呼ぶ', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1', username: 'Alice', avatar_url: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const result = await api.get('/auth/me')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result).toEqual({ id: '1', username: 'Alice', avatar_url: null })
  })

  it('POST リクエストで method と body を設定して fetch を呼ぶ', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'g1' }), { status: 200 }),
    )
    await api.post('/groups', { name: 'テスト' })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/groups',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'テスト' }),
      }),
    )
  })

  it('401 レスポンスで Unauthorized エラーをスローする', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 401 }))
    await expect(api.get('/auth/me')).rejects.toThrow('Unauthorized')
  })

  it('4xx/5xx レスポンスでレスポンスボディのエラーをスローする', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('グループが見つかりません', { status: 404 }),
    )
    await expect(api.get('/groups/unknown')).rejects.toThrow('グループが見つかりません')
  })

  it('DELETE リクエスト（204）で undefined を返す', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
    const result = await api.del('/groups/g1')
    expect(result).toBeUndefined()
  })
})
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './client'`

- [ ] **Step 4: `src/api/client.ts` を作成する**

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
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
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

- [ ] **Step 5: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 5 tests PASS

- [ ] **Step 6: コミット**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts frontend/src/api/client.test.ts
git commit -m "[2026-05-10] 追加: 型定義と API クライアント（fetch ラッパー）を実装

- src/types/index.ts に User, Group, GroupPreview, Member 型を定義
- src/api/client.ts に fetch ラッパーを実装（credentials, 401処理, 204処理）
- client.test.ts で GET/POST/401/404/DELETE の動作をテスト"
```

---

## Task 3: 認証コンテキスト（AuthContext + useAuth）

**Files:**
- Create: `frontend/src/contexts/AuthContext.tsx`
- Create: `frontend/src/hooks/useAuth.ts`
- Test: `frontend/src/contexts/AuthContext.test.tsx`

- [ ] **Step 1: `src/contexts/AuthContext.test.tsx` を作成する（テストが失敗することを確認）**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

function TestComponent() {
  const { user, loading } = useAuth()
  if (loading) return <div>loading</div>
  return <div>{user ? user.username : 'no user'}</div>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('初期状態は loading インジケーターを表示する', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )
    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('GET /auth/me 成功後にユーザー名を表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: 'u1',
      username: 'Alice',
      avatar_url: null,
    })
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
  })

  it('GET /auth/me 失敗後は user=null のまま', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'))
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument())
  })

  it('setUser でユーザーを更新できる', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: 'u1',
      username: 'Alice',
      avatar_url: null,
    })

    function UpdateComponent() {
      const { user, setUser, loading } = useAuth()
      if (loading) return <div>loading</div>
      return (
        <div>
          <span>{user ? user.username : 'no user'}</span>
          <button onClick={() => setUser(null)}>logout</button>
        </div>
      )
    }

    const { getByRole } = render(
      <AuthProvider>
        <UpdateComponent />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    getByRole('button', { name: 'logout' }).click()
    expect(screen.getByText('no user')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './AuthContext'`

- [ ] **Step 3: `src/contexts/AuthContext.tsx` を作成する**

```typescript
import { createContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../types'

export interface AuthContextValue {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 4: `src/hooks/useAuth.ts` を作成する**

```typescript
import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth は AuthProvider の内側で使用してください')
  return ctx
}
```

- [ ] **Step 5: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 9 tests PASS (Task 2 の 5 件 + Task 3 の 4 件)

- [ ] **Step 6: コミット**

```bash
git add frontend/src/contexts/AuthContext.tsx frontend/src/hooks/useAuth.ts frontend/src/contexts/AuthContext.test.tsx
git commit -m "[2026-05-10] 追加: 認証コンテキスト（AuthContext, useAuth）を実装

- AuthContext で User | null の状態を管理し、起動時に GET /auth/me を呼ぶ
- useAuth は AuthContext の薄いラッパー
- AuthContext.test.tsx で初期状態・成功・失敗・setUser を検証"
```

---

## Task 4: レイアウト（AppShell + Sidebar）

**Files:**
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Test: `frontend/src/components/layout/AppShell.test.tsx`

- [ ] **Step 1: `src/components/layout/AppShell.test.tsx` を作成する（テストが失敗することを確認）**

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { useAuth } from '../../hooks/useAuth'
import type { AuthContextValue } from '../../contexts/AuthContext'

vi.mock('../../hooks/useAuth')

const mockUser = { id: 'u1', username: 'Alice', avatar_url: null }

function buildAuth(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    setUser: vi.fn(),
    loading: false,
    ...overrides,
  }
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
  })

  it('loading=true のとき「読み込み中...」を表示する', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuth({ loading: true }))
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('未認証（user=null）は /login にリダイレクトする', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuth({ user: null, loading: false }))
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route element={<AppShell />}>
            <Route path="/home" element={<div>home page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('認証済みのとき子コンテンツを表示する', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuth({ user: mockUser }))
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<div>home content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('home content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './AppShell'`

- [ ] **Step 3: `src/components/layout/` ディレクトリを作成し `AppShell.tsx` を実装する**

```bash
mkdir -p frontend/src/components/layout
```

`frontend/src/components/layout/AppShell.tsx`:
```typescript
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: `src/components/layout/Sidebar.tsx` を実装する**

```typescript
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

export function Sidebar() {
  const { user, setUser } = useAuth()

  async function handleLogout() {
    await api.post('/auth/logout', {})
    setUser(null)
    window.location.href = '/login'
  }

  const initial = user?.username.charAt(0).toUpperCase() ?? ''

  return (
    <aside className="flex w-56 flex-col bg-slate-800 p-4">
      <div className="mb-8">
        <span className="text-lg font-bold text-violet-400">🗓 GroupSync</span>
      </div>
      <nav className="flex-1">
        <Link
          to="/home"
          className="block rounded px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-violet-400"
        >
          グループ一覧
        </Link>
      </nav>
      <div className="border-t border-slate-700 pt-4">
        <div className="mb-2 flex items-center gap-3">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
              {initial}
            </div>
          )}
          <span className="text-sm text-slate-300">{user?.username}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200"
        >
          ログアウト
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 12 tests PASS（Task 2 の 5 件 + Task 3 の 4 件 + Task 4 の 3 件）

- [ ] **Step 6: コミット**

```bash
git add frontend/src/components/layout/
git commit -m "[2026-05-10] 追加: レイアウトコンポーネント（AppShell, Sidebar）を実装

- AppShell: 認証チェック（loading/未認証リダイレクト/認証済み表示）
- Sidebar: ロゴ・ナビリンク・ユーザー情報・ログアウトボタン
- AppShell.test.tsx で 3 ケースを検証"
```

---

## Task 5: ルーティング（main.tsx + App.tsx）

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

このタスクは設定のみ。ユニットテストではなく `npm run dev` で動作確認する。

- [ ] **Step 1: `src/main.tsx` を作成する**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 2: `src/App.tsx` を作成する**

```typescript
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { GroupDetailPage } from './pages/GroupDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

- [ ] **Step 3: 既存のテストが引き続き通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 12 tests PASS（エラーなし。App.tsx の import 先はまだ存在しないが、テストは影響を受けない）

- [ ] **Step 4: コミット**

```bash
git add frontend/src/main.tsx frontend/src/App.tsx
git commit -m "[2026-05-10] 追加: React Router v6 ルーター定義（main.tsx, App.tsx）

- main.tsx で dark クラスを html タグに付与
- App.tsx で /login・/home・/groups/:groupId のルートを定義
- AppShell を認証ガードとして全認証ルートをラップ"
```

---

## Task 6: LoginPage

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`
- Test: `frontend/src/pages/LoginPage.test.tsx`

- [ ] **Step 1: `src/pages/LoginPage.test.tsx` を作成する（テストが失敗することを確認）**

```bash
mkdir -p frontend/src/pages
```

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('ロゴタイトルを表示する', () => {
    render(<LoginPage />)
    expect(screen.getByText('🗓 GroupSync')).toBeInTheDocument()
  })

  it('「Discord でログイン」ボタンを表示する', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: 'Discord でログイン' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './LoginPage'`

- [ ] **Step 3: `src/pages/LoginPage.tsx` を実装する**

```typescript
const API_URL = import.meta.env.VITE_API_URL

export function LoginPage() {
  function handleLogin() {
    window.location.href = `${API_URL}/auth/discord`
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-900">
      <div className="mb-4 text-4xl font-bold text-violet-400">🗓 GroupSync</div>
      <p className="mb-8 text-slate-400">グループの空き時間を共有・可視化するアプリ</p>
      <button
        onClick={handleLogin}
        className="rounded-lg bg-violet-600 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-violet-500"
      >
        Discord でログイン
      </button>
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 14 tests PASS（既存 12 件 + LoginPage 2 件）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/pages/LoginPage.test.tsx
git commit -m "[2026-05-10] 追加: LoginPage（Discord OAuth ログイン画面）を実装"
```

---

## Task 7: GroupCard + MemberList

**Files:**
- Create: `frontend/src/components/groups/GroupCard.tsx`
- Create: `frontend/src/components/members/MemberList.tsx`
- Test: `frontend/src/components/groups/GroupCard.test.tsx`
- Test: `frontend/src/components/members/MemberList.test.tsx`

- [ ] **Step 1: `src/components/groups/GroupCard.test.tsx` を作成する**

```bash
mkdir -p frontend/src/components/groups frontend/src/components/members
```

`frontend/src/components/groups/GroupCard.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GroupCard } from './GroupCard'
import type { Group } from '../../types'

const group: Group = {
  id: 'g1',
  name: '週末ゲーム部',
  invite_code: 'abc123',
  member_count: 4,
  is_owner: false,
}

describe('GroupCard', () => {
  it('グループ名とメンバー数を表示する', () => {
    render(<GroupCard group={group} onClick={vi.fn()} />)
    expect(screen.getByText('週末ゲーム部')).toBeInTheDocument()
    expect(screen.getByText('4 人')).toBeInTheDocument()
  })

  it('クリックで onClick がグループオブジェクトを引数に呼ばれる', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<GroupCard group={group} onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(group)
  })
})
```

- [ ] **Step 2: `src/components/members/MemberList.test.tsx` を作成する**

`frontend/src/components/members/MemberList.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MemberList } from './MemberList'
import type { Member } from '../../types'

const members: Member[] = [
  { user_id: 'u1', username: 'Alice', avatar_url: null, is_owner: true },
  { user_id: 'u2', username: 'Bob', avatar_url: null, is_owner: false },
]

describe('MemberList', () => {
  it('全メンバーを表示する', () => {
    render(
      <MemberList members={members} isOwner={false} currentUserId="u3" onKick={vi.fn()} />,
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('オーナーバッジを表示する', () => {
    render(
      <MemberList members={members} isOwner={false} currentUserId="u3" onKick={vi.fn()} />,
    )
    expect(screen.getByText('オーナー')).toBeInTheDocument()
  })

  it('isOwner=false のとき追い出しボタンを表示しない', () => {
    render(
      <MemberList members={members} isOwner={false} currentUserId="u3" onKick={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: '追い出し' })).not.toBeInTheDocument()
  })

  it('isOwner=true のとき自分以外のメンバーに追い出しボタンを表示し、クリックで onKick を呼ぶ', async () => {
    const user = userEvent.setup()
    const onKick = vi.fn()
    render(
      <MemberList members={members} isOwner={true} currentUserId="u1" onKick={onKick} />,
    )
    const kickBtn = screen.getByRole('button', { name: '追い出し' })
    await user.click(kickBtn)
    expect(onKick).toHaveBeenCalledWith('u2')
  })
})
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './GroupCard'`

- [ ] **Step 4: `src/components/groups/GroupCard.tsx` を実装する**

```typescript
import type { Group } from '../../types'

interface GroupCardProps {
  group: Group
  onClick: (group: Group) => void
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  return (
    <button
      onClick={() => onClick(group)}
      className="w-full rounded-lg bg-slate-800 p-4 text-left transition-colors hover:bg-slate-700"
    >
      <div className="font-semibold text-slate-100">{group.name}</div>
      <div className="mt-1 text-sm text-slate-400">{group.member_count} 人</div>
    </button>
  )
}
```

- [ ] **Step 5: `src/components/members/MemberList.tsx` を実装する**

```typescript
import type { Member } from '../../types'

interface MemberListProps {
  members: Member[]
  isOwner: boolean
  currentUserId: string
  onKick: (userId: string) => void
}

export function MemberList({ members, isOwner, currentUserId, onKick }: MemberListProps) {
  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <li
          key={member.user_id}
          className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.username}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                {member.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-slate-100">{member.username}</span>
              {member.is_owner && (
                <span className="ml-2 text-xs text-violet-400">オーナー</span>
              )}
            </div>
          </div>
          {isOwner && !member.is_owner && member.user_id !== currentUserId && (
            <button
              onClick={() => onKick(member.user_id)}
              className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-900/30"
            >
              追い出し
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 6: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 20 tests PASS（既存 14 件 + GroupCard 2 件 + MemberList 4 件）

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/groups/GroupCard.tsx frontend/src/components/groups/GroupCard.test.tsx frontend/src/components/members/MemberList.tsx frontend/src/components/members/MemberList.test.tsx
git commit -m "[2026-05-10] 追加: GroupCard・MemberList コンポーネントを実装

- GroupCard: グループ名・メンバー数表示、クリックでコールバック
- MemberList: メンバー一覧・オーナーバッジ・追い出しボタン（オーナーのみ）"
```

---

## Task 8: CreateGroupModal

**Files:**
- Create: `frontend/src/components/groups/CreateGroupModal.tsx`
- Test: `frontend/src/components/groups/CreateGroupModal.test.tsx`

- [ ] **Step 1: `src/components/groups/CreateGroupModal.test.tsx` を作成する**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateGroupModal } from './CreateGroupModal'
import { api } from '../../api/client'

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

describe('CreateGroupModal', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('グループ名を入力して送信すると POST /groups が呼ばれる', async () => {
    const user = userEvent.setup()
    const newGroup = {
      id: 'g1',
      name: '新グループ',
      invite_code: 'abc',
      member_count: 1,
      is_owner: true,
    }
    vi.mocked(api.post).mockResolvedValueOnce(newGroup)
    const onCreated = vi.fn()

    render(<CreateGroupModal onClose={vi.fn()} onCreated={onCreated} />)
    await user.type(screen.getByLabelText('グループ名'), '新グループ')
    await user.click(screen.getByRole('button', { name: '作成する' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(newGroup))
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/groups', { name: '新グループ' })
  })

  it('空のグループ名では送信しない', async () => {
    const user = userEvent.setup()
    render(<CreateGroupModal onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '作成する' }))
    expect(vi.mocked(api.post)).not.toHaveBeenCalled()
  })

  it('API エラー時にエラーメッセージを表示する', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockRejectedValueOnce(new Error('サーバーエラー'))

    render(<CreateGroupModal onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.type(screen.getByLabelText('グループ名'), 'テスト')
    await user.click(screen.getByRole('button', { name: '作成する' }))

    await waitFor(() => expect(screen.getByText('サーバーエラー')).toBeInTheDocument())
  })

  it('「キャンセル」ボタンで onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CreateGroupModal onClose={onClose} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './CreateGroupModal'`

- [ ] **Step 3: `src/components/groups/CreateGroupModal.tsx` を実装する**

```typescript
import { useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Group } from '../../types'

interface CreateGroupModalProps {
  onClose: () => void
  onCreated: (group: Group) => void
}

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const group = await api.post<Group>('/groups', { name: name.trim() })
      onCreated(group)
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <dialog
        open
        className="w-96 rounded-xl bg-slate-800 p-6 shadow-2xl"
        aria-label="グループを作成"
      >
        <h2 className="mb-4 text-lg font-bold text-slate-100">グループを作成</h2>
        <form onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="group-name">
            グループ名
          </label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="グループ名を入力..."
            aria-label="グループ名"
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              作成する
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 24 tests PASS（既存 20 件 + CreateGroupModal 4 件）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/groups/CreateGroupModal.tsx frontend/src/components/groups/CreateGroupModal.test.tsx
git commit -m "[2026-05-10] 追加: CreateGroupModal（グループ作成モーダル）を実装

- グループ名入力 → POST /groups → onCreated コールバック
- 空欄チェック・API エラー表示・ローディング状態を実装"
```

---

## Task 9: JoinGroupModal

**Files:**
- Create: `frontend/src/components/groups/JoinGroupModal.tsx`
- Test: `frontend/src/components/groups/JoinGroupModal.test.tsx`

- [ ] **Step 1: `src/components/groups/JoinGroupModal.test.tsx` を作成する**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JoinGroupModal } from './JoinGroupModal'
import { api } from '../../api/client'

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

describe('JoinGroupModal', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('招待コードを入力して参加すると POST /groups/by-code/{code}/join が呼ばれる', async () => {
    const user = userEvent.setup()
    const joinedGroup = {
      id: 'g1',
      name: '週末ゲーム部',
      invite_code: 'abc123',
      member_count: 5,
      is_owner: false,
    }
    vi.mocked(api.post).mockResolvedValueOnce(joinedGroup)
    const onJoined = vi.fn()

    render(<JoinGroupModal onClose={vi.fn()} onJoined={onJoined} />)
    await user.type(screen.getByLabelText('招待コード'), 'abc123')
    await user.click(screen.getByRole('button', { name: '参加する' }))

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(joinedGroup))
    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/groups/by-code/abc123/join',
      {},
    )
  })

  it('空の招待コードでは送信しない', async () => {
    const user = userEvent.setup()
    render(<JoinGroupModal onClose={vi.fn()} onJoined={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '参加する' }))
    expect(vi.mocked(api.post)).not.toHaveBeenCalled()
  })

  it('API エラー時にエラーメッセージを表示する', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockRejectedValueOnce(new Error('招待コードが見つかりません'))

    render(<JoinGroupModal onClose={vi.fn()} onJoined={vi.fn()} />)
    await user.type(screen.getByLabelText('招待コード'), 'invalid')
    await user.click(screen.getByRole('button', { name: '参加する' }))

    await waitFor(() =>
      expect(screen.getByText('招待コードが見つかりません')).toBeInTheDocument(),
    )
  })

  it('「キャンセル」ボタンで onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<JoinGroupModal onClose={onClose} onJoined={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './JoinGroupModal'`

- [ ] **Step 3: `src/components/groups/JoinGroupModal.tsx` を実装する**

```typescript
import { useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Group } from '../../types'

interface JoinGroupModalProps {
  onClose: () => void
  onJoined: (group: Group) => void
}

export function JoinGroupModal({ onClose, onJoined }: JoinGroupModalProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const group = await api.post<Group>(`/groups/by-code/${code.trim()}/join`, {})
      onJoined(group)
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <dialog
        open
        className="w-96 rounded-xl bg-slate-800 p-6 shadow-2xl"
        aria-label="招待コードで参加"
      >
        <h2 className="mb-4 text-lg font-bold text-slate-100">招待コードで参加</h2>
        <form onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="invite-code">
            招待コード
          </label>
          <input
            id="invite-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="招待コードを入力..."
            aria-label="招待コード"
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              参加する
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 28 tests PASS（既存 24 件 + JoinGroupModal 4 件）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/groups/JoinGroupModal.tsx frontend/src/components/groups/JoinGroupModal.test.tsx
git commit -m "[2026-05-10] 追加: JoinGroupModal（招待コード参加モーダル）を実装

- 招待コード入力 → POST /groups/by-code/{code}/join → onJoined コールバック
- 空欄チェック・API エラー表示・ローディング状態を実装"
```

---

## Task 10: HomePage

**Files:**
- Create: `frontend/src/pages/HomePage.tsx`
- Test: `frontend/src/pages/HomePage.test.tsx`

- [ ] **Step 1: `src/pages/HomePage.test.tsx` を作成する**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('グループ一覧を取得して表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      { id: 'g1', name: '週末ゲーム部', invite_code: 'abc', member_count: 4, is_owner: false },
    ])
    renderHomePage()
    await waitFor(() => expect(screen.getByText('週末ゲーム部')).toBeInTheDocument())
  })

  it('グループがないときメッセージを表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderHomePage()
    await waitFor(() =>
      expect(screen.getByText(/グループがありません/)).toBeInTheDocument(),
    )
  })

  it('「グループを作成」ボタンでモーダルが開く', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderHomePage()
    await user.click(screen.getByRole('button', { name: 'グループを作成' }))
    expect(screen.getByText('グループを作成', { selector: 'h2' })).toBeInTheDocument()
  })

  it('「招待コードで参加」ボタンでモーダルが開く', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderHomePage()
    await user.click(screen.getByRole('button', { name: '招待コードで参加' }))
    expect(screen.getByText('招待コードで参加', { selector: 'h2' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './HomePage'`

- [ ] **Step 3: `src/pages/HomePage.tsx` を実装する**

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Group } from '../types'
import { GroupCard } from '../components/groups/GroupCard'
import { CreateGroupModal } from '../components/groups/CreateGroupModal'
import { JoinGroupModal } from '../components/groups/JoinGroupModal'

export function HomePage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get<Group[]>('/groups').then(setGroups)
  }, [])

  function handleGroupClick(group: Group) {
    navigate(`/groups/${group.id}`, { state: group })
  }

  function handleCreated(group: Group) {
    setGroups((prev) => [...prev, group])
    setShowCreate(false)
  }

  function handleJoined(group: Group) {
    setGroups((prev) => [...prev, group])
    setShowJoin(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">グループ一覧</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoin(true)}
            className="rounded-lg border border-violet-600 px-4 py-2 text-sm text-violet-400 hover:bg-violet-900/30"
          >
            招待コードで参加
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            グループを作成
          </button>
        </div>
      </div>
      {groups.length === 0 ? (
        <p className="text-slate-400">グループがありません。作成または参加してください。</p>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} onClick={handleGroupClick} />
          ))}
        </div>
      )}
      {showCreate && (
        <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {showJoin && (
        <JoinGroupModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 32 tests PASS（既存 28 件 + HomePage 4 件）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/pages/HomePage.tsx frontend/src/pages/HomePage.test.tsx
git commit -m "[2026-05-10] 追加: HomePage（グループ一覧ページ）を実装

- GET /groups でグループ一覧を取得して GroupCard を一覧表示
- グループを作成・招待コードで参加のモーダルを制御
- グループカードクリックで GroupDetailPage へ navigate（state 渡し）"
```

---

## Task 11: GroupDetailPage

**Files:**
- Create: `frontend/src/pages/GroupDetailPage.tsx`
- Test: `frontend/src/pages/GroupDetailPage.test.tsx`

- [ ] **Step 1: `src/pages/GroupDetailPage.test.tsx` を作成する**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GroupDetailPage } from './GroupDetailPage'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const ownerGroup = {
  id: 'g1',
  name: '週末ゲーム部',
  invite_code: 'abc123',
  member_count: 2,
  is_owner: true,
}

const members = [
  { user_id: 'u1', username: 'Alice', avatar_url: null, is_owner: true },
  { user_id: 'u2', username: 'Bob', avatar_url: null, is_owner: false },
]

function renderWithState(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/groups/g1', state }]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GroupDetailPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'Alice', avatar_url: null },
      setUser: vi.fn(),
      loading: false,
    })
    vi.mocked(api.get).mockReset()
    vi.mocked(api.del).mockReset()
  })

  it('グループ名と招待コードを表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(members)
    renderWithState(ownerGroup)
    expect(screen.getByText('週末ゲーム部')).toBeInTheDocument()
    expect(screen.getByText('abc123')).toBeInTheDocument()
  })

  it('GET /groups/:groupId/members でメンバー一覧を取得して表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(members)
    renderWithState(ownerGroup)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('is_owner=true のときグループ削除ボタンを表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderWithState(ownerGroup)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'グループを削除' })).toBeInTheDocument(),
    )
  })

  it('is_owner=false のときグループ削除ボタンを表示しない', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderWithState({ ...ownerGroup, is_owner: false })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'グループを削除' })).not.toBeInTheDocument())
  })

  it('追い出しボタンクリックで DELETE /groups/:groupId/members/:userId を呼ぶ', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValueOnce(members)
    vi.mocked(api.del).mockResolvedValueOnce(undefined)
    renderWithState(ownerGroup)

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '追い出し' }))

    expect(vi.mocked(api.del)).toHaveBeenCalledWith('/groups/g1/members/u2')
    await waitFor(() => expect(screen.queryByText('Bob')).not.toBeInTheDocument())
  })

  it('state が null のときエラーメッセージを表示する', () => {
    renderWithState(null)
    expect(screen.getByText('グループ情報がありません。')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npm test
```

Expected: FAIL — `Cannot find module './GroupDetailPage'`

- [ ] **Step 3: `src/pages/GroupDetailPage.tsx` を実装する**

```typescript
import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Group, Member } from '../types'
import { MemberList } from '../components/members/MemberList'
import { useAuth } from '../hooks/useAuth'

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const group = location.state as Group | null

  const [members, setMembers] = useState<Member[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!groupId) return
    api.get<Member[]>(`/groups/${groupId}/members`).then(setMembers)
  }, [groupId])

  async function handleCopyCode() {
    if (!group) return
    await navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleKick(userId: string) {
    if (!groupId) return
    await api.del(`/groups/${groupId}/members/${userId}`)
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
  }

  async function handleDeleteGroup() {
    if (!groupId) return
    if (!confirm('グループを削除しますか？この操作は取り消せません。')) return
    await api.del(`/groups/${groupId}`)
    navigate('/home')
  }

  if (!group) {
    return <div className="text-slate-400">グループ情報がありません。</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">{group.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-slate-400">招待コード:</span>
          <button
            onClick={handleCopyCode}
            className="rounded bg-slate-700 px-2 py-1 font-mono text-sm text-violet-400 hover:bg-slate-600"
          >
            {group.invite_code}
          </button>
          {copied && <span className="text-xs text-slate-400">コピーしました！</span>}
        </div>
        <p className="mt-1 text-sm text-slate-400">{group.member_count} 人のメンバー</p>
      </div>

      <div className="mb-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-200">メンバー</h2>
        <MemberList
          members={members}
          isOwner={group.is_owner}
          currentUserId={user?.id ?? ''}
          onKick={handleKick}
        />
      </div>

      {group.is_owner && (
        <div className="mt-8">
          <button
            onClick={handleDeleteGroup}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            グループを削除
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd frontend && npm test
```

Expected: 38 tests PASS（既存 32 件 + GroupDetailPage 6 件）

- [ ] **Step 5: 変更ログを記録してコミット**

`docs/changelog/2026-05-10.md` に以下のエントリを追記する（ファイルが存在する場合は末尾に追記、なければ新規作成）：

```markdown
## HH:MM - フロントエンド Phase 1 実装完了

**種別**: 追加
**対象ファイル**: `frontend/` 配下全ファイル

### 変更内容
- Vite + React 18 + TypeScript + Tailwind CSS v3 のプロジェクトセットアップ
- Vitest + @testing-library/react のテスト環境を構築
- 型定義（types/index.ts）・API クライアント（api/client.ts）を実装
- 認証コンテキスト（AuthContext, useAuth）を実装
- レイアウト（AppShell, Sidebar）を実装
- ページ（LoginPage, HomePage, GroupDetailPage）を実装
- コンポーネント（GroupCard, MemberList, CreateGroupModal, JoinGroupModal）を実装

### 理由
フロントエンド Phase 1（認証 + グループ管理 UI）の TDD 実装
```

```bash
git add frontend/src/pages/GroupDetailPage.tsx frontend/src/pages/GroupDetailPage.test.tsx docs/changelog/2026-05-10.md
git commit -m "[2026-05-10] 追加: GroupDetailPage（グループ詳細ページ）を実装・Phase 1 完了

- GET /groups/:groupId/members でメンバー一覧を取得して表示
- グループ名・招待コード（クリックでコピー）・メンバー数を表示
- オーナーのみ：追い出し（DELETE）・グループ削除（DELETE）ボタン
- グループ情報は HomePage からの navigate state で受け取る"
```

---

## 完了確認チェックリスト

全タスク完了後、以下を確認する：

```bash
cd frontend && npm test
```

Expected: **38 tests PASS, 0 failed**

```bash
cd frontend && npm run build
```

Expected: `dist/` が生成される（TypeScript エラーなし）

```bash
# バックエンドが起動している状態で
cd frontend && npm run dev
# ブラウザで http://localhost:5173 を開き、/login にリダイレクトされることを確認
```
