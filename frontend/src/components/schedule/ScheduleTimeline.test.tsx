import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScheduleTimeline, computeOverlap, buildDateGroups } from './ScheduleTimeline'
import type { MemberSchedule } from '../../types'

const alice: MemberSchedule = {
  user_id: 'u1',
  username: 'Alice',
  avatar_url: null,
  slots: [
    { start_time: '2026-06-01T01:00:00.000Z', end_time: '2026-06-01T09:00:00.000Z' },
  ],
}
const bob: MemberSchedule = {
  user_id: 'u2',
  username: 'Bob',
  avatar_url: null,
  slots: [
    { start_time: '2026-06-01T05:00:00.000Z', end_time: '2026-06-01T11:00:00.000Z' },
  ],
}

describe('computeOverlap', () => {
  it('重複区間を正しく計算する（A: 10〜18時, B: 14〜20時 → 14〜18時）', () => {
    const minTime = new Date('2026-06-01T10:00:00Z').getTime()
    const maxTime = new Date('2026-06-01T20:00:00Z').getTime()
    const result = computeOverlap(
      [
        [{ start: new Date('2026-06-01T10:00:00Z'), end: new Date('2026-06-01T18:00:00Z') }],
        [{ start: new Date('2026-06-01T14:00:00Z'), end: new Date('2026-06-01T20:00:00Z') }],
      ],
      minTime,
      maxTime,
    )
    expect(result).toHaveLength(1)
    expect(result[0].start.getTime()).toBe(new Date('2026-06-01T14:00:00Z').getTime())
    expect(result[0].end.getTime()).toBe(new Date('2026-06-01T18:00:00Z').getTime())
  })

  it('重複なしのとき空配列を返す', () => {
    const minTime = new Date('2026-06-01T10:00:00Z').getTime()
    const maxTime = new Date('2026-06-01T20:00:00Z').getTime()
    const result = computeOverlap(
      [
        [{ start: new Date('2026-06-01T10:00:00Z'), end: new Date('2026-06-01T12:00:00Z') }],
        [{ start: new Date('2026-06-01T14:00:00Z'), end: new Date('2026-06-01T20:00:00Z') }],
      ],
      minTime,
      maxTime,
    )
    expect(result).toHaveLength(0)
  })

  it('メンバーが1人のとき空配列を返す', () => {
    const minTime = new Date('2026-06-01T10:00:00Z').getTime()
    const maxTime = new Date('2026-06-01T18:00:00Z').getTime()
    const result = computeOverlap(
      [
        [{ start: new Date('2026-06-01T10:00:00Z'), end: new Date('2026-06-01T18:00:00Z') }],
      ],
      minTime,
      maxTime,
    )
    expect(result).toHaveLength(0)
  })

  it('スロットなしのメンバーは重複計算から除外される', () => {
    const minTime = new Date('2026-06-01T10:00:00Z').getTime()
    const maxTime = new Date('2026-06-01T18:00:00Z').getTime()
    const result = computeOverlap(
      [
        [{ start: new Date('2026-06-01T10:00:00Z'), end: new Date('2026-06-01T18:00:00Z') }],
        [],
      ],
      minTime,
      maxTime,
    )
    expect(result).toHaveLength(0)
  })
})

describe('buildDateGroups', () => {
  it('スロットを日付ごとにグループ化する', () => {
    const schedules: MemberSchedule[] = [
      {
        user_id: 'u1',
        username: 'Alice',
        avatar_url: null,
        slots: [
          { start_time: '2026-06-01T01:00:00.000Z', end_time: '2026-06-01T09:00:00.000Z' },
          { start_time: '2026-06-02T01:00:00.000Z', end_time: '2026-06-02T09:00:00.000Z' },
        ],
      },
    ]
    const groups = buildDateGroups(schedules)
    expect(groups).toHaveLength(2)
  })

  it('空のとき空配列を返す', () => {
    expect(buildDateGroups([])).toHaveLength(0)
  })

  it('日付昇順でソートされる', () => {
    const schedules: MemberSchedule[] = [
      {
        user_id: 'u1',
        username: 'Alice',
        avatar_url: null,
        slots: [
          { start_time: '2026-06-03T01:00:00.000Z', end_time: '2026-06-03T09:00:00.000Z' },
          { start_time: '2026-06-01T01:00:00.000Z', end_time: '2026-06-01T09:00:00.000Z' },
        ],
      },
    ]
    const groups = buildDateGroups(schedules)
    expect(groups[0].dateKey < groups[1].dateKey).toBe(true)
  })
})

describe('ScheduleTimeline', () => {
  it('スケジュールがないとき「まだスケジュールが登録されていません。」を表示する', () => {
    render(<ScheduleTimeline memberSchedules={[]} />)
    expect(screen.getByText('まだスケジュールが登録されていません。')).toBeInTheDocument()
  })

  it('メンバー名を表示する', () => {
    render(<ScheduleTimeline memberSchedules={[alice, bob]} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('重複がある場合「重複」ラベルを表示する', () => {
    render(<ScheduleTimeline memberSchedules={[alice, bob]} />)
    expect(screen.getByText('重複')).toBeInTheDocument()
  })
})
