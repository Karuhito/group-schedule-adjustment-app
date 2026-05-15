import type { ScheduleSlot } from '../../types'

// 月曜起点の7日分のDateを返す（ローカル時刻）
export function getWeekDates(reference: Date): Date[] {
  const day = reference.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + offset)
  return Array.from({ length: 7 }, (_, i) => {
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
  })
}

// 今日より前の日付ならtrue（今日はfalse）
export function isPastDate(date: Date, today: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return d < t
}

// 30分刻み48スロットの時刻文字列
export function getTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

// "YYYY-MM-DD HH:mm" のキー集合 → 連続セルをマージした ScheduleSlot[]
export function keySetToSlots(keys: Set<string>): ScheduleSlot[] {
  // 日付ごとにグルーピング
  const byDate = new Map<string, string[]>()
  for (const key of keys) {
    const [date, time] = key.split(' ')
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(time)
  }

  const slots: ScheduleSlot[] = []
  for (const [date, times] of byDate) {
    times.sort()
    const [year, month, day] = date.split('-').map(Number)
    let rangeStart = times[0]
    let prevEnd = addMinutes(times[0], 30)

    for (let i = 1; i < times.length; i++) {
      if (times[i] === prevEnd) {
        prevEnd = addMinutes(times[i], 30)
      } else {
        slots.push(makeSlot(year, month, day, rangeStart, prevEnd))
        rangeStart = times[i]
        prevEnd = addMinutes(times[i], 30)
      }
    }
    slots.push(makeSlot(year, month, day, rangeStart, prevEnd))
  }
  return slots
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

function makeSlot(year: number, month: number, day: number, startTime: string, endTime: string): ScheduleSlot {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return {
    start_time: new Date(year, month - 1, day, sh, sm).toISOString(),
    end_time: new Date(year, month - 1, day, eh, em).toISOString(),
  }
}

// ScheduleSlot[] → "YYYY-MM-DD HH:mm" のキー集合（30分単位に丸め）
export function slotsToKeySet(slots: ScheduleSlot[]): Set<string> {
  const keys = new Set<string>()
  for (const slot of slots) {
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    // 開始を30分単位に切り捨て
    const startMinutes = Math.floor((start.getHours() * 60 + start.getMinutes()) / 30) * 30
    // 終了を30分単位に切り上げ
    const endMinutes = Math.ceil((end.getHours() * 60 + end.getMinutes()) / 30) * 30

    const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    for (let m = startMinutes; m < endMinutes; m += 30) {
      const h = Math.floor(m / 60)
      const min = m % 60
      keys.add(`${dateStr} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    }
  }
  return keys
}

// スロットを当週内と当週外に分類する
export function partitionSlotsByWeek(
  slots: ScheduleSlot[],
  weekDates: Date[],
): { inWeek: ScheduleSlot[]; outOfWeek: ScheduleSlot[] } {
  const weekStart = new Date(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate())
  const weekEnd = new Date(weekDates[6].getFullYear(), weekDates[6].getMonth(), weekDates[6].getDate() + 1)

  const inWeek: ScheduleSlot[] = []
  const outOfWeek: ScheduleSlot[] = []
  for (const slot of slots) {
    const start = new Date(slot.start_time)
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    if (startDay >= weekStart && startDay < weekEnd) {
      inWeek.push(slot)
    } else {
      outOfWeek.push(slot)
    }
  }
  return { inWeek, outOfWeek }
}
