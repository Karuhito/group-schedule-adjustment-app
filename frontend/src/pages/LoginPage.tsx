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
