import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth は AuthProvider の内側で使用してください')
  return ctx
}
