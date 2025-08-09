'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { User, LogOut, Settings } from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  if (!user) return null

  const handleSignOut = () => {
    signOut()
    setShowMenu(false)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2"
      >
        <User className="h-4 w-4" />
        <span className="hidden md:inline">{user.full_name || user.email}</span>
      </Button>

      {showMenu && (
        <>
          {/* 背景遮罩 */}
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />

          {/* 菜单 */}
          <Card className="absolute right-0 top-full mt-2 w-64 z-20">
            <CardContent className="p-4 space-y-4">
              <div className="border-b pb-3">
                <p className="font-medium">{user.full_name || '用户'}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowMenu(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
