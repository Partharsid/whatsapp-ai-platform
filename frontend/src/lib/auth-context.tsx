'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api } from './api'

interface AuthUser {
  id: string
  email: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('wa_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { localStorage.removeItem('wa_user') }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login(email, password)
    const userData = data.user
    localStorage.setItem('wa_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('wa_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
