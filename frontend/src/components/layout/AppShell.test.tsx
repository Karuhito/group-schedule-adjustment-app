import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { useAuth } from '../../hooks/useAuth'
import type { AuthContextValue } from '../../contexts/AuthContext'

vi.mock('../../hooks/useAuth')

const mockUser = { id: 'u1', username: 'Alice', avatar_url: null }

function buildAuth(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    setUser: vi.fn(),
    loading: false,
    ...overrides,
  }
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
  })

  it('loading=true のとき「読み込み中...」を表示する', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuth({ loading: true }))
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('未認証（user=null）は /login にリダイレクトする', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuth({ user: null, loading: false }))
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route element={<AppShell />}>
            <Route path="/home" element={<div>home page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('認証済みのとき子コンテンツを表示する', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuth({ user: mockUser }))
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<div>home content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('home content')).toBeInTheDocument()
  })
})
