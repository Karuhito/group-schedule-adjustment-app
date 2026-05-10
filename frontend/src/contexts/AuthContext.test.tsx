import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

function TestComponent() {
  const { user, loading } = useAuth()
  if (loading) return <div>loading</div>
  return <div>{user ? user.username : 'no user'}</div>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('初期状態は loading インジケーターを表示する', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )
    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('GET /auth/me 成功後にユーザー名を表示する', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: 'u1',
      username: 'Alice',
      avatar_url: null,
    })
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
  })

  it('GET /auth/me 失敗後は user=null のまま', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'))
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument())
  })

  it('setUser でユーザーを更新できる', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: 'u1',
      username: 'Alice',
      avatar_url: null,
    })

    function UpdateComponent() {
      const { user, setUser, loading } = useAuth()
      if (loading) return <div>loading</div>
      return (
        <div>
          <span>{user ? user.username : 'no user'}</span>
          <button onClick={() => setUser(null)}>logout</button>
        </div>
      )
    }

    const { getByRole } = render(
      <AuthProvider>
        <UpdateComponent />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    fireEvent.click(getByRole('button', { name: 'logout' }))
    await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument())
  })
})
