import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import type { MemberSchedule, ScheduleSlot } from '../../types'
import { WeeklyGrid } from './WeeklyGrid'
import { ScheduleTimeline } from './ScheduleTimeline'
import {
  getWeekDates,
  keySetToSlots,
  slotsToKeySet,
  partitionSlotsByWeek,
} from './weeklyGridUtils'

interface Props {
  groupId: string
}

export function ScheduleTab({ groupId }: Props) {
  const { user } = useAuth()
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [externalSlots, setExternalSlots] = useState<ScheduleSlot[]>([])
  const [memberSchedules, setMemberSchedules] = useState<MemberSchedule[]>([])
  const [view, setView] = useState<'edit' | 'overview'>('edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 初回レンダリング時に固定（長時間開いても週が変わらない）
  const referenceDate = useMemo(() => new Date(), [])
  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate])

  const fetchSchedules = useCallback(async () => {
    const data = await api.get<MemberSchedule[]>(`/groups/${groupId}/schedules`)
    setMemberSchedules(data)
    const mine = data.find((m) => m.user_id === user?.id)?.slots ?? []
    const { inWeek, outOfWeek } = partitionSlotsByWeek(mine, weekDates)
    setSelectedKeys(slotsToKeySet(inWeek))
    setExternalSlots(outOfWeek)
  }, [groupId, user?.id, weekDates])

  useEffect(() => {
    fetchSchedules().catch(() => setError('スケジュールの取得に失敗しました'))
  }, [fetchSchedules])

  const handleToggle = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const inWeekSlots = keySetToSlots(selectedKeys)
      const merged = [...externalSlots, ...inWeekSlots]
      await api.put(`/groups/${groupId}/schedules`, { slots: merged })
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
      <div className="mb-4 flex border-b border-slate-700">
        <button
          onClick={() => setView('edit')}
          className={
            view === 'edit'
              ? 'border-b-2 border-violet-500 px-4 py-2 text-sm font-semibold text-violet-300'
              : 'px-4 py-2 text-sm text-slate-400 hover:text-slate-200'
          }
        >
          自分の予定を入力
        </button>
        <button
          onClick={() => setView('overview')}
          className={
            view === 'overview'
              ? 'border-b-2 border-violet-500 px-4 py-2 text-sm font-semibold text-violet-300'
              : 'px-4 py-2 text-sm text-slate-400 hover:text-slate-200'
          }
        >
          みんなの予定
        </button>
      </div>

      {view === 'edit' ? (
        <div>
          <WeeklyGrid
            weekDates={weekDates}
            selectedKeys={selectedKeys}
            onToggle={handleToggle}
            today={referenceDate}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      ) : (
        <ScheduleTimeline memberSchedules={memberSchedules} />
      )}
    </div>
  )
}
