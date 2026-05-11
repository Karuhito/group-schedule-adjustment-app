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
