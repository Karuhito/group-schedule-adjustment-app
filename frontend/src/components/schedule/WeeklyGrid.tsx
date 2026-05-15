import { useMemo } from 'react'
import { getTimeSlots, isPastDate } from './weeklyGridUtils'

interface WeeklyGridProps {
  weekDates: Date[]
  selectedKeys: Set<string>
  onToggle: (key: string) => void
  today: Date
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
const TIME_SLOTS = getTimeSlots()

export function WeeklyGrid({ weekDates, selectedKeys, onToggle, today }: WeeklyGridProps) {
  // 週の日付文字列リスト（"YYYY-MM-DD"）をメモ化
  const dateStrings = useMemo(() =>
    weekDates.map((d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }),
    [weekDates]
  )

  const todayDateStr = useMemo(() => {
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [today])

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse" style={{ minWidth: `${7 * 44 + 48}px` }}>
        <thead className="sticky top-0 z-20 bg-slate-900">
          <tr>
            <th scope="col" className="sticky left-0 z-30 w-12 bg-slate-900" />
            {weekDates.map((date, i) => {
              const isToday = dateStrings[i] === todayDateStr
              return (
                <th
                  scope="col"
                  key={dateStrings[i]}
                  className={`min-w-[40px] px-1 py-2 text-center text-xs font-medium ${
                    isToday ? 'text-violet-400' : 'text-slate-400'
                  }`}
                >
                  <div className={isToday ? 'font-bold' : ''}>{DAY_NAMES[date.getDay()]}</div>
                  <div>{`${date.getMonth() + 1}/${date.getDate()}`}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((time) => {
            const showLabel = time.endsWith(':00')
            return (
              <tr key={time}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-12 bg-slate-900 pr-1 text-right text-xs text-slate-500"
                >
                  {showLabel ? time : ''}
                </th>
                {weekDates.map((date, i) => {
                  const past = isPastDate(date, today)
                  const cellKey = `${dateStrings[i]} ${time}`
                  const selected = selectedKeys.has(cellKey)
                  const monthNum = date.getMonth() + 1
                  const dayNum = date.getDate()
                  return (
                    <td key={cellKey} className="p-px">
                      <button
                        aria-label={`${monthNum}月${dayNum}日 ${time}`}
                        aria-pressed={selected}
                        disabled={past}
                        onClick={() => onToggle(cellKey)}
                        className={`h-8 w-full min-w-[40px] border border-slate-800 ${
                          past
                            ? 'cursor-not-allowed bg-slate-900 opacity-40'
                            : selected
                              ? 'bg-violet-600 hover:bg-violet-500'
                              : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
