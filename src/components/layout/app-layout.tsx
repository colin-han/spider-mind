'use client'

import { useState } from 'react'
import { TopToolbar } from './top-toolbar'
import { RightPanel } from './right-panel'
import { BottomStatusBar } from './bottom-status-bar'
import { MindMap } from '@/components/mind-map/mind-map'
import { Node, Edge } from '@xyflow/react'

export interface AppLayoutProps {
  children?: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mindMapData, setMindMapData] = useState<{ nodes: Node[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  })
  const [selectedNodeIds] = useState<string[]>([])
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [activeTheme, setActiveTheme] = useState('default')
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)

  const handleMindMapSave = (data: { nodes: Node[]; edges: Edge[] }) => {
    setMindMapData(data)
    setNodeCount(data.nodes.length)
    setEdgeCount(data.edges.length)
    console.log('思维导图数据已更新:', data)
  }

  const handleZoomChange = (level: number) => {
    setZoomLevel(Math.max(10, Math.min(500, level)))
  }

  const handleThemeChange = (theme: string) => {
    setActiveTheme(theme)
  }

  const toggleRightPanel = () => {
    setShowRightPanel(!showRightPanel)
  }

  // 导出功能
  const handleExport = (format: 'png' | 'svg' | 'pdf' | 'json') => {
    console.log('导出格式:', format, '数据:', mindMapData)
    // TODO: 实现实际导出逻辑
  }

  // 导入功能
  const handleImport = (file: File) => {
    console.log('导入文件:', file.name)
    // TODO: 实现实际导入逻辑
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* 顶部工具栏 */}
      <TopToolbar
        onSave={() => handleMindMapSave(mindMapData)}
        onExport={handleExport}
        onImport={handleImport}
        onToggleRightPanel={toggleRightPanel}
        showRightPanel={showRightPanel}
        hasSelection={selectedNodeIds.length > 0}
      />

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 思维导图区域 */}
        <div className="flex-1 relative">
          {children || (
            <MindMap
              onSave={handleMindMapSave}
              className="w-full h-full"
              initialData={mindMapData}
            />
          )}
        </div>

        {/* 右侧面板 */}
        {showRightPanel && (
          <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0">
            <RightPanel
              selectedNodeIds={selectedNodeIds}
              activeTheme={activeTheme}
              onThemeChange={handleThemeChange}
            />
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <BottomStatusBar
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        nodeCount={nodeCount}
        edgeCount={edgeCount}
        activeTheme={activeTheme}
        onThemeChange={handleThemeChange}
      />
    </div>
  )
}
