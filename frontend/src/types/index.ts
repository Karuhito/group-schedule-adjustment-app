export interface User {
  id: string
  username: string
  avatar_url: string | null
}

export interface Group {
  id: string
  name: string
  invite_code: string
  member_count: number
  is_owner: boolean
}

export interface GroupPreview {
  id: string
  name: string
  member_count: number
}

export interface Member {
  user_id: string
  username: string
  avatar_url: string | null
  is_owner: boolean
}

export interface ScheduleSlot {
  start_time: string // ISO 8601 with timezone
  end_time: string
}

export interface MemberSchedule {
  user_id: string
  username: string
  avatar_url: string | null
  slots: ScheduleSlot[]
}
