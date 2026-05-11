import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import type { MemberSchedule, ScheduleSlot } from '../../types'
import { SlotForm } from './SlotForm'
import { ScheduleTimeline } from './ScheduleTimeline'

interface Props {
  groupId: string
}

export function ScheduleTab({ groupId }: Props) {
  const { user } = useAuth()
  const [memberSchedules, setMemberSchedules] = useState<MemberSchedule[]>([])
  const [mySlots, setMySlots] = useState<ScheduleSlot[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchSchedules = useCallback(async () => {
    const data = await api.get<MemberSchedule[]>(`/groups/${groupId}/schedules`)
    setMemberSchedules(data)
    const mine = data.find((m) => m.user_id === user?.id)
    setMySlots(mine?.slots ?? [])
  }, [groupId, user?.id])

  useEffect(() => {
    fetchSchedules().catch(() => setError('スケジュールの取得に失敗しました'))
  }, [fetchSchedules])

  function handleAdd(slot: ScheduleSlot) {
    setMySlots((prev) => [...prev, slot])
  }

  function handleRemove(index: number) {
    setMySlots((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await api.put(`/groups/${groupId}/schedules`, { slots: mySlots })
      await fetchSchedules()
    } catch {
      setError('スケジュールの保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <SlotForm
        mySlots={mySlots}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onSave={handleSave}
        saving={saving}
      />
      <hr className="my-6 border-slate-700" />
      <ScheduleTimeline memberSchedules={memberSchedules} />
    </div>
  )
}
