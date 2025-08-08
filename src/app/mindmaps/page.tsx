'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Search, Calendar, FileText } from 'lucide-react'

interface MindMap {
  id: string
  title: string
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

export default function MindMapsListPage() {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredMindMaps, setFilteredMindMaps] = useState<MindMap[]>([])
  const { user } = useAuth()

  // 加载思维导图列表
  useEffect(() => {
    const loadMindMaps = async () => {
      if (!user) return

      try {
        const response = await fetch(`/api/mindmaps?userId=${user.id}`)
        const result = await response.json()

        if (result.success) {
          setMindMaps(result.data)
          setFilteredMindMaps(result.data)
        }
      } catch (error) {
        console.error('Failed to load mind maps:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMindMaps()
  }, [user])

  // 搜索过滤
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMindMaps(mindMaps)
    } else {
      const filtered = mindMaps.filter(mindMap =>
        mindMap.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredMindMaps(filtered)
    }
  }, [searchQuery, mindMaps])

  // 创建新思维导图
  const createNewMindMap = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `新思维导图 ${new Date().toLocaleString()}`,
          userId: user.id,
        }),
      })

      const result = await response.json()
      if (result.success) {
        // 重新加载列表
        const listResponse = await fetch(`/api/mindmaps?userId=${user.id}`)
        const listResult = await listResponse.json()
        if (listResult.success) {
          setMindMaps(listResult.data)
          setFilteredMindMaps(listResult.data)
        }
      }
    } catch (error) {
      console.error('Failed to create mind map:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">思维导图</h1>
            <p className="text-muted-foreground mt-2">管理和创建你的思维导图</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={createNewMindMap} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新建思维导图
            </Button>
            <UserMenu />
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="搜索思维导图..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 思维导图网格 */}
        {filteredMindMaps.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? '未找到匹配的思维导图' : '还没有思维导图'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? '尝试调整搜索关键词' : '创建你的第一个思维导图开始使用'}
            </p>
            {!searchQuery && (
              <Button onClick={createNewMindMap} className="flex items-center gap-2 mx-auto">
                <Plus className="h-4 w-4" />
                创建第一个思维导图
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMindMaps.map(mindMap => (
              <Link key={mindMap.id} href={`/mindmaps/${mindMap.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="truncate" title={mindMap.title}>
                      {mindMap.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(mindMap.updated_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      {mindMap.content &&
                      typeof mindMap.content === 'object' &&
                      'nodes' in mindMap.content
                        ? `${(mindMap.content.nodes as unknown[]).length} 个节点`
                        : '空白思维导图'}
                    </div>
                    <div className="mt-4 h-20 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">思维导图预览</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* 统计信息 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          共 {mindMaps.length} 个思维导图
          {searchQuery &&
            filteredMindMaps.length !== mindMaps.length &&
            `, 显示 ${filteredMindMaps.length} 个匹配结果`}
        </div>
      </div>
    </ProtectedRoute>
  )
}
