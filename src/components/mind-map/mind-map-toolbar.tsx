'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Save, Sparkles, Search, Download, Upload } from 'lucide-react'

export interface MindMapToolbarProps {
  onAddNode: () => void
  onDeleteSelected: () => void
  onSave: () => void
  onAIAssist?: () => void
  onSearch?: () => void
  onExport?: () => void
  onImport?: () => void
  hasSelection: boolean
  selectedNodeCount: number
}

export function MindMapToolbar({
  onAddNode,
  onDeleteSelected,
  onSave,
  onAIAssist,
  onSearch,
  onExport,
  onImport,
  hasSelection,
  selectedNodeCount,
}: MindMapToolbarProps) {
  // 动态按钮文案
  const addNodeText = selectedNodeCount === 1 ? '添加子节点' : '添加节点'
  return (
    <Card className="absolute top-4 left-4 z-10 p-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddNode}
          className="flex items-center gap-1"
          data-testid="add-node-button"
        >
          <Plus className="w-4 h-4" />
          {addNodeText}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className="flex items-center gap-1 text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
          删除
        </Button>

        <div className="w-px bg-gray-300 mx-1" />

        {onAIAssist && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAIAssist}
            className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
          >
            <Sparkles className="w-4 h-4" />
            AI助手
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onSearch} className="flex items-center gap-1">
          <Search className="w-4 h-4" />
          搜索
        </Button>

        <div className="w-px bg-gray-300 mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
        >
          <Save className="w-4 h-4" />
          保存
        </Button>

        <Button variant="outline" size="sm" onClick={onExport} className="flex items-center gap-1">
          <Download className="w-4 h-4" />
          导出
        </Button>

        <Button variant="outline" size="sm" onClick={onImport} className="flex items-center gap-1">
          <Upload className="w-4 h-4" />
          导入
        </Button>
      </div>
    </Card>
  )
}
