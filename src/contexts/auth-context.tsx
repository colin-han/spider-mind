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
  setTestUser: (user: User) => void
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
        // 检查URL中的测试认证参数（仅在非生产环境）
        if (process.env.NEXT_PUBLIC_NODE_ENV !== 'production' && typeof window !== 'undefined') {
          console.log('[TEST AUTH] Checking URL params, NEXT_PUBLIC_NODE_ENV:', process.env.NEXT_PUBLIC_NODE_ENV)
          const urlParams = new URLSearchParams(window.location.search)
          const testAuth = urlParams.get('test_auth')
          const testToken = urlParams.get('test_token')
          
          if (testAuth && testToken === 'test-auth-secret-2025') {
            console.log('[TEST AUTH] Found test auth params, testAuth:', testAuth)
            try {
              const response = await fetch(`/api/test/auth?user=${testAuth}&token=${testToken}`)
              const data = await response.json()
              console.log('[TEST AUTH] API response:', data)
              
              if (data.success && data.user) {
                console.log('[TEST AUTH] Setting user:', data.user.email)
                setUser(data.user)
                localStorage.setItem('spider-mind-user', JSON.stringify(data.user))
                
                // 清理URL参数
                const newUrl = new URL(window.location.href)
                newUrl.searchParams.delete('test_auth')
                newUrl.searchParams.delete('test_token')
                window.history.replaceState({}, '', newUrl.toString())
                
                setIsLoading(false)
                return
              }
            } catch (error) {
              console.error('[TEST AUTH] Failed:', error)
            }
          }
        }
        
        // 正常的用户状态检查
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

      // 支持多个测试用户的认证逻辑
      const testUsers: Record<string, { user: User; password: string }> = {
        'dev@test.com': {
          user: {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'dev@test.com',
            full_name: '开发测试用户',
            created_at: '2025-01-09T01:00:00.000Z',
            updated_at: '2025-01-09T01:00:00.000Z',
          },
          password: 'password',
        },
        'autotester@test.com': {
          user: {
            id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            email: 'autotester@test.com',
            full_name: 'Auto Tester',
            created_at: '2025-01-15T00:00:00.000Z',
            updated_at: '2025-01-15T00:00:00.000Z',
          },
          password: 'password123',
        },
      }

      const testUserData = testUsers[email]
      if (testUserData && testUserData.password === password) {
        setUser(testUserData.user)
        localStorage.setItem('spider-mind-user', JSON.stringify(testUserData.user))
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

  const setTestUser = (testUser: User) => {
    setUser(testUser)
    localStorage.setItem('spider-mind-user', JSON.stringify(testUser))
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    setTestUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
