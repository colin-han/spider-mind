'use client'

import { Button } from '@/components/ui/button'
import {
  FileText,
  Save,
  Download,
  Upload,
  Undo2,
  Redo2,
  Copy,
  Clipboard,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize,
  Settings,
  PanelRightOpen,
  PanelRightClose,
  Plus,
  Image,
  Link,
  Palette,
  Type,
  Sparkles,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export interface TopToolbarProps {
  onSave: () => void
  onExport: (format: 'png' | 'svg' | 'pdf' | 'json') => void
  onImport: (file: File) => void
  onToggleRightPanel: () => void
  showRightPanel: boolean
  hasSelection: boolean
}

export function TopToolbar({
  onSave,
  onExport,
  onImport,
  onToggleRightPanel,
  showRightPanel,
  hasSelection,
}: TopToolbarProps) {
  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.xmind,.mm'
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        onImport(file)
      }
    }
    input.click()
  }

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2 flex-shrink-0">
      {/* 应用标题 */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">SM</span>
        </div>
        <span className="font-semibold text-gray-800">Spider Mind</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 文件操作 */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          新建
        </Button>
        <Button variant="ghost" size="sm" onClick={onSave} className="flex items-center gap-1">
          <Save className="w-4 h-4" />
          保存
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onExport('json')}
          className="flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          导出
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleImportClick}
          className="flex items-center gap-1"
        >
          <Upload className="w-4 h-4" />
          导入
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 编辑操作 */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Redo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasSelection}
          className="flex items-center gap-1"
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Clipboard className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 插入操作 */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Plus className="w-4 h-4" />
          节点
        </Button>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Image className="w-4 h-4" />
          图片
        </Button>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Link className="w-4 h-4" />
          链接
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 格式操作 */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Type className="w-4 h-4" />
          字体
        </Button>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Palette className="w-4 h-4" />
          颜色
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* AI助手 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
        >
          <Sparkles className="w-4 h-4" />
          AI助手
        </Button>
      </div>

      {/* 右侧控制区 */}
      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {/* 搜索 */}
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Search className="w-4 h-4" />
        </Button>

        {/* 视图控制 */}
        <Button variant="ghost" size="sm">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Maximize className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* 面板控制 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRightPanel}
          className="flex items-center gap-1"
        >
          {showRightPanel ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </Button>

        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
