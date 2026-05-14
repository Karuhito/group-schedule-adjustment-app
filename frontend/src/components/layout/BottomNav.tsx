import { Link, useLocation } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

export function BottomNav() {
  const { user, setUser } = useAuth()
  const location = useLocation()

  async function handleLogout() {
    await api.post('/auth/logout', {})
    setUser(null)
    window.location.href = '/login'
  }

  const initial = user?.username.charAt(0).toUpperCase() ?? ''

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex items-stretch border-t border-slate-700 bg-slate-800 md:hidden">
      <Link
        to="/home"
        className={`flex flex-1 flex-col items-center justify-center py-3 text-xs ${
          location.pathname === '/home' ? 'text-violet-400' : 'text-slate-400'
        }`}
      >
        <span className="text-lg leading-none">🏠</span>
        <span className="mt-1">グループ一覧</span>
      </Link>
      <div className="flex flex-1 flex-col items-center justify-center py-3">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.username} className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            {initial}
          </div>
        )}
        <span className="mt-1 max-w-[80px] truncate text-xs text-slate-400">{user?.username}</span>
      </div>
      <button
        onClick={handleLogout}
        className="flex flex-1 flex-col items-center justify-center py-3 text-xs text-slate-400 hover:text-slate-200"
      >
        <span className="text-lg leading-none">🚪</span>
        <span className="mt-1">ログアウト</span>
      </button>
    </nav>
  )
}
