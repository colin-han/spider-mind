'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Settings, Share } from 'lucide-react'
import { MindMap } from '@/components/mind-map/mind-map'

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

export default function MindMapDetailPage() {
  const params = useParams()
  const router = useRouter()
  const mindMapId = params.id as string
  
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

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
      const response = await fetch(`/api/mindmaps/${mindMapData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content: newContent || mindMapData.content
        })
      })

      const result = await response.json()
      if (result.success) {
        setLastSaved(new Date())
        
        // 如果有新内容，更新本地状态
        if (newContent) {
          setMindMapData(prev => prev ? { ...prev, content: newContent } : null)
        }

        // 如果标题改变了，更新
        if (title !== mindMapData.title) {
          setMindMapData(prev => prev ? { ...prev, title } : null)
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
    await saveMindMap(newContent)
  }

  // 处理标题变化
  const handleTitleChange = async () => {
    if (title !== mindMapData?.title) {
      await saveMindMap()
    }
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
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/mindmaps">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
          
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleChange}
            className="text-lg font-medium border-none shadow-none focus:ring-0 px-0"
            placeholder="思维导图标题..."
          />
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              已保存 {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => saveMindMap()}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>

          <Button variant="ghost" size="sm">
            <Share className="h-4 w-4 mr-2" />
            分享
          </Button>

          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 思维导图编辑器 */}
      <div className="flex-1">
        <MindMap 
          initialNodes={mindMapData.content.nodes}
          initialEdges={mindMapData.content.edges}
          onChange={handleMindMapChange}
        />
      </div>
    </div>
  )
}