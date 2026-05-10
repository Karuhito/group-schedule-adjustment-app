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
