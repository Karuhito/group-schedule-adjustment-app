import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JoinGroupModal } from './JoinGroupModal'
import { api } from '../../api/client'

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

describe('JoinGroupModal', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('招待コードを入力して参加すると POST /groups/by-code/{code}/join が呼ばれる', async () => {
    const user = userEvent.setup()
    const joinedGroup = {
      id: 'g1',
      name: '週末ゲーム部',
      invite_code: 'abc123',
      member_count: 5,
      is_owner: false,
    }
    vi.mocked(api.post).mockResolvedValueOnce(joinedGroup)
    const onJoined = vi.fn()

    render(<JoinGroupModal onClose={vi.fn()} onJoined={onJoined} />)
    await user.type(screen.getByLabelText('招待コード'), 'abc123')
    await user.click(screen.getByRole('button', { name: '参加する' }))

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(joinedGroup))
    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/groups/by-code/abc123/join',
      {},
    )
  })

  it('空の招待コードでは送信しない', async () => {
    const user = userEvent.setup()
    render(<JoinGroupModal onClose={vi.fn()} onJoined={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '参加する' }))
    expect(vi.mocked(api.post)).not.toHaveBeenCalled()
  })

  it('API エラー時にエラーメッセージを表示する', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockRejectedValueOnce(new Error('招待コードが見つかりません'))

    render(<JoinGroupModal onClose={vi.fn()} onJoined={vi.fn()} />)
    await user.type(screen.getByLabelText('招待コード'), 'invalid')
    await user.click(screen.getByRole('button', { name: '参加する' }))

    await waitFor(() =>
      expect(screen.getByText('招待コードが見つかりません')).toBeInTheDocument(),
    )
  })

  it('「キャンセル」ボタンで onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<JoinGroupModal onClose={onClose} onJoined={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onClose).toHaveBeenCalled()
  })
})
