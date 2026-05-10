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
  const [error, setError] = useState('')

  useEffect(() => {
    if (!groupId || !group) return
    api.get<Member[]>(`/groups/${groupId}/members`).then(setMembers)
  }, [groupId, group])

  async function handleCopyCode() {
    if (!group) return
    await navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleKick(userId: string) {
    if (!groupId) return
    try {
      await api.del(`/groups/${groupId}/members/${userId}`)
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバーの追い出しに失敗しました')
    }
  }

  async function handleDeleteGroup() {
    if (!groupId) return
    if (!confirm('グループを削除しますか？この操作は取り消せません。')) return
    try {
      await api.del(`/groups/${groupId}`)
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'グループの削除に失敗しました')
    }
  }

  if (!group) {
    return <div className="text-slate-400">グループ情報がありません。</div>
  }

  return (
    <div>
      {error && <p className="text-red-400 mb-4">{error}</p>}
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
