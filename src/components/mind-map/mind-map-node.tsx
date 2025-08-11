'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'
import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export interface MindMapNodeData {
  content: string
  isEditing: boolean
  testId?: string // Test-ID for stable test identification
  nodeRole?: string // Node role: 'root', 'child', 'leaf', 'floating'
  nodeLevel?: number // Node level in the hierarchy (0 for root/floating)
  isFloating?: boolean // Whether this is a floating node
  updateContent?: (nodeId: string, content: string) => void
  toggleEdit?: (nodeId: string, isEditing: boolean) => void
}

export function MindMapNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MindMapNodeData
  const [content, setContent] = useState(nodeData.content)
  const [isEditing, setIsEditing] = useState(nodeData.isEditing || false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleInputBlur = () => {
    setIsEditing(false)
    // 这里可以调用父组件传来的更新函数
    if (content !== nodeData.content) {
      // 暂时通过 window 对象传递，实际项目中会用更好的方式
      const event = new CustomEvent('nodeContentUpdate', {
        detail: { nodeId: id, content },
      })
      window.dispatchEvent(event)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    } else if (e.key === 'Escape') {
      setContent(nodeData.content)
      setIsEditing(false)
    }
  }

  return (
    <>
      {/* 隐藏的连接点，用于自动连线，但不显示手动连接的圆点 */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!opacity-0 !pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!opacity-0 !pointer-events-none"
      />

      <Card
        data-testid={
          // 优先使用TestIdGenerator生成的testId
          nodeData.testId ||
          // 如果没有testId，基于nodeRole判断
          (nodeData.nodeRole === 'root'
            ? 'root'
            : // 如果nodeRole也没有，基于nodeLevel判断
              nodeData.nodeLevel === 0 || nodeData.nodeLevel === undefined
              ? 'root'
              : // 临时fallback，理论上不应该到达这里，因为TestIdGenerator应该生成所有test-id
                `unknown-node-${id}`)
        }
        data-node-role={nodeData.nodeRole}
        data-node-level={nodeData.nodeLevel}
        data-node-floating={nodeData.isFloating || false}
        data-node-selected={selected}
        data-node-editing={isEditing}
        className={`
          min-w-[120px] max-w-[300px] p-3 cursor-pointer transition-all duration-200
          ${selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}
          ${isEditing ? 'ring-2 ring-accent' : ''}
        `}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <Input
            ref={inputRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="border-none p-0 h-auto text-center font-medium"
          />
        ) : (
          <div
            className="text-center font-medium text-sm text-foreground break-words"
            data-node-content
          >
            {content}
          </div>
        )}
      </Card>
    </>
  )
}
