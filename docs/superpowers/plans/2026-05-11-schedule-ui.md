# Schedule UI 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** グループ詳細ページにスケジュールタブを追加し、自分の空き時間の登録とグループ全員のタイムライン表示を実装する。

**Architecture:** GroupDetailPage にタブUIを追加し、スケジュールタブ内では ScheduleTab（API通信コンテナ）→ SlotForm（入力）+ ScheduleTimeline（可視化）の3層構成で実装する。既存の `api.get` / `api.put` と `useAuth` を再利用する。

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, React Testing Library

---

## ファイルマップ

| 操作 | パス | 内容 |
|------|------|------|
| 追加 | `frontend/src/types/index.ts` | `ScheduleSlot`, `MemberSchedule` 型 |
| 作成 | `frontend/src/components/schedule/SlotForm.tsx` | 空き時間入力フォーム |
| 作成 | `frontend/src/components/schedule/SlotForm.test.tsx` | SlotForm テスト |
| 作成 | `frontend/src/components/schedule/ScheduleTimeline.tsx` | タイムライン表示＋ユーティリティ関数 |
| 作成 | `frontend/src/components/schedule/ScheduleTimeline.test.tsx` | ScheduleTimeline テスト |
| 作成 | `frontend/src/components/schedule/ScheduleTab.tsx` | API通信コンテナ |
| 作成 | `frontend/src/components/schedule/ScheduleTab.test.tsx` | ScheduleTab テスト |
| 修正 | `frontend/src/pages/GroupDetailPage.tsx` | タブUI追加 |
| 修正 | `frontend/src/pages/GroupDetailPage.test.tsx` | タブ関連テスト追加 |

---

## Task 1: 型定義を追加する

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: 型を追加する**

`frontend/src/types/index.ts` の末尾に追加する：

```typescript
export interface ScheduleSlot {
  start_time: string // ISO 8601 with timezone
  end_time: string
}

export interface MemberSchedule {
  user_id: string
  username: string
  avatar_url: string | null
  slots: ScheduleSlot[]
}
```

- [ ] **Step 2: コミット**

```bash
git add frontend/src/types/index.ts
git commit -m "[2026-05-11] 追加: ScheduleSlot, MemberSchedule 型を定義"
```

---

## Task 2: SlotForm コンポーネントを実装する

**Files:**
- Create: `frontend/src/components/schedule/SlotForm.test.tsx`
- Create: `frontend/src/components/schedule/SlotForm.tsx`

- [ ] **Step 1: テストファイルを作成する**

`frontend/src/components/schedule/SlotForm.test.tsx` を作成：

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SlotForm } from './SlotForm'
import type { ScheduleSlot } from '../../types'

const dummySlot: ScheduleSlot = {
  start_time: '2026-06-01T01:00:00.000Z',
  end_time: '2026-06-01T09:00:00.000Z',
}

function renderSlotForm(overrides: {
  mySlots?: ScheduleSlot[]
  onAdd?: ReturnType<typeof vi.fn>
  onRemove?: ReturnType<typeof vi.fn>
  onSave?: ReturnType<typeof vi.fn>
  saving?: boolean
} = {}) {
  const props = {
    mySlots: [] as ScheduleSlot[],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onSave: vi.fn(),
    saving: false,
    ...overrides,
  }
  render(<SlotForm {...props} />)
  return props
}

