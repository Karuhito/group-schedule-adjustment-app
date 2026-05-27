import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

function renderLoginPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  it('ロゴタイトルを表示する', () => {
    renderLoginPage()
    expect(screen.getByText('🗓 GroupSync')).toBeInTheDocument()
  })

  it('「Discord でログイン」ボタンを表示する', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: 'Discord でログイン' })).toBeInTheDocument()
  })

  it('auth_error=cancelled のときキャンセルメッセージを表示する', () => {
    renderLoginPage('?auth_error=cancelled')
    expect(screen.getByText('Discord 認証がキャンセルされました')).toBeInTheDocument()
  })

  it('auth_error がないときキャンセルメッセージを表示しない', () => {
    renderLoginPage()
    expect(screen.queryByText('Discord 認証がキャンセルされました')).not.toBeInTheDocument()
  })
})
