'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Type, Palette, Brush, Layout } from 'lucide-react'

export interface RightPanelProps {
  selectedNodeIds: string[]
  activeTheme: string
  onThemeChange: (theme: string) => void
}

export function RightPanel({ selectedNodeIds }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('format')

  return (
    <div className="h-full flex flex-col">
      {/* 面板标题 */}
      <div className="h-12 px-4 flex items-center border-b border-gray-200">
        <span className="font-medium text-gray-800">属性面板</span>
      </div>

      {/* 选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mx-2 mt-2">
          <TabsTrigger value="format" className="flex items-center gap-1">
            <Type className="w-3 h-3" />
            <span className="hidden sm:inline">格式</span>
          </TabsTrigger>
          <TabsTrigger value="color" className="flex items-center gap-1">
            <Palette className="w-3 h-3" />
            <span className="hidden sm:inline">颜色</span>
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-1">
            <Brush className="w-3 h-3" />
            <span className="hidden sm:inline">样式</span>
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-1">
            <Layout className="w-3 h-3" />
            <span className="hidden sm:inline">布局</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 格式面板 */}
          <TabsContent value="format" className="space-y-4 mt-0">
            <FormatPanel selectedNodeIds={selectedNodeIds} />
          </TabsContent>

          {/* 颜色面板 */}
          <TabsContent value="color" className="space-y-4 mt-0">
            <ColorPanel />
          </TabsContent>

          {/* 样式面板 */}
          <TabsContent value="style" className="space-y-4 mt-0">
            <StylePanel />
          </TabsContent>

          {/* 布局面板 */}
          <TabsContent value="layout" className="space-y-4 mt-0">
            <LayoutPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

// 格式面板组件
function FormatPanel({ selectedNodeIds }: { selectedNodeIds: string[] }) {
  return (
    <>
      <Card className="p-3">
        <h3 className="font-medium mb-3">文本格式</h3>
        {selectedNodeIds.length === 0 ? (
          <p className="text-sm text-gray-500">选择节点以编辑格式</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">字体大小</label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  12
                </Button>
                <Button variant="outline" size="sm">
                  14
                </Button>
                <Button variant="outline" size="sm">
                  16
                </Button>
                <Button variant="outline" size="sm">
                  18
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-1 block">字体样式</label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  B
                </Button>
                <Button variant="outline" size="sm">
                  I
                </Button>
                <Button variant="outline" size="sm">
                  U
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-3">
        <h3 className="font-medium mb-3">节点形状</h3>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="h-8">
            矩形
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            圆形
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            菱形
          </Button>
        </div>
      </Card>
    </>
  )
}

// 颜色面板组件
function ColorPanel() {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FECA57',
    '#FF9FF3',
    '#54A0FF',
    '#5F27CD',
    '#00D2D3',
    '#FF9F43',
    '#C44569',
    '#F8B500',
    '#6C5CE7',
    '#A29BFE',
    '#FD79A8',
  ]

  return (
    <>
      <Card className="p-3">
        <h3 className="font-medium mb-3">节点颜色</h3>
        <div className="grid grid-cols-5 gap-2">
          {colors.map((color, index) => (
            <button
              key={index}
              className="w-8 h-8 rounded-md border-2 border-gray-200 hover:border-gray-400"
              style={{ backgroundColor: color }}
              onClick={() => console.log('颜色选择:', color)}
            />
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <h3 className="font-medium mb-3">连线颜色</h3>
        <div className="grid grid-cols-5 gap-2">
          {colors.slice(0, 10).map((color, index) => (
            <button
              key={index}
              className="w-8 h-8 rounded-md border-2 border-gray-200 hover:border-gray-400"
              style={{ backgroundColor: color }}
              onClick={() => console.log('连线颜色选择:', color)}
            />
          ))}
        </div>
      </Card>
    </>
  )
}

// 样式面板组件
function StylePanel() {
  const themes = [
    { name: '默认', preview: 'bg-gradient-to-r from-blue-500 to-purple-600' },
    { name: '商务', preview: 'bg-gradient-to-r from-gray-500 to-blue-600' },
    { name: '清新', preview: 'bg-gradient-to-r from-green-400 to-blue-500' },
    { name: '暖色', preview: 'bg-gradient-to-r from-orange-400 to-pink-400' },
    { name: '冷色', preview: 'bg-gradient-to-r from-cyan-500 to-blue-500' },
  ]

  return (
    <>
      <Card className="p-3">
        <h3 className="font-medium mb-3">主题模板</h3>
        <div className="space-y-2">
          {themes.map((theme, index) => (
            <button
              key={index}
              className="w-full p-2 rounded-lg border hover:border-blue-500 flex items-center gap-3"
              onClick={() => console.log('主题选择:', theme.name)}
            >
              <div className={`w-4 h-4 rounded ${theme.preview}`} />
              <span className="text-sm">{theme.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <h3 className="font-medium mb-3">边框样式</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            实线
          </Button>
          <Button variant="outline" className="w-full justify-start">
            虚线
          </Button>
          <Button variant="outline" className="w-full justify-start">
            点线
          </Button>
        </div>
      </Card>
    </>
  )
}

// 布局面板组件
function LayoutPanel() {
  return (
    <>
      <Card className="p-3">
        <h3 className="font-medium mb-3">布局方式</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            向右分布
          </Button>
          <Button variant="outline" className="w-full justify-start">
            向下分布
          </Button>
          <Button variant="outline" className="w-full justify-start">
            鱼骨图
          </Button>
          <Button variant="outline" className="w-full justify-start">
            组织架构
          </Button>
        </div>
      </Card>

      <Card className="p-3">
        <h3 className="font-medium mb-3">对齐方式</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">
            左对齐
          </Button>
          <Button variant="outline" size="sm">
            居中
          </Button>
          <Button variant="outline" size="sm">
            右对齐
          </Button>
          <Button variant="outline" size="sm">
            分散
          </Button>
        </div>
      </Card>
    </>
  )
}
