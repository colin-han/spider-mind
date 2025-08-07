'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { 
  Sparkles, 
  Lightbulb, 
  Search,
  Plus,
  Loader2,
  X
} from 'lucide-react'

interface AIAssistantProps {
  selectedNode?: {
    id: string
    content: string
  }
  allNodes: Array<{
    id: string
    content: string
  }>
  onSuggestionApply: (suggestion: AISuggestion) => void
  onClose: () => void
}

interface AISuggestion {
  type: 'node' | 'connection' | 'restructure'
  title: string
  description: string
  content?: string
  position?: { x: number; y: number }
  connections?: string[]
}

export function AIAssistant({ 
  selectedNode, 
  allNodes, 
  onSuggestionApply, 
  onClose 
}: AIAssistantProps) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [userInput, setUserInput] = useState('')
  const [activeTab, setActiveTab] = useState<'expand' | 'suggest' | 'analyze'>('expand')

  const handleAIRequest = async (action: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          context: {
            selectedNode,
            allNodes,
            userInput
          }
        })
      })

      if (!response.ok) {
        throw new Error('AI请求失败')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('AI助手错误:', error)
      setSuggestions([{
        type: 'node',
        title: '请求失败',
        description: 'AI助手暂时不可用，请稍后重试',
        content: '错误'
      }])
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    {
      key: 'expand',
      label: '扩展节点',
      icon: Plus,
      description: selectedNode ? `扩展"${selectedNode.content}"` : '选择一个节点来扩展',
      disabled: !selectedNode
    },
    {
      key: 'suggest',
      label: '智能建议',
      icon: Lightbulb,
      description: '基于当前思维导图提供建议',
      disabled: false
    },
    {
      key: 'analyze',
      label: '结构分析',
      icon: Search,
      description: '分析思维导图的结构和内容',
      disabled: false
    }
  ] as const

  return (
    <Card className="absolute top-4 right-4 w-80 max-h-96 z-20 p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold">AI助手</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 选项卡 */}
      <div className="grid grid-cols-3 gap-1 mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              disabled={tab.disabled}
              onClick={() => setActiveTab(tab.key)}
              className="flex flex-col gap-1 h-auto py-2"
            >
              <Icon className="w-3 h-3" />
              <span className="text-xs">{tab.label}</span>
            </Button>
          )
        })}
      </div>

      {/* 当前选项卡说明 */}
      <p className="text-xs text-gray-600 mb-3">
        {tabs.find(t => t.key === activeTab)?.description}
      </p>

      {/* 用户输入区域 */}
      {activeTab === 'suggest' && (
        <div className="mb-3">
          <Textarea
            placeholder="描述你想要的建议或改进方向..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="text-sm"
            rows={2}
          />
        </div>
      )}

      {/* 操作按钮 */}
      <Button
        onClick={() => handleAIRequest(activeTab)}
        disabled={loading || (activeTab === 'expand' && !selectedNode)}
        className="w-full mb-4"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI思考中...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            获取AI建议
          </>
        )}
      </Button>

      {/* 建议列表 */}
      {suggestions.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <h4 className="text-sm font-medium mb-2">AI建议：</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="p-3 border border-gray-200">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium mb-1">{suggestion.title}</h5>
                    <p className="text-xs text-gray-600 mb-2">{suggestion.description}</p>
                    {suggestion.content && (
                      <p className="text-xs bg-gray-50 p-1 rounded">
                        &ldquo;{suggestion.content}&rdquo;
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSuggestionApply(suggestion)}
                    className="shrink-0"
                  >
                    应用
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}