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
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
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
