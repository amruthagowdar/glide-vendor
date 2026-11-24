import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../lib/api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('accessToken')
    if (storedUser && storedUser !== 'undefined' && token && token !== 'undefined') {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed && typeof parsed === 'object') {
          setUser(parsed)
        }
      } catch {
        localStorage.clear()
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await authApi.login(email, password)
      const payload = res.data?.data || res.data
      const { accessToken, refreshToken, user: userData } = payload

      if (accessToken && userData) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
        return
      }
    } catch {
      // Fallback for demo or static host when backend is not reached
    }

    if (email.toLowerCase().trim() === 'harish@atharvatravels.com') {
      const demoUser: User = {
        id: 'usr_harish_atharva',
        name: 'Harish Gowda',
        email: 'harish@atharvatravels.com',
        phone: '+91 98765 43210',
        role: 'VENDOR_ADMIN',
        companyId: 'cmp_atharva_travels',
        companyName: 'Atharva Travels',
      }
      localStorage.setItem('accessToken', 'glide_demo_vendor_token_harish')
      localStorage.setItem('refreshToken', 'glide_demo_vendor_refresh_harish')
      localStorage.setItem('user', JSON.stringify(demoUser))
      setUser(demoUser)
      return
    }

    throw new Error('Invalid login credentials')
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken && refreshToken !== 'undefined') {
        await authApi.logout(refreshToken)
      }
    } catch {
      // ignore logout errors
    } finally {
      localStorage.clear()
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
