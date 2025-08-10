'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Search, Calendar, FileText, Trash2 } from 'lucide-react'
import { AlertDialog } from '@/components/ui/alert-dialog'

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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; mindMap: MindMap | null }>({
    open: false,
    mindMap: null,
  })
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

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
      if (result.success && result.data) {
        // 自动跳转到新创建的思维导图编辑页面
        router.push(`/mindmaps/${result.data.id}`)
      }
    } catch (error) {
      console.error('Failed to create mind map:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 打开删除确认对话框
  const openDeleteDialog = (mindMap: MindMap, e: React.MouseEvent) => {
    e.preventDefault() // 阻止导航到详情页
    e.stopPropagation()
    setDeleteError(null) // 清除之前的错误
    setDeleteDialog({ open: true, mindMap })
  }

  // 删除思维导图
  const deleteMindMap = async () => {
    if (!deleteDialog.mindMap || deleting) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/mindmaps/${deleteDialog.mindMap.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (result.success) {
        // 从列表中移除已删除的思维导图
        const updatedMindMaps = mindMaps.filter(m => m.id !== deleteDialog.mindMap!.id)
        setMindMaps(updatedMindMaps)
        setFilteredMindMaps(
          updatedMindMaps.filter(mindMap =>
            mindMap.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
        setDeleteDialog({ open: false, mindMap: null })
      } else {
        console.error('删除失败:', result.message)
        setDeleteError(`删除失败: ${result.message}`)
        // 关闭对话框，显示错误提示
        setDeleteDialog({ open: false, mindMap: null })
      }
    } catch (error) {
      console.error('删除思维导图失败:', error)
      setDeleteError('删除失败: 网络连接错误，请稍后重试')
      // 关闭对话框，显示错误提示  
      setDeleteDialog({ open: false, mindMap: null })
    } finally {
      setDeleting(false)
    }
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
              <div key={mindMap.id} className="relative group">
                <Link href={`/mindmaps/${mindMap.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="truncate" title={mindMap.title}>
                            {mindMap.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(mindMap.updated_at)}
                          </CardDescription>
                        </div>

                        {/* 删除按钮 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          onClick={e => openDeleteDialog(mindMap, e)}
                          title="删除思维导图"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
              </div>
            ))}
          </div>
        )}

        {/* 错误提示 */}
        {deleteError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800" data-testid="delete-error-message">
                  {deleteError}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                    onClick={() => setDeleteError(null)}
                  >
                    <span className="sr-only">关闭</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          共 {mindMaps.length} 个思维导图
          {searchQuery &&
            filteredMindMaps.length !== mindMaps.length &&
            `, 显示 ${filteredMindMaps.length} 个匹配结果`}
        </div>

        {/* 删除确认对话框 */}
        <AlertDialog
          open={deleteDialog.open}
          onOpenChange={open => setDeleteDialog(prev => ({ open, mindMap: open ? prev.mindMap : null }))}
          title="删除思维导图"
          description={
            deleteDialog.mindMap
              ? `确定要删除思维导图 "${deleteDialog.mindMap.title}" 吗？此操作不可撤销。`
              : ''
          }
          confirmText={deleting ? '删除中...' : '删除'}
          cancelText="取消"
          onConfirm={deleteMindMap}
          variant="destructive"
        />
      </div>
    </ProtectedRoute>
  )
}
