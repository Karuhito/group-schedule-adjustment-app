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
    <aside className="hidden w-56 flex-col bg-slate-800 p-4 md:flex">
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
