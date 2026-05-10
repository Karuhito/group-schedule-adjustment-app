import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('ロゴタイトルを表示する', () => {
    render(<LoginPage />)
    expect(screen.getByText('🗓 GroupSync')).toBeInTheDocument()
  })

  it('「Discord でログイン」ボタンを表示する', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: 'Discord でログイン' })).toBeInTheDocument()
  })
})
