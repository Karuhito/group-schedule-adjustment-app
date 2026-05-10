import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GroupCard } from './GroupCard'
import type { Group } from '../../types'

const group: Group = {
  id: 'g1',
  name: '週末ゲーム部',
  invite_code: 'abc123',
  member_count: 4,
  is_owner: false,
}

describe('GroupCard', () => {
  it('グループ名とメンバー数を表示する', () => {
    render(<GroupCard group={group} onClick={vi.fn()} />)
    expect(screen.getByText('週末ゲーム部')).toBeInTheDocument()
    expect(screen.getByText('4 人')).toBeInTheDocument()
  })

  it('クリックで onClick がグループオブジェクトを引数に呼ばれる', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<GroupCard group={group} onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(group)
  })
})
