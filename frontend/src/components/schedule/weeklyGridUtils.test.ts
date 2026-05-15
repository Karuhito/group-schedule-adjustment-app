import { describe, it, expect } from 'vitest'
import {
  getWeekDates, isPastDate, getTimeSlots,
  keySetToSlots, slotsToKeySet, partitionSlotsByWeek
} from './weeklyGridUtils'
import type { ScheduleSlot } from '../../types'

describe('getWeekDates', () => {
  it('2026-05-14(木)を基準にすると5/14〜5/20の7日分を返す', () => {
    const ref = new Date(2026, 4, 14) // 5月14日 木曜
    const dates = getWeekDates(ref)
    expect(dates).toHaveLength(7)
    expect(dates[0].getDate()).toBe(14) // 基準日
    expect(dates[6].getDate()).toBe(20) // 6日後
  })
  it('日曜日(2026-05-17)を基準にすると5/17〜5/23の7日分を返す', () => {
    const ref = new Date(2026, 4, 17) // 5月17日 日曜
    const dates = getWeekDates(ref)
    expect(dates[0].getDate()).toBe(17)
    expect(dates[6].getDate()).toBe(23)
  })
  it('月跨ぎ: 2026-04-30(木)を基準にすると 4/30〜5/6', () => {
    const ref = new Date(2026, 3, 30)
    const dates = getWeekDates(ref)
    expect(dates[0].getMonth()).toBe(3) // 4月
    expect(dates[0].getDate()).toBe(30)
    expect(dates[6].getMonth()).toBe(4) // 5月
    expect(dates[6].getDate()).toBe(6)
  })
})

describe('isPastDate', () => {
  it('今日より前の日付はtrue', () => {
    const today = new Date(2026, 4, 14) // 5/14
    expect(isPastDate(new Date(2026, 4, 11), today)).toBe(true)
  })
  it('今日はfalse', () => {
    const today = new Date(2026, 4, 14)
    expect(isPastDate(new Date(2026, 4, 14), today)).toBe(false)
  })
  it('明日はfalse', () => {
    const today = new Date(2026, 4, 14)
    expect(isPastDate(new Date(2026, 4, 15), today)).toBe(false)
  })
})

describe('getTimeSlots', () => {
  it('48スロット返す', () => {
    expect(getTimeSlots()).toHaveLength(48)
    expect(getTimeSlots()[0]).toBe('00:00')
    expect(getTimeSlots()[47]).toBe('23:30')
  })
})

describe('keySetToSlots', () => {
  it('連続する3セルを1スロットにマージする', () => {
    const keys = new Set(['2026-05-14 14:00', '2026-05-14 14:30', '2026-05-14 15:00'])
    const slots = keySetToSlots(keys)
    expect(slots).toHaveLength(1)
    // start: 14:00, end: 15:30
    const start = new Date(slots[0].start_time)
    const end = new Date(slots[0].end_time)
    expect(start.getHours()).toBe(14)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(15)
    expect(end.getMinutes()).toBe(30)
  })
  it('非連続な2セルは2スロットを返す', () => {
    const keys = new Set(['2026-05-14 14:00', '2026-05-14 15:00'])
    const slots = keySetToSlots(keys)
    expect(slots).toHaveLength(2)
  })
  it('日跨ぎセルはマージしない（23:30と翌日00:00は別スロット）', () => {
    const keys = new Set(['2026-05-14 23:30', '2026-05-15 00:00'])
    const slots = keySetToSlots(keys)
    expect(slots).toHaveLength(2)
  })
  it('23:00〜23:30のセルはend_timeが当日の23:30+30min=翌日00:00になる', () => {
    const keys = new Set(['2026-05-14 23:00', '2026-05-14 23:30'])
    const slots = keySetToSlots(keys)
    expect(slots).toHaveLength(1)
    const start = new Date(slots[0].start_time)
    const end = new Date(slots[0].end_time)
    // start < end であること（逆転していない）
    expect(start.getTime()).toBeLessThan(end.getTime())
    expect(start.getHours()).toBe(23)
    expect(start.getMinutes()).toBe(0)
  })
})

describe('slotsToKeySet', () => {
  it('14:00〜16:00のスロットから4キーを展開する', () => {
    const slot: ScheduleSlot = {
      start_time: new Date(2026, 4, 14, 14, 0).toISOString(),
      end_time: new Date(2026, 4, 14, 16, 0).toISOString(),
    }
    const keys = slotsToKeySet([slot])
    expect(keys.size).toBe(4)
    expect(keys.has('2026-05-14 14:00')).toBe(true)
    expect(keys.has('2026-05-14 15:30')).toBe(true)
    expect(keys.has('2026-05-14 16:00')).toBe(false)
  })
  it('半端スロット（14:15〜15:45）は丸めてキーを展開する', () => {
    const slot: ScheduleSlot = {
      start_time: new Date(2026, 4, 14, 14, 15).toISOString(),
      end_time: new Date(2026, 4, 14, 15, 45).toISOString(),
    }
    const keys = slotsToKeySet([slot])
    // 開始切り捨て(14:00)〜終了切り上げ(16:00) = 4キー
    expect(keys.has('2026-05-14 14:00')).toBe(true)
    expect(keys.has('2026-05-14 15:30')).toBe(true)
  })
  it('日跨ぎスロット（23:00〜01:00翌日）もキーを生成する', () => {
    const slot: ScheduleSlot = {
      start_time: new Date(2026, 4, 14, 23, 0).toISOString(),
      end_time: new Date(2026, 4, 15, 1, 0).toISOString(),
    }
    const keys = slotsToKeySet([slot])
    expect(keys.size).toBeGreaterThan(0)
    expect(keys.has('2026-05-14 23:00')).toBe(true)
    expect(keys.has('2026-05-14 23:30')).toBe(true)
    expect(keys.has('2026-05-15 00:00')).toBe(true)
    expect(keys.has('2026-05-15 00:30')).toBe(true)
  })
  it('往復同一性: 30分整列スロットのみ保証', () => {
    const slot: ScheduleSlot = {
      start_time: new Date(2026, 4, 14, 14, 0).toISOString(),
      end_time: new Date(2026, 4, 14, 16, 0).toISOString(),
    }
    const keys = slotsToKeySet([slot])
    const result = keySetToSlots(keys)
    expect(result).toHaveLength(1)
    expect(new Date(result[0].start_time).getHours()).toBe(14)
    expect(new Date(result[0].end_time).getHours()).toBe(16)
  })
})

describe('partitionSlotsByWeek', () => {
  it('当週スロットと当週外スロットを分類する', () => {
    const weekDates = getWeekDates(new Date(2026, 4, 14)) // 5/11〜5/17
    const inSlot: ScheduleSlot = {
      start_time: new Date(2026, 4, 14, 10, 0).toISOString(),
      end_time: new Date(2026, 4, 14, 11, 0).toISOString(),
    }
    const outSlot: ScheduleSlot = {
      start_time: new Date(2026, 5, 1, 10, 0).toISOString(), // 6/1 翌月
      end_time: new Date(2026, 5, 1, 11, 0).toISOString(),
    }
    const { inWeek, outOfWeek } = partitionSlotsByWeek([inSlot, outSlot], weekDates)
    expect(inWeek).toHaveLength(1)
    expect(outOfWeek).toHaveLength(1)
  })
})
