'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化时检查用户状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem('spider-mind-user')
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        localStorage.removeItem('spider-mind-user')
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)

      // 简化的认证逻辑：对于开发环境，直接使用测试用户
      if (email === 'dev@test.com' && password === 'password') {
        const testUser: User = {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'dev@test.com',
          full_name: '开发测试用户',
          created_at: '2025-01-09T01:00:00.000Z',
          updated_at: '2025-01-09T01:00:00.000Z',
        }

        setUser(testUser)
        localStorage.setItem('spider-mind-user', JSON.stringify(testUser))
        return true
      }

      // 可扩展：这里可以集成真实的认证API
      return false
    } catch (error) {
      console.error('Sign in error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('spider-mind-user')
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
