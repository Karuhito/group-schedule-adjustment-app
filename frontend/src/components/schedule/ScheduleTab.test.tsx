import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScheduleTab } from './ScheduleTab'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import type { ScheduleSlot } from '../../types'

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

  it('「みんなの予定」タブをクリックすると ScheduleTimeline が表示される', async () => {
    const user = userEvent.setup()
    render(<ScheduleTab groupId="g1" />)
    await waitFor(() => screen.getByText('みんなの予定'))
    await user.click(screen.getByText('みんなの予定'))
    // 保存ボタンが消える（editタブが非表示）
    expect(screen.queryByRole('button', { name: '保存する' })).not.toBeInTheDocument()
  })

  it('セルをトグルして保存するとexternalSlotsとマージしてPUTする', async () => {
    // mockSchedules に当週外スロットを含める
    const today = new Date()
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const mockWithExternal = [
      {
        user_id: 'u1',
        username: 'Alice',
        avatar_url: null,
        slots: [
          {
            start_time: nextMonthDate.toISOString(),
            end_time: new Date(nextMonthDate.getTime() + 3600000).toISOString(),
          }, // 来月（当週外）
        ],
      },
    ]
    vi.mocked(api.get).mockResolvedValue(mockWithExternal)
    const user = userEvent.setup()
    render(<ScheduleTab groupId="g1" />)
    await waitFor(() => screen.getByText('自分の予定を入力'))
    // 保存
    await user.click(screen.getByRole('button', { name: '保存する' }))
    await waitFor(() => {
      expect(vi.mocked(api.put)).toHaveBeenCalled()
      const [, body] = vi.mocked(api.put).mock.calls[0] as [string, { slots: ScheduleSlot[] }]
      // 当週外スロット（来月）がマージされている
      expect(body.slots.some((s) => {
        const d = new Date(s.start_time)
        return d.getMonth() === nextMonthDate.getMonth()
      })).toBe(true)
    })
  })
})
