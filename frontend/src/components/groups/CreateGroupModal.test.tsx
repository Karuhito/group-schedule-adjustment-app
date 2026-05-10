import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateGroupModal } from './CreateGroupModal'
import { api } from '../../api/client'

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

describe('CreateGroupModal', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('グループ名を入力して送信すると POST /groups が呼ばれる', async () => {
    const user = userEvent.setup()
    const newGroup = {
      id: 'g1',
      name: '新グループ',
      invite_code: 'abc',
      member_count: 1,
      is_owner: true,
    }
    vi.mocked(api.post).mockResolvedValueOnce(newGroup)
    const onCreated = vi.fn()

    render(<CreateGroupModal onClose={vi.fn()} onCreated={onCreated} />)
    await user.type(screen.getByLabelText('グループ名'), '新グループ')
    await user.click(screen.getByRole('button', { name: '作成する' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(newGroup))
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/groups', { name: '新グループ' })
  })

  it('空のグループ名では送信しない', async () => {
    const user = userEvent.setup()
    render(<CreateGroupModal onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '作成する' }))
    expect(vi.mocked(api.post)).not.toHaveBeenCalled()
  })

  it('API エラー時にエラーメッセージを表示する', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockRejectedValueOnce(new Error('サーバーエラー'))

    render(<CreateGroupModal onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.type(screen.getByLabelText('グループ名'), 'テスト')
    await user.click(screen.getByRole('button', { name: '作成する' }))

    await waitFor(() => expect(screen.getByText('サーバーエラー')).toBeInTheDocument())
  })

  it('「キャンセル」ボタンで onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CreateGroupModal onClose={onClose} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onClose).toHaveBeenCalled()
  })
})
