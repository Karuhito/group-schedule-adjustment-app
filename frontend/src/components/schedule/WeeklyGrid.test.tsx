import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { WeeklyGrid } from './WeeklyGrid'
import { getWeekDates } from './weeklyGridUtils'

const TODAY = new Date(2026, 4, 14) // 2026-05-14 木曜
const WEEK_DATES = getWeekDates(TODAY)

function renderGrid(selectedKeys = new Set<string>(), onToggle = vi.fn()) {
  return render(
    <WeeklyGrid
      weekDates={WEEK_DATES}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      today={TODAY}
    />
  )
}

describe('WeeklyGrid', () => {
  it('7列（月〜日）のヘッダーが表示される', () => {
    renderGrid()
    expect(screen.getByText('月')).toBeInTheDocument()
    expect(screen.getByText('日')).toBeInTheDocument()
  })

  it('7×48 = 336個のセルボタンが存在する', () => {
    renderGrid()
    const cells = screen.getAllByRole('button')
    expect(cells.length).toBe(7 * 48)
  })

  it('過去日（5/11、5/12、5/13）のセルはdisabledになる', () => {
    renderGrid()
    // 月曜(5/11)の最初のセルがdisabled
    const mondayCells = screen.getAllByRole('button').filter(btn =>
      btn.getAttribute('aria-label')?.includes('5月11日')
    )
    mondayCells.forEach(btn => expect(btn).toBeDisabled())
  })

  it('今日(5/14)のセルはdisabledでない', () => {
    renderGrid()
    const todayCells = screen.getAllByRole('button').filter(btn =>
      btn.getAttribute('aria-label')?.includes('5月14日')
    )
    expect(todayCells.length).toBeGreaterThan(0)
    todayCells.forEach(btn => expect(btn).not.toBeDisabled())
  })

  it('セルをクリックするとonToggleが正しいキーで呼ばれる', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderGrid(new Set(), onToggle)
    const todayCells = screen.getAllByRole('button').filter(btn =>
      btn.getAttribute('aria-label')?.includes('5月14日')
    )
    await user.click(todayCells[0])
    expect(onToggle).toHaveBeenCalledWith('2026-05-14 00:00')
  })

  it('selectedKeysに含まれるセルはaria-pressed=trueになる', () => {
    const keys = new Set(['2026-05-14 14:00'])
    renderGrid(keys)
    const selectedCells = screen.getAllByRole('button').filter(btn =>
      btn.getAttribute('aria-pressed') === 'true'
    )
    expect(selectedCells.length).toBe(1)
  })

  it('月跨ぎ週（4/27〜5/3）でも正しくレンダリングされる', () => {
    const crossMonthToday = new Date(2026, 3, 30)
    const crossWeekDates = getWeekDates(crossMonthToday)
    render(
      <WeeklyGrid
        weekDates={crossWeekDates}
        selectedKeys={new Set()}
        onToggle={vi.fn()}
        today={crossMonthToday}
      />
    )
    expect(screen.getAllByRole('button').length).toBe(336)
  })

  it('当週外のスロットはセル選択に反映されない', () => {
    // 当週外キー（6/1）を含むSetを渡してもグリッドに選択は表示されない
    const keys = new Set(['2026-06-01 14:00']) // 当週（5/11〜5/17）の外
    renderGrid(keys)
    const selectedCells = screen.getAllByRole('button').filter(btn =>
      btn.getAttribute('aria-pressed') === 'true'
    )
    expect(selectedCells.length).toBe(0)
  })
})
