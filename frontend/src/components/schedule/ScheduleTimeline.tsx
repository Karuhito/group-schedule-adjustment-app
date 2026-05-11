import type { MemberSchedule } from '../../types'

// 時間区間を表すインターフェース
interface TimeInterval {
  start: Date
  end: Date
}

// 日付ごとのグループデータ
interface DateGroup {
  dateKey: string
  label: string
  minTime: number
  maxTime: number
  memberSlots: { member: MemberSchedule; slots: TimeInterval[] }[]
  overlap: TimeInterval[]
}

// ビットマップ方式で全メンバーの重複区間を計算する
export function computeOverlap(
  memberSlotArrays: TimeInterval[][],
  minTime: number,
  maxTime: number,
): TimeInterval[] {
  // スロットを持つメンバーのみを対象にする
  const nonEmpty = memberSlotArrays.filter((slots) => slots.length > 0)
  // 2人以上いないと重複は発生しない
  if (nonEmpty.length < 2) return []

  const totalMinutes = Math.ceil((maxTime - minTime) / 60000)
  if (totalMinutes <= 0) return []

  // 各メンバーの空き時間をビットマップに変換する
  const bitmaps = nonEmpty.map((slots) => {
    const bitmap = new Array(totalMinutes).fill(false)
    for (const slot of slots) {
      const start = Math.floor((slot.start.getTime() - minTime) / 60000)
      const end = Math.min(
        Math.ceil((slot.end.getTime() - minTime) / 60000),
        totalMinutes,
      )
      for (let i = start; i < end; i++) bitmap[i] = true
    }
    return bitmap
  })

  // 全メンバーがtrueの分を重複とする
  const combined = Array.from({ length: totalMinutes }, (_, i) =>
    bitmaps.every((b) => b[i]),
  )

  // 連続するtrueの区間を重複区間としてまとめる
  const result: TimeInterval[] = []
  let runStart: number | null = null
  for (let i = 0; i <= totalMinutes; i++) {
    if (combined[i] && runStart === null) {
      runStart = i
    } else if (!combined[i] && runStart !== null) {
      result.push({
        start: new Date(minTime + runStart * 60000),
        end: new Date(minTime + i * 60000),
      })
      runStart = null
    }
  }
  return result
}

// スケジュールを日付ごとにグループ化し昇順ソートする
export function buildDateGroups(memberSchedules: MemberSchedule[]): DateGroup[] {
  // 日付キー → (ユーザーID → メンバースロット) のマップを構築する
  const byDate = new Map<
    string,
    Map<string, { member: MemberSchedule; slots: TimeInterval[] }>
  >()

  for (const member of memberSchedules) {
    for (const slot of member.slots) {
      const start = new Date(slot.start_time)
      const end = new Date(slot.end_time)
      // UTCの年月日を使ってグループキーを生成する
      const y = start.getUTCFullYear()
      const m = String(start.getUTCMonth() + 1).padStart(2, '0')
      const d = String(start.getUTCDate()).padStart(2, '0')
      const dateKey = `${y}-${m}-${d}`

      if (!byDate.has(dateKey)) byDate.set(dateKey, new Map())
      const byUser = byDate.get(dateKey)!
      if (!byUser.has(member.user_id)) byUser.set(member.user_id, { member, slots: [] })
      byUser.get(member.user_id)!.slots.push({ start, end })
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, byUser]) => {
      const memberSlots = [...byUser.values()]
      const allSlots = memberSlots.flatMap((m) => m.slots)
      const minTime = Math.min(...allSlots.map((s) => s.start.getTime()))
      const maxTime = Math.max(...allSlots.map((s) => s.end.getTime()))
      // 日付ラベルを日本語形式で生成する（UTCの年月日を使用）
      const [year, month, day] = dateKey.split('-').map(Number)
      const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('ja-JP', {
        timeZone: 'UTC',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
      const overlap = computeOverlap(
        memberSlots.map((m) => m.slots),
        minTime,
        maxTime,
      )
      return { dateKey, label, minTime, maxTime, memberSlots, overlap }
    })
}

// タイムライン上の位置をパーセントで計算する
function toPercent(time: number, minTime: number, maxTime: number): number {
  if (maxTime === minTime) return 0
  return ((time - minTime) / (maxTime - minTime)) * 100
}

// グループメンバー全員のスケジュールをタイムライン表示するコンポーネント
export function ScheduleTimeline({
  memberSchedules,
}: {
  memberSchedules: MemberSchedule[]
}) {
  const groups = buildDateGroups(memberSchedules)

  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-400">まだスケジュールが登録されていません。</p>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.dateKey}>
          <h4 className="mb-3 text-sm font-semibold text-slate-300">{group.label}</h4>
          <div className="space-y-2">
            {group.memberSlots.map(({ member, slots }) => (
              <div key={member.user_id} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-right text-xs text-slate-300">
                  {member.username}
                </span>
                <div className="relative h-4 flex-1 rounded bg-slate-700">
                  {slots.map((slot, i) => (
                    <div
                      key={i}
                      className="absolute h-full rounded bg-violet-600 opacity-90"
                      style={{
                        left: `${toPercent(slot.start.getTime(), group.minTime, group.maxTime)}%`,
                        width: `${
                          toPercent(slot.end.getTime(), group.minTime, group.maxTime) -
                          toPercent(slot.start.getTime(), group.minTime, group.maxTime)
                        }%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* 重複区間がある場合はハイライト表示する */}
            {group.overlap.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-right text-xs font-semibold text-yellow-400">
                  重複
                </span>
                <div className="relative h-3 flex-1 rounded bg-slate-700">
                  {group.overlap.map((interval, i) => (
                    <div
                      key={i}
                      className="absolute h-full rounded bg-yellow-400 opacity-80"
                      style={{
                        left: `${toPercent(interval.start.getTime(), group.minTime, group.maxTime)}%`,
                        width: `${
                          toPercent(interval.end.getTime(), group.minTime, group.maxTime) -
                          toPercent(interval.start.getTime(), group.minTime, group.maxTime)
                        }%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