describe('SlotForm', () => {
  it('登録済みスロットに削除ボタンが表示される', () => {
    renderSlotForm({ mySlots: [dummySlot] })
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument()
  })

  it('✕ ボタンクリックで onRemove が index を引数に呼ばれる', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    renderSlotForm({ mySlots: [dummySlot], onRemove })
    await user.click(screen.getByRole('button', { name: '削除' }))
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('開始時刻 >= 終了時刻のとき「追加」ボタンが無効', () => {
    renderSlotForm()
    fireEvent.change(screen.getByLabelText('日付'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('開始時刻'), { target: { value: '14:00' } })
    fireEvent.change(screen.getByLabelText('終了時刻'), { target: { value: '10:00' } })
    expect(screen.getByRole('button', { name: '追加' })).toBeDisabled()
  })

  it('日付・開始・終了が正しいとき「追加」クリックで onAdd が呼ばれる', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    renderSlotForm({ onAdd })
    fireEvent.change(screen.getByLabelText('日付'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('開始時刻'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('終了時刻'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: expect.stringContaining('2026-06-01'),
        end_time: expect.stringContaining('2026-06-01'),
      }),
    )
  })

  it('「保存する」ボタンクリックで onSave が呼ばれる', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderSlotForm({ onSave })
    await user.click(screen.getByRole('button', { name: '保存する' }))
    expect(onSave).toHaveBeenCalled()
  })

  it('saving=true のとき「保存中...」ボタンが表示される', () => {
    renderSlotForm({ saving: true })
    expect(screen.getByRole('button', { name: '保存中...' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npx vitest run src/components/schedule/SlotForm.test.tsx --reporter verbose
```

Expected: FAIL（`SlotForm` が存在しないため）

- [ ] **Step 3: SlotForm を実装する**

`frontend/src/components/schedule/SlotForm.tsx` を作成：

```tsx
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
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd frontend && npx vitest run src/components/schedule/SlotForm.test.tsx --reporter verbose
```

Expected: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/schedule/SlotForm.tsx frontend/src/components/schedule/SlotForm.test.tsx
git commit -m "[2026-05-11] 追加: SlotForm コンポーネントを TDD で実装"
```

---

## Task 3: ScheduleTimeline コンポーネントを実装する

**Files:**
- Create: `frontend/src/components/schedule/ScheduleTimeline.test.tsx`
- Create: `frontend/src/components/schedule/ScheduleTimeline.tsx`

- [ ] **Step 1: テストファイルを作成する**

`frontend/src/components/schedule/ScheduleTimeline.test.tsx` を作成：

```tsx
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
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npx vitest run src/components/schedule/ScheduleTimeline.test.tsx --reporter verbose
```

Expected: FAIL（`ScheduleTimeline` が存在しないため）

- [ ] **Step 3: ScheduleTimeline を実装する**

`frontend/src/components/schedule/ScheduleTimeline.tsx` を作成：

```tsx
import type { MemberSchedule } from '../../types'

interface TimeInterval {
  start: Date
  end: Date
}

interface DateGroup {
  dateKey: string
  label: string
  minTime: number
  maxTime: number
  memberSlots: { member: MemberSchedule; slots: TimeInterval[] }[]
  overlap: TimeInterval[]
}

export function computeOverlap(
  memberSlotArrays: TimeInterval[][],
  minTime: number,
  maxTime: number,
): TimeInterval[] {
  const nonEmpty = memberSlotArrays.filter((slots) => slots.length > 0)
  if (nonEmpty.length < 2) return []

  const totalMinutes = Math.ceil((maxTime - minTime) / 60000)
  if (totalMinutes <= 0) return []

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

  const combined = Array.from({ length: totalMinutes }, (_, i) =>
    bitmaps.every((b) => b[i]),
  )

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

export function buildDateGroups(memberSchedules: MemberSchedule[]): DateGroup[] {
  const byDate = new Map<
    string,
    Map<string, { member: MemberSchedule; slots: TimeInterval[] }>
  >()

  for (const member of memberSchedules) {
    for (const slot of member.slots) {
      const start = new Date(slot.start_time)
      const end = new Date(slot.end_time)
      const y = start.getFullYear()
      const m = String(start.getMonth() + 1).padStart(2, '0')
      const d = String(start.getDate()).padStart(2, '0')
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
      const [year, month, day] = dateKey.split('-').map(Number)
      const label = new Date(year, month - 1, day).toLocaleDateString('ja-JP', {
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

function toPercent(time: number, minTime: number, maxTime: number): number {
  if (maxTime === minTime) return 0
  return ((time - minTime) / (maxTime - minTime)) * 100
}

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
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd frontend && npx vitest run src/components/schedule/ScheduleTimeline.test.tsx --reporter verbose
```

Expected: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/schedule/ScheduleTimeline.tsx frontend/src/components/schedule/ScheduleTimeline.test.tsx
git commit -m "[2026-05-11] 追加: ScheduleTimeline コンポーネントを TDD で実装"
```

---

## Task 4: ScheduleTab コンテナを実装する

**Files:**
- Create: `frontend/src/components/schedule/ScheduleTab.test.tsx`
- Create: `frontend/src/components/schedule/ScheduleTab.tsx`

- [ ] **Step 1: テストファイルを作成する**

`frontend/src/components/schedule/ScheduleTab.test.tsx` を作成：

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScheduleTab } from './ScheduleTab'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockSchedules = [
  {
    user_id: 'u1',
    username: 'Alice',
    avatar_url: null,
    slots: [
      { start_time: '2026-06-01T01:00:00.000Z', end_time: '2026-06-01T09:00:00.000Z' },
    ],
  },
]

describe('ScheduleTab', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'Alice', avatar_url: null },
      setUser: vi.fn(),
      loading: false,
    })
    vi.mocked(api.get).mockResolvedValue(mockSchedules)
    vi.mocked(api.put).mockResolvedValue(undefined)
  })

  it('マウント時に GET /groups/:id/schedules を呼ぶ', async () => {
    render(<ScheduleTab groupId="g1" />)
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/groups/g1/schedules'),
    )
  })

  it('保存ボタンクリックで PUT を呼び、その後 GET を再実行する', async () => {
    const user = userEvent.setup()
    render(<ScheduleTab groupId="g1" />)
    await waitFor(() => expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        '/groups/g1/schedules',
        expect.objectContaining({ slots: expect.any(Array) }),
      ),
    )
    await waitFor(() => expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2))
  })

  it('GET 失敗時にエラーメッセージを表示する', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))
    render(<ScheduleTab groupId="g1" />)
    await waitFor(() =>
      expect(
        screen.getByText('スケジュールの取得に失敗しました'),
      ).toBeInTheDocument(),
    )
  })

  it('PUT 失敗時にエラーメッセージを表示する', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockRejectedValueOnce(new Error('Save failed'))
    render(<ScheduleTab groupId="g1" />)
    await waitFor(() => expect(vi.mocked(api.get)).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() =>
      expect(
        screen.getByText('スケジュールの保存に失敗しました'),
      ).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npx vitest run src/components/schedule/ScheduleTab.test.tsx --reporter verbose
```

Expected: FAIL（`ScheduleTab` が存在しないため）

- [ ] **Step 3: ScheduleTab を実装する**

`frontend/src/components/schedule/ScheduleTab.tsx` を作成：

```tsx
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import type { MemberSchedule, ScheduleSlot } from '../../types'
import { SlotForm } from './SlotForm'
import { ScheduleTimeline } from './ScheduleTimeline'

interface Props {
  groupId: string
}

export function ScheduleTab({ groupId }: Props) {
  const { user } = useAuth()
  const [memberSchedules, setMemberSchedules] = useState<MemberSchedule[]>([])
  const [mySlots, setMySlots] = useState<ScheduleSlot[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchSchedules = useCallback(async () => {
    const data = await api.get<MemberSchedule[]>(`/groups/${groupId}/schedules`)
    setMemberSchedules(data)
    const mine = data.find((m) => m.user_id === user?.id)
    setMySlots(mine?.slots ?? [])
  }, [groupId, user?.id])

  useEffect(() => {
    fetchSchedules().catch(() => setError('スケジュールの取得に失敗しました'))
  }, [fetchSchedules])

  function handleAdd(slot: ScheduleSlot) {
    setMySlots((prev) => [...prev, slot])
  }

  function handleRemove(index: number) {
    setMySlots((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await api.put(`/groups/${groupId}/schedules`, { slots: mySlots })
      await fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スケジュールの保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <SlotForm
        mySlots={mySlots}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onSave={handleSave}
        saving={saving}
      />
      <hr className="my-6 border-slate-700" />
      <ScheduleTimeline memberSchedules={memberSchedules} />
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd frontend && npx vitest run src/components/schedule/ScheduleTab.test.tsx --reporter verbose
```

Expected: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/schedule/ScheduleTab.tsx frontend/src/components/schedule/ScheduleTab.test.tsx
git commit -m "[2026-05-11] 追加: ScheduleTab コンテナを TDD で実装"
```

---

## Task 5: GroupDetailPage にタブ UI を追加する

**Files:**
- Modify: `frontend/src/pages/GroupDetailPage.tsx`
- Modify: `frontend/src/pages/GroupDetailPage.test.tsx`

- [ ] **Step 1: GroupDetailPage.test.tsx にタブテストを追加する**

`frontend/src/pages/GroupDetailPage.test.tsx` の `describe('GroupDetailPage', ...)` ブロック末尾に以下を追加する：

```tsx
  it('メンバータブとスケジュールタブのボタンが表示される', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(members)
    renderWithState(ownerGroup)
    expect(screen.getByRole('button', { name: 'メンバー' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'スケジュール' })).toBeInTheDocument()
  })

  it('スケジュールタブに切り替えると GET /groups/:id/schedules を呼ぶ', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValueOnce(members)   // members call
    vi.mocked(api.get).mockResolvedValueOnce([])         // schedules call
    vi.mocked(api.put).mockResolvedValue(undefined)
    renderWithState(ownerGroup)
    await user.click(screen.getByRole('button', { name: 'スケジュール' }))
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/groups/g1/schedules'),
    )
  })
```

また、`beforeEach` に `vi.mocked(api.put).mockReset()` を追加する：

```tsx
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'Alice', avatar_url: null },
      setUser: vi.fn(),
      loading: false,
    })
    vi.mocked(api.get).mockReset()
    vi.mocked(api.del).mockReset()
    vi.mocked(api.put).mockReset()  // 追加
  })
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd frontend && npx vitest run src/pages/GroupDetailPage.test.tsx --reporter verbose
```

Expected: 追加した2テストが FAIL（タブボタンが存在しないため）

- [ ] **Step 3: GroupDetailPage.tsx を修正する**

`frontend/src/pages/GroupDetailPage.tsx` 全体を以下に置き換える：

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Group, Member } from '../types'
import { MemberList } from '../components/members/MemberList'
import { ScheduleTab } from '../components/schedule/ScheduleTab'
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
  const [activeTab, setActiveTab] = useState<'members' | 'schedule'>('members')

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

      <div className="mb-6 flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-sm font-semibold ${
            activeTab === 'members'
              ? 'border-b-2 border-violet-500 text-violet-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          メンバー
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-sm font-semibold ${
            activeTab === 'schedule'
              ? 'border-b-2 border-violet-500 text-violet-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          スケジュール
        </button>
      </div>

      {activeTab === 'members' && (
        <>
          <div className="mb-4">
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
        </>
      )}

      {activeTab === 'schedule' && groupId && (
        <ScheduleTab groupId={groupId} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 全テストが通ることを確認する**

```bash
cd frontend && npx vitest run --reporter verbose
```

Expected: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/pages/GroupDetailPage.tsx frontend/src/pages/GroupDetailPage.test.tsx
git commit -m "[2026-05-11] 追加: GroupDetailPage にスケジュールタブを追加"
```

---

## 完了確認

全タスク完了後、以下で全テストが通ることを確認する：

```bash
cd frontend && npx vitest run --reporter verbose
```

Expected: すべての test suite が PASS
