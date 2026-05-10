import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('グループ一覧を取得して表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      { id: 'g1', name: '週末ゲーム部', invite_code: 'abc', member_count: 4, is_owner: false },
    ])
    renderHomePage()
    await waitFor(() => expect(screen.getByText('週末ゲーム部')).toBeInTheDocument())
  })

  it('グループがないときメッセージを表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderHomePage()
    await waitFor(() =>
      expect(screen.getByText(/グループがありません/)).toBeInTheDocument(),
    )
  })

  it('「グループを作成」ボタンでモーダルが開く', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderHomePage()
    await user.click(screen.getByRole('button', { name: 'グループを作成' }))
    expect(screen.getByText('グループを作成', { selector: 'h2' })).toBeInTheDocument()
  })

  it('「招待コードで参加」ボタンでモーダルが開く', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderHomePage()
    await user.click(screen.getByRole('button', { name: '招待コードで参加' }))
    expect(screen.getByText('招待コードで参加', { selector: 'h2' })).toBeInTheDocument()
  })
})
