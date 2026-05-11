import { useState } from 'react'
import type { ScheduleSlot } from '../../types'

interface Props {
  mySlots: ScheduleSlot[]
  onAdd: (slot: ScheduleSlot) => void
  onRemove: (index: number) => void
  onSave: () => void
  saving: boolean
}

function formatSlot(slot: ScheduleSlot): string {
  const start = new Date(slot.start_time)
  const end = new Date(slot.end_time)
  const datePart = start.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
  const startPart = start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  const endPart = end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${startPart}〜${endPart}`
}

export function SlotForm({ mySlots, onAdd, onRemove, onSave, saving }: Props) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const isAddDisabled = !date || !startTime || !endTime || startTime >= endTime

  function handleAdd() {
    if (isAddDisabled) return
    onAdd({
      start_time: new Date(`${date}T${startTime}:00`).toISOString(),
      end_time: new Date(`${date}T${endTime}:00`).toISOString(),
    })
    setStartTime('')
    setEndTime('')
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-300">自分の空き時間</h3>

      {mySlots.length > 0 && (
        <ul className="mb-4 space-y-2">
          {mySlots.map((slot, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded bg-indigo-950 px-3 py-2"
            >
              <span className="text-sm text-violet-300">{formatSlot(slot)}</span>
              <button
                onClick={() => onRemove(i)}
                aria-label="削除"
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded border border-dashed border-indigo-800 p-4">
        <p className="mb-3 text-xs text-slate-400">＋ スロットを追加</p>
        <div className="mb-2">
          <label htmlFor="slot-date" className="sr-only">
            日付
          </label>
          <input
            id="slot-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="slot-start" className="sr-only">
            開始時刻
          </label>
          <input
            id="slot-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <span className="text-slate-400">〜</span>
          <label htmlFor="slot-end" className="sr-only">
            終了時刻
          </label>
          <input
            id="slot-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={isAddDisabled}
          className="w-full rounded bg-violet-700 py-2 text-sm font-semibold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          追加
        </button>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="mt-4 w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存する'}
      </button>
    </div>
  )
}
