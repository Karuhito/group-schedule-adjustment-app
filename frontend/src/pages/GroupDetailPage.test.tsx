import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GroupDetailPage } from './GroupDetailPage'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const ownerGroup = {
  id: 'g1',
  name: '週末ゲーム部',
  invite_code: 'abc123',
  member_count: 2,
  is_owner: true,
}

const members = [
  { user_id: 'u1', username: 'Alice', avatar_url: null, is_owner: true },
  { user_id: 'u2', username: 'Bob', avatar_url: null, is_owner: false },
]

function renderWithState(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/groups/g1', state }]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GroupDetailPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'Alice', avatar_url: null },
      setUser: vi.fn(),
      loading: false,
    })
    vi.mocked(api.get).mockReset()
    vi.mocked(api.del).mockReset()
  })

  it('グループ名と招待コードを表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(members)
    renderWithState(ownerGroup)
    expect(screen.getByText('週末ゲーム部')).toBeInTheDocument()
    expect(screen.getByText('abc123')).toBeInTheDocument()
  })

  it('GET /groups/:groupId/members でメンバー一覧を取得して表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(members)
    renderWithState(ownerGroup)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('is_owner=true のときグループ削除ボタンを表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderWithState(ownerGroup)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'グループを削除' })).toBeInTheDocument(),
    )
  })

  it('is_owner=false のときグループ削除ボタンを表示しない', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([])
    renderWithState({ ...ownerGroup, is_owner: false })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'グループを削除' })).not.toBeInTheDocument())
  })

  it('追い出しボタンクリックで DELETE /groups/:groupId/members/:userId を呼ぶ', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValueOnce(members)
    vi.mocked(api.del).mockResolvedValueOnce(undefined)
    renderWithState(ownerGroup)

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '追い出し' }))

    expect(vi.mocked(api.del)).toHaveBeenCalledWith('/groups/g1/members/u2')
    await waitFor(() => expect(screen.queryByText('Bob')).not.toBeInTheDocument())
  })

  it('state が null のときエラーメッセージを表示する', () => {
    renderWithState(null)
    expect(screen.getByText('グループ情報がありません。')).toBeInTheDocument()
  })
})
