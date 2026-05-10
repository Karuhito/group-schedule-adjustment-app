import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MemberList } from './MemberList'
import type { Member } from '../../types'

const members: Member[] = [
  { user_id: 'u1', username: 'Alice', avatar_url: null, is_owner: true },
  { user_id: 'u2', username: 'Bob', avatar_url: null, is_owner: false },
]

describe('MemberList', () => {
  it('全メンバーを表示する', () => {
    render(
      <MemberList members={members} isOwner={false} currentUserId="u3" onKick={vi.fn()} />,
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('オーナーバッジを表示する', () => {
    render(
      <MemberList members={members} isOwner={false} currentUserId="u3" onKick={vi.fn()} />,
    )
    expect(screen.getByText('オーナー')).toBeInTheDocument()
  })

  it('isOwner=false のとき追い出しボタンを表示しない', () => {
    render(
      <MemberList members={members} isOwner={false} currentUserId="u3" onKick={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: '追い出し' })).not.toBeInTheDocument()
  })

  it('isOwner=true のとき自分以外のメンバーに追い出しボタンを表示し、クリックで onKick を呼ぶ', async () => {
    const user = userEvent.setup()
    const onKick = vi.fn()
    render(
      <MemberList members={members} isOwner={true} currentUserId="u1" onKick={onKick} />,
    )
    const kickBtn = screen.getByRole('button', { name: '追い出し' })
    await user.click(kickBtn)
    expect(onKick).toHaveBeenCalledWith('u2')
  })
})
