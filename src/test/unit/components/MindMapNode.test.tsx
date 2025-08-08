import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MindMapNode } from '@/components/mind-map/mind-map-node'

// Mock ReactFlow
vi.mock('@xyflow/react', () => ({
  Handle: ({ children, className, ...props }: React.ComponentProps<'div'>) => (
    <div data-testid="handle" className={className} {...props}>
      {children}
    </div>
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}))

describe('MindMapNode Component', () => {
  const mockNodeProps = {
    id: 'test-node-1',
    data: {
      content: '测试节点内容',
      isEditing: false,
    },
    selected: false,
    dragging: false,
    dragHandle: null,
    type: 'mindMapNode',
    zIndex: 0,
    isConnectable: true,
    xPos: 100,
    yPos: 100,
    width: 200,
    height: 50,
  }

  beforeEach(() => {
    // 清除所有模拟
    vi.clearAllMocks()

    // Mock window.dispatchEvent
    Object.defineProperty(window, 'dispatchEvent', {
      value: vi.fn(),
      writable: true,
    })
  })

  it('应该渲染节点内容', () => {
    render(<MindMapNode {...mockNodeProps} />)
    expect(screen.getByText('测试节点内容')).toBeInTheDocument()
  })

  it('应该渲染隐藏的Handle组件', () => {
    render(<MindMapNode {...mockNodeProps} />)
    const handles = screen.getAllByTestId('handle')

    // 应该有2个handle：left(target) 和 right(source)
    expect(handles).toHaveLength(2)

    // 验证Handle组件有正确的隐藏样式
    handles.forEach(handle => {
      expect(handle).toHaveClass('!opacity-0')
      expect(handle).toHaveClass('!pointer-events-none')
    })
  })

  it('选中状态应该显示蓝色边框', () => {
    const selectedProps = { ...mockNodeProps, selected: true }
    render(<MindMapNode {...selectedProps} />)

    const card = screen.getByText('测试节点内容').closest('[class*="ring-2"]')
    expect(card).toHaveClass('ring-2', 'ring-blue-500', 'shadow-lg')
  })

  it('双击节点应该进入编辑模式', async () => {
    render(<MindMapNode {...mockNodeProps} />)

    const nodeCard = screen.getByText('测试节点内容').closest('div[class*="cursor-pointer"]')
    expect(nodeCard).toBeInTheDocument()

    // 双击进入编辑模式
    fireEvent.doubleClick(nodeCard!)

    // 应该显示输入框
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('编辑模式下按Enter应该保存内容', async () => {
    render(<MindMapNode {...mockNodeProps} />)

    const nodeCard = screen.getByText('测试节点内容').closest('div[class*="cursor-pointer"]')
    fireEvent.doubleClick(nodeCard!)

    const input = screen.getByRole('textbox')

    // 修改内容
    fireEvent.change(input, { target: { value: '更新后的内容' } })

    // 按Enter保存
    fireEvent.keyDown(input, { key: 'Enter' })

    // 验证触发了自定义事件
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'nodeContentUpdate',
        detail: {
          nodeId: 'test-node-1',
          content: '更新后的内容',
        },
      })
    )
  })

  it('编辑模式下按Escape应该取消编辑', async () => {
    render(<MindMapNode {...mockNodeProps} />)

    const nodeCard = screen.getByText('测试节点内容').closest('div[class*="cursor-pointer"]')
    fireEvent.doubleClick(nodeCard!)

    const input = screen.getByRole('textbox')

    // 修改内容
    fireEvent.change(input, { target: { value: '应该被取消的内容' } })

    // 按Escape取消
    fireEvent.keyDown(input, { key: 'Escape' })

    // 应该回到显示模式，显示原始内容
    expect(screen.getByText('测试节点内容')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('编辑模式下失去焦点应该保存内容', async () => {
    render(<MindMapNode {...mockNodeProps} />)

    const nodeCard = screen.getByText('测试节点内容').closest('div[class*="cursor-pointer"]')
    fireEvent.doubleClick(nodeCard!)

    const input = screen.getByRole('textbox')

    // 修改内容
    fireEvent.change(input, { target: { value: '失焦保存的内容' } })

    // 失去焦点
    fireEvent.blur(input)

    // 验证触发了自定义事件
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'nodeContentUpdate',
        detail: {
          nodeId: 'test-node-1',
          content: '失焦保存的内容',
        },
      })
    )
  })

  it('编辑模式应该显示橙色边框', () => {
    const editingProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, isEditing: true },
    }
    render(<MindMapNode {...editingProps} />)

    const card = screen.getByRole('textbox').closest('[class*="ring-2"]')
    expect(card).toHaveClass('ring-2', 'ring-orange-500')
  })
})
