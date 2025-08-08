import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MindMapsListPage from '@/app/mindmaps/page'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/mindmaps',
}))

// Mock fetch
global.fetch = vi.fn()

const mockMindMaps = [
  {
    id: '1',
    title: '测试思维导图1',
    content: {
      nodes: [{ id: 'node1' }, { id: 'node2' }],
      edges: [],
    },
    created_at: '2025-01-01T10:00:00.000Z',
    updated_at: '2025-01-01T11:00:00.000Z',
  },
  {
    id: '2',
    title: '测试思维导图2',
    content: {
      nodes: [{ id: 'node1' }],
      edges: [],
    },
    created_at: '2025-01-01T09:00:00.000Z',
    updated_at: '2025-01-01T10:30:00.000Z',
  },
]

describe('MindMapsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 默认成功响应
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        success: true,
        data: mockMindMaps,
      }),
    } as Response)
  })

  it('应该渲染思维导图列表页面', async () => {
    render(<MindMapsListPage />)

    // 检查标题
    expect(screen.getByText('思维导图')).toBeInTheDocument()
    expect(screen.getByText('管理和创建你的思维导图')).toBeInTheDocument()

    // 检查新建按钮
    expect(screen.getByText('新建思维导图')).toBeInTheDocument()

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('测试思维导图1')).toBeInTheDocument()
      expect(screen.getByText('测试思维导图2')).toBeInTheDocument()
    })

    // 检查节点数量显示
    expect(screen.getByText('2 个节点')).toBeInTheDocument()
    expect(screen.getByText('1 个节点')).toBeInTheDocument()

    // 检查统计信息
    expect(screen.getByText('共 2 个思维导图')).toBeInTheDocument()
  })

  it('应该显示加载状态', () => {
    render(<MindMapsListPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('应该支持搜索功能', async () => {
    render(<MindMapsListPage />)

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('测试思维导图1')).toBeInTheDocument()
    })

    // 搜索功能
    const searchInput = screen.getByPlaceholderText('搜索思维导图...')
    fireEvent.change(searchInput, { target: { value: '测试思维导图1' } })

    await waitFor(() => {
      expect(screen.getByText('测试思维导图1')).toBeInTheDocument()
      expect(screen.queryByText('测试思维导图2')).not.toBeInTheDocument()
    })

    // 检查搜索结果统计
    expect(screen.getByText(', 显示 1 个匹配结果')).toBeInTheDocument()
  })

  it('应该处理空搜索结果', async () => {
    render(<MindMapsListPage />)

    await waitFor(() => {
      expect(screen.getByText('测试思维导图1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('搜索思维导图...')
    fireEvent.change(searchInput, { target: { value: '不存在的思维导图' } })

    await waitFor(() => {
      expect(screen.getByText('未找到匹配的思维导图')).toBeInTheDocument()
      expect(screen.getByText('尝试调整搜索关键词')).toBeInTheDocument()
    })
  })

  it('应该支持创建新思维导图', async () => {
    const createResponse = {
      success: true,
      data: {
        id: '3',
        title: '新思维导图',
        content: { nodes: [], edges: [] },
      },
    }

    const listResponse = {
      success: true,
      data: [...mockMindMaps, createResponse.data],
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockMindMaps }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => createResponse,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => listResponse,
      } as Response)

    render(<MindMapsListPage />)

    await waitFor(() => {
      expect(screen.getByText('测试思维导图1')).toBeInTheDocument()
    })

    // 点击新建按钮
    const createButton = screen.getByText('新建思维导图')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/mindmaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('新思维导图'),
      })
    })
  })

  it('应该处理加载错误', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('网络错误'))

    render(<MindMapsListPage />)

    // 应该显示空状态而不是错误
    await waitFor(() => {
      expect(screen.getByText('还没有思维导图')).toBeInTheDocument()
    })
  })

  it('应该显示空状态', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        success: true,
        data: [],
      }),
    } as Response)

    render(<MindMapsListPage />)

    await waitFor(() => {
      expect(screen.getByText('还没有思维导图')).toBeInTheDocument()
      expect(screen.getByText('创建你的第一个思维导图开始使用')).toBeInTheDocument()
      expect(screen.getByText('创建第一个思维导图')).toBeInTheDocument()
    })
  })

  it('应该正确格式化日期', async () => {
    render(<MindMapsListPage />)

    await waitFor(() => {
      // 检查日期是否正确显示 (具体格式取决于locale设置)
      expect(screen.getByText('测试思维导图1')).toBeInTheDocument()
    })

    // 日期格式化可能因环境而异，这里只检查是否有日期相关内容
    const dateElements = screen.getAllByText(/2025/)
    expect(dateElements.length).toBeGreaterThan(0)
  })
})