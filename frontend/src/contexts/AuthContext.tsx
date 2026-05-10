import { createContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../types'

export interface AuthContextValue {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
