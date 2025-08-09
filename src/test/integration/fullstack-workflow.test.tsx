import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, TestDataFactory } from '@/test/helpers/test-utils'
import MindMapListPage from '@/app/mindmaps/page'

// 全栈工作流集成测试
describe('全栈工作流集成测试', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('用户完整工作流', () => {
    it('应该支持用户从登录到创建思维导图的完整流程', async () => {
      const _user = userEvent.setup()
      const testUser = TestDataFactory.createUser()

      // Step 1: Mock 登录API响应
      const loginResponse = {
        user: testUser,
        access_token: 'test_token_123',
        expires_in: 3600,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginResponse),
      })

      // Step 2: Mock 思维导图列表API响应
      const mindMapsList = [
        TestDataFactory.createMindMap({ title: '现有思维导图1' }),
        TestDataFactory.createMindMap({ title: '现有思维导图2' }),
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mindMapsList),
      })

      // Step 3: Mock 创建新思维导图API响应
      const newMindMap = TestDataFactory.createMindMap({
        title: '新创建的思维导图',
        user_id: testUser.id,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newMindMap),
      })

      // 渲染思维导图列表页面
      const { mockAuthContextValue: _mockAuthContextValue } = renderWithProviders(
        <MindMapListPage />,
        {
          authenticated: true,
          user: testUser,
        }
      )

      // 验证页面加载
      await waitFor(() => {
        expect(screen.getByText('思维导图')).toBeInTheDocument()
      })

      // 验证现有思维导图显示
      await waitFor(() => {
        expect(screen.getByText('现有思维导图1')).toBeInTheDocument()
        expect(screen.getByText('现有思维导图2')).toBeInTheDocument()
      })

      // 点击创建新思维导图
      const createButton = screen.getByText('新建思维导图')
      await user.click(createButton)

      // 验证API调用
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/mindmaps',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })
    })

    it('应该支持思维导图编辑和保存工作流', async () => {
      const _user = userEvent.setup()
      const testUser = TestDataFactory.createUser()
      const existingMindMap = TestDataFactory.createMindMap({
        title: '待编辑的思维导图',
        content: JSON.stringify({
          nodes: [
            { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { content: '中心主题' } },
          ],
          edges: [],
        }),
      })

      // Mock 获取思维导图详情
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(existingMindMap),
      })

      // Mock 更新思维导图
      const updatedMindMap = {
        ...existingMindMap,
        title: '更新后的标题',
        updated_at: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedMindMap),
      })

      // 渲染思维导图编辑页面
      const _MindMapDetailPage = (await import('@/app/mindmaps/[id]/page')).default

      // Mock useParams
      vi.mock('next/navigation', () => ({
        useParams: () => ({ id: existingMindMap.id }),
        useRouter: () => ({
          push: vi.fn(),
          back: vi.fn(),
          refresh: vi.fn(),
        }),
      }))

      renderWithProviders(<_MindMapDetailPage />, { authenticated: true, user: testUser })

      // 等待页面加载
      await waitFor(() => {
        expect(screen.getByDisplayValue('待编辑的思维导图')).toBeInTheDocument()
      })

      // 修改标题
      const titleInput = screen.getByDisplayValue('待编辑的思维导图')
      await user.clear(titleInput)
      await user.type(titleInput, '更新后的标题')

      // 点击保存
      const saveButton = screen.getByText('保存')
      await user.click(saveButton)

      // 验证保存API调用
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/mindmaps/${existingMindMap.id}`,
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('更新后的标题'),
          })
        )
      })
    })

    it('应该支持AI助手功能工作流', async () => {
      const _user = userEvent.setup()
      const testUser = TestDataFactory.createUser()
      const mindMapWithNode = TestDataFactory.createMindMap({
        content: JSON.stringify({
          nodes: [{ id: '1', data: { content: '人工智能' } }],
          edges: [],
        }),
      })

      // Mock AI建议API响应
      const aiSuggestions = [
        {
          type: 'expand',
          title: '机器学习',
          description: 'AI的核心分支',
          content: '包含监督学习、无监督学习、强化学习',
        },
        {
          type: 'expand',
          title: '深度学习',
          description: '神经网络的高级应用',
          content: '卷积神经网络、循环神经网络、变换器',
        },
      ]

      mockFetch
        // Mock 获取思维导图
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mindMapWithNode),
        })
        // Mock AI建议API
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(aiSuggestions),
        })

      // 渲染思维导图编辑页面
      const _MindMapDetailPage = (await import('@/app/mindmaps/[id]/page')).default

      renderWithProviders(<_MindMapDetailPage />, { authenticated: true, user: testUser })

      // 等待页面加载
      await waitFor(() => {
        expect(screen.getByText('人工智能')).toBeInTheDocument()
      })

      // 打开AI助手
      const aiAssistantButton = screen.getByText('AI助手')
      await user.click(aiAssistantButton)

      // 验证AI助手面板打开
      await waitFor(() => {
        expect(screen.getByText('扩展节点')).toBeInTheDocument()
      })

      // 点击获取AI建议
      const generateButton = screen.getByText('获取AI建议')
      await user.click(generateButton)

      // 验证AI API调用
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/ai/mindmap',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('人工智能'),
          })
        )
      })

      // 验证AI建议显示
      await waitFor(() => {
        expect(screen.getByText('机器学习')).toBeInTheDocument()
        expect(screen.getByText('深度学习')).toBeInTheDocument()
      })
    })

    it('应该支持搜索和发现工作流', async () => {
      const _user = userEvent.setup()
      const testUser = TestDataFactory.createUser()

      // Mock 搜索API响应
      const searchResults = [
        {
          mindmap: TestDataFactory.createMindMap({ title: 'AI基础概念' }),
          similarity: 0.95,
          matched_content: '人工智能、机器学习',
        },
        {
          mindmap: TestDataFactory.createMindMap({ title: 'AI应用场景' }),
          similarity: 0.87,
          matched_content: '自然语言处理、计算机视觉',
        },
      ]

      mockFetch
        // Mock 初始思维导图列表
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        // Mock 搜索API
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(searchResults),
        })

      // 渲染思维导图列表页面
      renderWithProviders(<MindMapListPage />, { authenticated: true, user: testUser })

      // 等待页面加载
      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索思维导图...')).toBeInTheDocument()
      })

      // 执行搜索
      const searchInput = screen.getByPlaceholderText('搜索思维导图...')
      await user.type(searchInput, '人工智能')
      await user.keyboard('{Enter}')

      // 验证搜索API调用
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/search',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('人工智能'),
          })
        )
      })

      // 验证搜索结果显示
      await waitFor(() => {
        expect(screen.getByText('AI基础概念')).toBeInTheDocument()
        expect(screen.getByText('AI应用场景')).toBeInTheDocument()
      })
    })
  })

  describe('错误处理和用户体验', () => {
    it('应该优雅处理网络错误', async () => {
      const _user = userEvent.setup()
      const testUser = TestDataFactory.createUser()

      // Mock 网络错误
      mockFetch.mockRejectedValueOnce(new Error('Network Error'))

      renderWithProviders(<MindMapListPage />, { authenticated: true, user: testUser })

      // 等待错误处理
      await waitFor(() => {
        expect(screen.getByText(/网络连接错误|加载失败/)).toBeInTheDocument()
      })
    })

    it('应该处理API错误响应', async () => {
      const testUser = TestDataFactory.createUser()

      // Mock API错误响应
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: 'Internal Server Error',
            message: '服务器暂时不可用',
          }),
      })

      renderWithProviders(<MindMapListPage />, { authenticated: true, user: testUser })

      // 验证错误消息显示
      await waitFor(() => {
        expect(screen.getByText(/服务器暂时不可用|加载失败/)).toBeInTheDocument()
      })
    })

    it('应该在未认证时重定向到登录页', async () => {
      const mockRouter = {
        push: vi.fn(),
        back: vi.fn(),
        refresh: vi.fn(),
      }

      // Mock useRouter
      vi.mocked(vi.importMock('next/navigation')).mockReturnValue({
        useRouter: () => mockRouter,
        usePathname: () => '/mindmaps',
        useSearchParams: () => new URLSearchParams(),
      })

      // 渲染未认证的页面
      renderWithProviders(<MindMapListPage />, { authenticated: false })

      // 验证重定向到登录页
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('性能和用户体验优化', () => {
    it('应该实现加载状态和骨架屏', async () => {
      const testUser = TestDataFactory.createUser()

      // Mock 慢速API响应
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve([]),
                }),
              1000
            )
          )
      )

      renderWithProviders(<MindMapListPage />, { authenticated: true, user: testUser })

      // 验证加载状态显示
      expect(screen.getByTestId(/loading|skeleton/)).toBeInTheDocument()

      // 等待加载完成
      await waitFor(
        () => {
          expect(screen.queryByTestId(/loading|skeleton/)).not.toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })

    it('应该支持乐观更新', async () => {
      const _user = userEvent.setup()
      const testUser = TestDataFactory.createUser()
      const existingMindMap = TestDataFactory.createMindMap()

      // Mock 慢速更新API
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(existingMindMap),
        })
        .mockImplementation(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: () =>
                      Promise.resolve({
                        ...existingMindMap,
                        title: '乐观更新标题',
                      }),
                  }),
                1000
              )
            )
        )

      const _MindMapDetailPage = (await import('@/app/mindmaps/[id]/page')).default

      renderWithProviders(<_MindMapDetailPage />, { authenticated: true, user: testUser })

      await waitFor(() => {
        expect(screen.getByDisplayValue(existingMindMap.title)).toBeInTheDocument()
      })

      // 修改标题
      const titleInput = screen.getByDisplayValue(existingMindMap.title)
      await user.clear(titleInput)
      await user.type(titleInput, '乐观更新标题')

      // 点击保存
      const saveButton = screen.getByText('保存')
      await user.click(saveButton)

      // 验证乐观更新：界面立即更新，无需等待API响应
      expect(screen.getByDisplayValue('乐观更新标题')).toBeInTheDocument()
    })
  })

  describe('数据流和状态管理', () => {
    it('应该正确管理全局状态更新', async () => {
      const _user = userEvent.setup()
      const testUser = TestDataFactory.createUser()
      const initialMindMaps = [
        TestDataFactory.createMindMap({ title: '初始思维导图1' }),
        TestDataFactory.createMindMap({ title: '初始思维导图2' }),
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialMindMaps),
        })
        // Mock 创建新思维导图
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(TestDataFactory.createMindMap({ title: '新创建的思维导图' })),
        })

      renderWithProviders(<MindMapListPage />, { authenticated: true, user: testUser })

      // 验证初始状态
      await waitFor(() => {
        expect(screen.getByText('初始思维导图1')).toBeInTheDocument()
        expect(screen.getByText('初始思维导图2')).toBeInTheDocument()
      })

      // 创建新思维导图
      const createButton = screen.getByText('新建思维导图')
      await user.click(createButton)

      // 验证状态更新：新思维导图应该出现在列表中
      await waitFor(() => {
        expect(screen.getByText('新创建的思维导图')).toBeInTheDocument()
      })

      // 验证总数更新
      expect(screen.getByText(/共 3 个思维导图/)).toBeInTheDocument()
    })
  })
})
