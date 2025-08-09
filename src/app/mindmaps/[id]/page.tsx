'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { useAuth } from '@/contexts/auth-context'
import {
  ArrowLeft,
  Save,
  Settings,
  Share,
  Sparkles,
  Plus,
  Trash2,
  Search,
  Download,
  Upload,
} from 'lucide-react'
import { MindMap, type MindMapRef } from '@/components/mind-map/mind-map'
import { AIAssistant } from '@/components/ai/ai-assistant'

interface MindMapData {
  id: string
  title: string
  content: {
    nodes: unknown[]
    edges: unknown[]
  }
  created_at: string
  updated_at: string
}

function MindMapDetailPage() {
  const params = useParams()
  const router = useRouter()
  const mindMapId = params.id as string
  const { user } = useAuth()

  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const mindMapRef = useRef<MindMapRef | null>(null)

  // 加载思维导图数据
  useEffect(() => {
    const loadMindMap = async () => {
      try {
        const response = await fetch(`/api/mindmaps/${mindMapId}`)
        const result = await response.json()

        if (result.success) {
          setMindMapData(result.data)
          setTitle(result.data.title)
        } else {
          // 思维导图不存在，重定向到列表页
          router.push('/mindmaps')
        }
      } catch (error) {
        console.error('Failed to load mind map:', error)
        router.push('/mindmaps')
      } finally {
        setLoading(false)
      }
    }

    if (mindMapId) {
      loadMindMap()
    }
  }, [mindMapId, router])

  // 保存思维导图
  const saveMindMap = async (newContent?: { nodes: unknown[]; edges: unknown[] }) => {
    if (!mindMapData) return

    setSaving(true)
    try {
      // 如果没有传入新内容，尝试从MindMap组件获取当前状态
      let contentToSave = newContent
      if (!contentToSave && mindMapRef.current) {
        // TODO: 需要在MindMap组件中实现getCurrentData方法
        contentToSave = mindMapData.content // 暂时使用现有数据
      }

      const response = await fetch(`/api/mindmaps/${mindMapData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content: contentToSave || mindMapData.content,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setLastSaved(new Date())

        // 如果有新内容，更新本地状态
        if (contentToSave) {
          setMindMapData(prev => (prev ? { ...prev, content: contentToSave } : null))
        }

        // 如果标题改变了，更新
        if (title !== mindMapData.title) {
          setMindMapData(prev => (prev ? { ...prev, title } : null))
        }
      }
    } catch (error) {
      console.error('Failed to save mind map:', error)
    } finally {
      setSaving(false)
    }
  }

  // 处理思维导图内容变化
  const handleMindMapChange = async (newContent: { nodes: unknown[]; edges: unknown[] }) => {
    // 先更新本地状态，再保存
    setMindMapData(prev => (prev ? { ...prev, content: newContent } : null))
    await saveMindMap(newContent)
  }

  // 处理标题变化
  const handleTitleChange = async () => {
    if (title !== mindMapData?.title) {
      await saveMindMap()
    }
  }

  // 处理AI建议应用
  const handleAISuggestionApply = async (suggestion: any) => {
    // 这里可以实现AI建议的应用逻辑
    console.log('Applying AI suggestion:', suggestion)

    // 简化实现：关闭AI助手
    setShowAIAssistant(false)
  }

  // 新的工具栏操作函数
  const handleAddNode = () => {
    mindMapRef.current?.addNode()
  }

  const handleDeleteSelected = () => {
    mindMapRef.current?.deleteSelected()
  }

  const handleSearch = () => {
    // TODO: 实现搜索功能
    console.log('Search functionality to be implemented')
  }

  const handleExport = () => {
    // TODO: 实现导出功能
    console.log('Export functionality to be implemented')
  }

  const handleImport = () => {
    // TODO: 实现导入功能
    console.log('Import functionality to be implemented')
  }

  const handleSelectionChange = (nodes: string[]) => {
    setSelectedNodes(nodes)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载思维导图...</p>
        </div>
      </div>
    )
  }

  if (!mindMapData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">思维导图不存在</p>
          <Link href="/mindmaps">
            <Button>返回列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/mindmaps">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>

          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleChange}
            className="text-lg font-medium border-none shadow-none focus:ring-0 px-0"
            placeholder="思维导图标题..."
          />
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-sm text-gray-500">已保存 {lastSaved.toLocaleTimeString()}</span>
          )}

          {/* 思维导图操作按钮 */}
          <Button variant="ghost" size="sm" onClick={handleAddNode}>
            <Plus className="h-4 w-4 mr-2" />
            添加节点
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedNodes.length === 0}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </Button>

          <div className="w-px h-6 bg-gray-300" />

          <Button variant="ghost" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShowAIAssistant(!showAIAssistant)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI助手
          </Button>

          <div className="w-px h-6 bg-gray-300" />

          <Button variant="ghost" size="sm" onClick={() => saveMindMap()} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>

          <Button variant="ghost" size="sm">
            <Share className="h-4 w-4 mr-2" />
            分享
          </Button>

          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>

          <Button variant="ghost" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            导入
          </Button>

          <UserMenu />
        </div>
      </div>

      {/* 思维导图编辑器 */}
      <div className="flex-1 relative">
        <MindMap
          initialNodes={mindMapData.content.nodes}
          initialEdges={mindMapData.content.edges}
          onChange={handleMindMapChange}
          onSelectionChange={handleSelectionChange}
          ref={mindMapRef}
          showToolbar={false}
        />

        {/* AI助手面板 */}
        {showAIAssistant && (
          <div className="absolute top-4 right-4 z-10">
            <AIAssistant
              allNodes={
                mindMapData.content.nodes?.map((node: any) => ({
                  id: node.id,
                  content: node.data?.content || '',
                })) || []
              }
              onSuggestionApply={handleAISuggestionApply}
              onClose={() => setShowAIAssistant(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// 包装组件以提供权限保护
function ProtectedMindMapDetailPage() {
  return (
    <ProtectedRoute>
      <MindMapDetailPage />
    </ProtectedRoute>
  )
}

export default ProtectedMindMapDetailPage
