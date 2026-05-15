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
  it('7列のヘッダーが表示される（基準日の曜日から7日分）', () => {
    renderGrid()
    // TODAY=5/14(木) → 木〜水の7日分
    expect(screen.getByText('木')).toBeInTheDocument()
    expect(screen.getByText('水')).toBeInTheDocument()
  })

  it('7×48 = 336個のセルボタンが存在する', () => {
    renderGrid()
    const cells = screen.getAllByRole('button')
    expect(cells.length).toBe(7 * 48)
  })

  it('グリッドの全セルが有効（基準日以降のみ表示されるためdisabledなし）', () => {
    renderGrid()
    const cells = screen.getAllByRole('button')
    cells.forEach(btn => expect(btn).not.toBeDisabled())
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

  it('月跨ぎ（4/30〜5/6）でも正しくレンダリングされる', () => {
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
