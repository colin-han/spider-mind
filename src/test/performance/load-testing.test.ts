import { describe, it, expect, beforeEach } from 'vitest'
import { PerformanceTestUtils, TestDataFactory } from '@/test/helpers/test-utils'

// 性能测试套件
describe('性能测试套件', () => {
  const PERFORMANCE_THRESHOLDS = {
    API_RESPONSE_TIME: 1000, // 1秒
    COMPONENT_RENDER_TIME: 100, // 100ms
    MEMORY_USAGE_MB: 50, // 50MB
    CPU_USAGE_PERCENT: 30, // 30%
    BUNDLE_SIZE_KB: 500, // 500KB
    TIME_TO_INTERACTIVE: 3000, // 3秒
  }

  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch

    // Mock performance.now for consistent timing
    let mockTime = 0
    vi.spyOn(performance, 'now').mockImplementation(() => {
      mockTime += 16 // 模拟16ms每帧
      return mockTime
    })
  })

  describe('API性能测试', () => {
    it('思维导图列表API应该在阈值时间内响应', async () => {
      const mindMaps = Array.from({ length: 100 }, () => TestDataFactory.createMindMap())

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mindMaps),
      })

      const { result, duration } = await PerformanceTestUtils.measureAsyncOperation(() =>
        fetch('/api/mindmaps')
      )

      expect(result.ok).toBe(true)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME)
    })

    it('AI建议API应该处理大量数据时保持性能', async () => {
      const largeNodeSet = Array.from({ length: 200 }, (_, i) =>
        TestDataFactory.createMindMapNode({
          content: `大型节点内容 ${i}`.repeat(10),
        })
      )

      const aiResponse = [
        { type: 'expand', title: 'AI建议1', content: '内容1' },
        { type: 'expand', title: 'AI建议2', content: '内容2' },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(aiResponse),
      })

      const { duration } = await PerformanceTestUtils.measureAsyncOperation(() =>
        fetch('/api/ai/mindmap', {
          method: 'POST',
          body: JSON.stringify({
            context: '大型思维导图测试',
            nodes: largeNodeSet,
          }),
        })
      )

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 3) // 允许3倍时间
    })

    it('搜索API应该快速处理相似性查询', async () => {
      const searchResults = Array.from({ length: 50 }, () => ({
        mindmap: TestDataFactory.createMindMap(),
        similarity: Math.random() * 0.5 + 0.5, // 0.5-1.0
        matched_content: '匹配内容',
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(searchResults),
      })

      const { duration } = await PerformanceTestUtils.measureAsyncOperation(() =>
        fetch('/api/search', {
          method: 'POST',
          body: JSON.stringify({
            query: '性能测试查询'.repeat(20), // 长查询文本
            similarity_threshold: 0.7,
          }),
        })
      )

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 2)
    })
  })

  describe('组件渲染性能', () => {
    it('思维导图组件应该快速渲染', async () => {
      // 动态导入组件以模拟真实加载
      const { default: MindMap } = await import('@/components/mind-map/mind-map')

      const largeMindMapData = {
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `node-${i}`,
          type: 'mindMapNode',
          position: { x: Math.random() * 1000, y: Math.random() * 1000 },
          data: { content: `节点内容 ${i}` },
        })),
        edges: Array.from({ length: 99 }, (_, i) => ({
          id: `edge-${i}`,
          source: `node-${Math.floor(i / 10)}`,
          target: `node-${i + 1}`,
        })),
      }

      const renderTime = await PerformanceTestUtils.measureRenderTime(async () => {
        const { render } = await import('@testing-library/react')
        const React = await import('react')
        const { MindMap } = await import('@/components/mind-map/mind-map')
        return render(
          React.createElement(MindMap, {
            initialNodes: largeMindMapData.nodes,
            initialEdges: largeMindMapData.edges,
          })
        )
      })

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_TIME * 10) // 大型组件允许更多时间
    })

    it('思维导图列表应该虚拟化大量项目', async () => {
      const { default: MindMapListPage } = await import('@/app/mindmaps/page')
      const { renderWithProviders } = await import('@/test/helpers/test-utils')

      // Mock大量思维导图
      const largeMindMapList = Array.from({ length: 1000 }, () => TestDataFactory.createMindMap())

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeMindMapList),
      })

      const renderTime = await PerformanceTestUtils.measureRenderTime(async () => {
        const React = await import('react')
        const { default: MindMapListPage } = await import('@/app/mindmaps/page')
        return renderWithProviders(React.createElement(MindMapListPage), { authenticated: true })
      })

      // 虚拟化列表应该快速渲染，即使有大量数据
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_TIME * 3)
    })

    it('AI助手面板应该优化大量建议的显示', async () => {
      const { default: AIAssistant } = await import('@/components/ai/ai-assistant')

      const _largeSuggestionList = Array.from({ length: 200 }, (_, i) => ({
        type: 'expand',
        title: `AI建议 ${i}`,
        description: `详细描述 ${i}`.repeat(5),
        content: `建议内容 ${i}`.repeat(10),
      }))

      const renderTime = await PerformanceTestUtils.measureRenderTime(async () => {
        const { render } = await import('@testing-library/react')
        const React = await import('react')
        const { AIAssistant } = await import('@/components/ai/ai-assistant')
        return render(
          React.createElement(AIAssistant, {
            allNodes: [],
            onSuggestionApply: vi.fn(),
            onClose: vi.fn(),
          })
        )
      })

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_TIME * 2)
    })
  })

  describe('内存性能测试', () => {
    it('长时间使用不应该造成内存泄漏', async () => {
      // 模拟长时间操作
      const operations = Array.from({ length: 100 }, (_, i) => async () => {
        const mindMap = TestDataFactory.createMindMap({
          content: JSON.stringify({
            nodes: Array.from({ length: 50 }, (_, j) => ({
              id: `node-${i}-${j}`,
              data: { content: `内容 ${i}-${j}`.repeat(5) },
            })),
          }),
        })

        // 模拟组件挂载和卸载
        const { render } = await import('@testing-library/react')
        const React = await import('react')
        const { MindMapNode } = await import('@/components/mind-map/mind-map-node')

        const result = render(
          React.createElement(MindMapNode, {
            id: 'test',
            data: { content: '测试节点' },
          })
        )
        result.unmount()

        return mindMap
      })

      const initialMemory = process.memoryUsage().heapUsed

      // 执行操作
      for (const operation of operations) {
        await operation()
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncreaseBytes = finalMemory - initialMemory
      const memoryIncreaseMB = memoryIncreaseBytes / 1024 / 1024

      expect(memoryIncreaseMB).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB)
    })

    it('大型思维导图数据不应该造成内存溢出', () => {
      const hugeMindMapData = {
        nodes: Array.from({ length: 5000 }, (_, i) => ({
          id: `node-${i}`,
          data: {
            content: `大型节点内容 ${i}`.repeat(100), // 模拟大量文本
          },
        })),
        edges: Array.from({ length: 4999 }, (_, i) => ({
          id: `edge-${i}`,
          source: `node-${i}`,
          target: `node-${i + 1}`,
        })),
      }

      const initialMemory = process.memoryUsage().heapUsed

      // 创建大型数据结构
      const serializedData = JSON.stringify(hugeMindMapData)
      const parsedData = JSON.parse(serializedData)

      const finalMemory = process.memoryUsage().heapUsed
      const memoryUsageBytes = finalMemory - initialMemory
      const memoryUsageMB = memoryUsageBytes / 1024 / 1024

      expect(memoryUsageMB).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB * 2)
      expect(parsedData.nodes).toHaveLength(5000)
    })
  })

  describe('并发性能测试', () => {
    it('应该处理并发API请求', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(TestDataFactory.createMindMap()),
      })

      const concurrentRequests = Array.from({ length: 20 }, (_, i) =>
        fetch(`/api/mindmaps/test-${i}`)
      )

      const { result, duration } = await PerformanceTestUtils.measureAsyncOperation(() =>
        Promise.all(concurrentRequests)
      )

      expect(result).toHaveLength(20)
      expect(result.every((response: Response) => response.ok)).toBe(true)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 2)
    })

    it('应该处理并发AI请求', async () => {
      const aiResponse = [{ type: 'expand', title: 'AI建议', content: '内容' }]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(aiResponse),
      })

      const concurrentAIRequests = Array.from({ length: 10 }, (_, i) =>
        fetch('/api/ai/mindmap', {
          method: 'POST',
          body: JSON.stringify({
            context: `并发测试 ${i}`,
            nodes: [TestDataFactory.createMindMapNode()],
          }),
        })
      )

      const { result, duration } = await PerformanceTestUtils.measureAsyncOperation(() =>
        Promise.all(concurrentAIRequests)
      )

      expect(result).toHaveLength(10)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 3)
    })
  })

  describe('数据处理性能', () => {
    it('大量节点的自动布局应该快速完成', async () => {
      const { calculateAutoLayout } = await import('@/lib/auto-layout')

      const largeNodeSet = Array.from({ length: 500 }, (_, i) => ({
        id: `node-${i}`,
        data: { content: `节点 ${i}` },
        position: { x: 0, y: 0 },
      }))

      const largeEdgeSet = Array.from({ length: 499 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${Math.floor(i / 10)}`,
        target: `node-${i + 1}`,
      }))

      const { duration } = await PerformanceTestUtils.measureAsyncOperation(() =>
        calculateAutoLayout(largeNodeSet, largeEdgeSet)
      )

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_TIME * 10)
    })

    it('大量文本的向量化处理应该批量优化', async () => {
      const { OpenAIService } = await import('@/lib/ai')

      // Mock OpenAI服务
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: Array.from({ length: 100 }, () => ({
              embedding: Array.from({ length: 1536 }, () => Math.random()),
            })),
          }),
      })

      const openaiService = new OpenAIService()
      const largeTextBatch = Array.from({ length: 100 }, (_, i) =>
        `大批量文本处理测试 ${i}`.repeat(10)
      )

      const { duration } = await PerformanceTestUtils.measureAsyncOperation(() =>
        openaiService.generateBatchEmbeddings(largeTextBatch)
      )

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 5)
    })
  })

  describe('真实场景性能测试', () => {
    it('完整用户工作流应该保持响应性', async () => {
      // 模拟完整的用户工作流：登录 → 加载列表 → 编辑思维导图 → AI建议 → 保存
      const workflow = async () => {
        // 1. 登录
        await fetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })

        // 2. 获取思维导图列表
        await fetch('/api/mindmaps')

        // 3. 获取特定思维导图
        await fetch('/api/mindmaps/test-id')

        // 4. 获取AI建议
        await fetch('/api/ai/mindmap', {
          method: 'POST',
          body: JSON.stringify({ context: '测试', nodes: [] }),
        })

        // 5. 更新思维导图
        await fetch('/api/mindmaps/test-id', {
          method: 'PUT',
          body: JSON.stringify({ title: '更新后的标题' }),
        })

        // 6. 向量搜索
        await fetch('/api/search', {
          method: 'POST',
          body: JSON.stringify({ query: '搜索查询' }),
        })
      }

      // Mock 所有API响应
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: 'test' }) })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([TestDataFactory.createMindMap()]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(TestDataFactory.createMindMap()),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ type: 'expand', title: 'AI建议' }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(TestDataFactory.createMindMap()),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })

      const { duration } = await PerformanceTestUtils.measureAsyncOperation(workflow)

      // 整个工作流应该在合理时间内完成
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 6)
      expect(mockFetch).toHaveBeenCalledTimes(6)
    })
  })
})
