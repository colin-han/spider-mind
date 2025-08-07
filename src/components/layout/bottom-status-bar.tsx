'use client'

import { Button } from '@/components/ui/button'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Maximize2,
  Palette,
  BarChart3
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export interface BottomStatusBarProps {
  zoomLevel: number
  onZoomChange: (level: number) => void
  nodeCount: number
  edgeCount: number
  activeTheme: string
  onThemeChange: (theme: string) => void
}

export function BottomStatusBar({
  zoomLevel,
  onZoomChange,
  nodeCount,
  edgeCount,
  activeTheme,
  onThemeChange
}: BottomStatusBarProps) {
  const quickZoomLevels = [25, 50, 75, 100, 125, 150, 200]
  
  const themes = [
    { name: 'default', label: '默认', color: 'bg-blue-500' },
    { name: 'business', label: '商务', color: 'bg-gray-600' },
    { name: 'fresh', label: '清新', color: 'bg-green-500' },
    { name: 'warm', label: '暖色', color: 'bg-orange-500' },
    { name: 'cool', label: '冷色', color: 'bg-cyan-500' }
  ]

  const handleZoomIn = () => {
    const currentIndex = quickZoomLevels.findIndex(level => level >= zoomLevel)
    const nextIndex = Math.min(currentIndex + 1, quickZoomLevels.length - 1)
    onZoomChange(quickZoomLevels[nextIndex])
  }

  const handleZoomOut = () => {
    const currentIndex = quickZoomLevels.findIndex(level => level >= zoomLevel)
    const prevIndex = Math.max(currentIndex - 1, 0)
    onZoomChange(quickZoomLevels[prevIndex])
  }

  const handleFitToWindow = () => {
    onZoomChange(100)
  }

  const handleResetZoom = () => {
    onZoomChange(100)
  }

  return (
    <div className="h-8 bg-gray-100 border-t border-gray-200 flex items-center px-4 gap-4 text-sm flex-shrink-0">
      {/* 左侧：统计信息 */}
      <div className="flex items-center gap-4 text-gray-600">
        <div className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          <span>节点: {nodeCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>连接: {edgeCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>字数: {nodeCount * 3}</span>
        </div>
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* 中间：主题切换 */}
      <div className="flex items-center gap-2">
        <Palette className="w-3 h-3 text-gray-500" />
        <div className="flex items-center gap-1">
          {themes.map((theme) => (
            <button
              key={theme.name}
              className={`w-4 h-4 rounded-full ${theme.color} hover:scale-110 transition-transform ${
                activeTheme === theme.name ? 'ring-2 ring-gray-400 ring-offset-1' : ''
              }`}
              title={theme.label}
              onClick={() => onThemeChange(theme.name)}
            />
          ))}
        </div>
      </div>

      {/* 右侧：缩放控制 */}
      <div className="flex-1" />
      
      <div className="flex items-center gap-2">
        {/* 缩放按钮 */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2"
          onClick={handleZoomOut}
          disabled={zoomLevel <= quickZoomLevels[0]}
        >
          <ZoomOut className="w-3 h-3" />
        </Button>

        {/* 缩放比例显示 */}
        <div className="flex items-center gap-1">
          <select
            value={zoomLevel}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
          >
            {quickZoomLevels.map((level) => (
              <option key={level} value={level}>
                {level}%
              </option>
            ))}
          </select>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2"
          onClick={handleZoomIn}
          disabled={zoomLevel >= quickZoomLevels[quickZoomLevels.length - 1]}
        >
          <ZoomIn className="w-3 h-3" />
        </Button>

        <Separator orientation="vertical" className="h-4" />

        {/* 视图控制 */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2"
          onClick={handleFitToWindow}
          title="适应窗口"
        >
          <Maximize2 className="w-3 h-3" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2"
          onClick={handleResetZoom}
          title="重置缩放"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>

        <Separator orientation="vertical" className="h-4" />

        {/* 当前主题名称 */}
        <div className="text-xs text-gray-500 min-w-12">
          {themes.find(t => t.name === activeTheme)?.label || '默认'}
        </div>
      </div>
    </div>
  )
}