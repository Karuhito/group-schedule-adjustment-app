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
