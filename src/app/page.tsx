'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // 已登录，跳转到思维导图列表
        router.replace('/mindmaps')
      } else {
        // 未登录，跳转到登录页
        router.replace('/login')
      }
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {isLoading
            ? '检查登录状态...'
            : isAuthenticated
              ? '正在跳转到思维导图...'
              : '正在跳转到登录页...'}
        </p>
      </div>
    </div>
  )
}
