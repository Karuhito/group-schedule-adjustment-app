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
