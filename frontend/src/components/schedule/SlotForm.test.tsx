import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SlotForm } from './SlotForm'
import type { ScheduleSlot } from '../../types'

const dummySlot: ScheduleSlot = {
  start_time: '2026-06-01T01:00:00.000Z',
  end_time: '2026-06-01T09:00:00.000Z',
}

function renderSlotForm(overrides: {
  mySlots?: ScheduleSlot[]
  onAdd?: ReturnType<typeof vi.fn>
  onRemove?: ReturnType<typeof vi.fn>
  onSave?: ReturnType<typeof vi.fn>
  saving?: boolean
} = {}) {
  const props = {
    mySlots: [] as ScheduleSlot[],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onSave: vi.fn(),
    saving: false,
    ...overrides,
  }
  render(<SlotForm {...props} />)
  return props
}

describe('SlotForm', () => {
  it('登録済みスロットに削除ボタンが表示される', () => {
    renderSlotForm({ mySlots: [dummySlot] })
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument()
  })

  it('✕ ボタンクリックで onRemove が index を引数に呼ばれる', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    renderSlotForm({ mySlots: [dummySlot], onRemove })
    await user.click(screen.getByRole('button', { name: '削除' }))
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('開始時刻 >= 終了時刻のとき「追加」ボタンが無効', () => {
    renderSlotForm()
    fireEvent.change(screen.getByLabelText('日付'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('開始時刻'), { target: { value: '14:00' } })
    fireEvent.change(screen.getByLabelText('終了時刻'), { target: { value: '10:00' } })
    expect(screen.getByRole('button', { name: '追加' })).toBeDisabled()
  })

  it('日付・開始・終了が正しいとき「追加」クリックで onAdd が呼ばれる', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    renderSlotForm({ onAdd })
    fireEvent.change(screen.getByLabelText('日付'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('開始時刻'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('終了時刻'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: expect.stringContaining('2026-06-01'),
        end_time: expect.stringContaining('2026-06-01'),
      }),
    )
  })

  it('「保存する」ボタンクリックで onSave が呼ばれる', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderSlotForm({ onSave })
    await user.click(screen.getByRole('button', { name: '保存する' }))
    expect(onSave).toHaveBeenCalled()
  })

  it('saving=true のとき「保存中...」ボタンが表示される', () => {
    renderSlotForm({ saving: true })
    expect(screen.getByRole('button', { name: '保存中...' })).toBeInTheDocument()
  })
})
