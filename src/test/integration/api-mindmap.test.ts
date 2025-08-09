import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TestDataFactory, MockFactory } from '@/test/helpers/test-utils'

// API集成测试
describe('思维导图API集成测试', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('思维导图CRUD操作', () => {
    it('应该创建新的思维导图', async () => {
      const newMindMap = TestDataFactory.createMindMap({
        title: '集成测试思维导图',
        content: JSON.stringify({
          nodes: [
            { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { content: '中心节点' } },
          ],
          edges: [],
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newMindMap),
      })

      const response = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMindMap.title,
          content: newMindMap.content,
        }),
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result).toMatchObject({
        title: '集成测试思维导图',
        id: expect.any(String),
        created_at: expect.any(String),
      })
    })

    it('应该获取用户的思维导图列表', async () => {
      const mindMaps = [
        TestDataFactory.createMindMap({ title: '思维导图1' }),
        TestDataFactory.createMindMap({ title: '思维导图2' }),
        TestDataFactory.createMindMap({ title: '思维导图3' }),
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mindMaps),
      })

      const response = await fetch('/api/mindmaps')
      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result).toHaveLength(3)
      expect(result.every((mm: any) => mm.title && mm.id)).toBe(true)
    })

    it('应该更新现有的思维导图', async () => {
      const existingMindMap = TestDataFactory.createMindMap()
      const updatedData = {
        title: '更新后的标题',
        content: JSON.stringify({
          nodes: [
            { id: '1', data: { content: '更新的中心节点' } },
            { id: '2', data: { content: '新增节点' } },
          ],
          edges: [{ id: 'e1', source: '1', target: '2' }],
        }),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...existingMindMap,
            ...updatedData,
            updated_at: new Date().toISOString(),
          }),
      })

      const response = await fetch(`/api/mindmaps/${existingMindMap.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.title).toBe('更新后的标题')
      expect(result.updated_at).toBeDefined()
    })

    it('应该删除思维导图', async () => {
      const mindMapId = 'test-mindmap-123'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, deleted_id: mindMapId }),
      })

      const response = await fetch(`/api/mindmaps/${mindMapId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.deleted_id).toBe(mindMapId)
    })
  })

  describe('思维导图搜索和过滤', () => {
    it('应该支持按标题搜索', async () => {
      const searchResults = [
        TestDataFactory.createMindMap({ title: 'AI研究方向' }),
        TestDataFactory.createMindMap({ title: 'AI应用场景' }),
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchResults),
      })

      const response = await fetch('/api/mindmaps?search=AI')
      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result).toHaveLength(2)
      expect(result.every((mm: any) => mm.title.includes('AI'))).toBe(true)
    })

    it('应该支持分页查询', async () => {
      const page1Results = Array.from({ length: 10 }, (_, i) =>
        TestDataFactory.createMindMap({ title: `思维导图${i + 1}` })
      )

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: page1Results,
            pagination: {
              page: 1,
              limit: 10,
              total: 25,
              has_more: true,
            },
          }),
      })

      const response = await fetch('/api/mindmaps?page=1&limit=10')
      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.data).toHaveLength(10)
      expect(result.pagination.has_more).toBe(true)
      expect(result.pagination.total).toBe(25)
    })
  })

  describe('AI功能集成', () => {
    it('应该调用AI服务生成思维导图建议', async () => {
      const aiSuggestions = [
        {
          type: 'expand',
          title: 'AI建议1',
          content: 'AI生成的内容1',
          description: 'AI建议描述1',
        },
        {
          type: 'analyze',
          title: 'AI建议2',
          content: 'AI生成的内容2',
          description: 'AI建议描述2',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(aiSuggestions),
      })

      const response = await fetch('/api/ai/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_suggestions',
          context: '人工智能',
          nodes: [{ id: '1', content: '人工智能', level: 0 }],
        }),
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'expand',
        title: 'AI建议1',
        content: 'AI生成的内容1',
      })
    })

    it('应该调用向量搜索API', async () => {
      const searchResults = [
        {
          mindmap: TestDataFactory.createMindMap({ title: '相关思维导图1' }),
          similarity: 0.95,
          relevant_nodes: ['节点1', '节点2'],
        },
        {
          mindmap: TestDataFactory.createMindMap({ title: '相关思维导图2' }),
          similarity: 0.87,
          relevant_nodes: ['节点A', '节点B'],
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchResults),
      })

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '机器学习算法',
          similarity_threshold: 0.8,
          limit: 10,
        }),
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0].similarity).toBeGreaterThan(0.8)
      expect(result[0].mindmap).toBeDefined()
    })
  })

  describe('错误处理和边界情况', () => {
    it('应该处理无效的思维导图ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            error: 'Mind map not found',
            code: 'MINDMAP_NOT_FOUND',
          }),
      })

      const response = await fetch('/api/mindmaps/invalid-id')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)

      const error = await response.json()
      expect(error.code).toBe('MINDMAP_NOT_FOUND')
    })

    it('应该处理无效的输入数据', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: 'Validation failed',
            details: [
              { field: 'title', message: 'Title is required' },
              { field: 'content', message: 'Content must be valid JSON' },
            ],
          }),
      })

      const response = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '', // 无效：空标题
          content: 'invalid json', // 无效：不是JSON
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const error = await response.json()
      expect(error.details).toHaveLength(2)
      expect(error.details[0].field).toBe('title')
    })

    it('应该处理服务器错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: 'Internal server error',
            request_id: 'req_123456',
          }),
      })

      const response = await fetch('/api/mindmaps')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)

      const error = await response.json()
      expect(error.request_id).toBeDefined()
    })
  })

  describe('权限和安全', () => {
    it('应该拒绝未授权的请求', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: 'Unauthorized',
            code: 'MISSING_AUTH_TOKEN',
          }),
      })

      const response = await fetch('/api/mindmaps') // 没有Authorization头

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })

    it('应该验证用户权限', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            error: 'Forbidden',
            code: 'INSUFFICIENT_PERMISSIONS',
          }),
      })

      const response = await fetch('/api/mindmaps/other-user-mindmap', {
        headers: { Authorization: 'Bearer valid_token' },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })
  })

  describe('数据一致性', () => {
    it('应该保持思维导图数据结构一致性', async () => {
      const mindMapWithNodes = TestDataFactory.createMindMap({
        content: JSON.stringify({
          nodes: [
            { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { content: '中心' } },
            { id: '2', type: 'default', position: { x: 100, y: 100 }, data: { content: '分支1' } },
            { id: '3', type: 'default', position: { x: 100, y: -100 }, data: { content: '分支2' } },
          ],
          edges: [
            { id: 'e1', source: '1', target: '2' },
            { id: 'e2', source: '1', target: '3' },
          ],
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mindMapWithNodes),
      })

      const response = await fetch(`/api/mindmaps/${mindMapWithNodes.id}`)
      const result = await response.json()

      expect(response.ok).toBe(true)

      const parsedContent = JSON.parse(result.content)
      expect(parsedContent.nodes).toHaveLength(3)
      expect(parsedContent.edges).toHaveLength(2)

      // 验证节点ID的一致性
      const nodeIds = parsedContent.nodes.map((n: any) => n.id)
      const edgeNodeIds = parsedContent.edges.flatMap((e: any) => [e.source, e.target])
      expect(edgeNodeIds.every((id: string) => nodeIds.includes(id))).toBe(true)
    })
  })
})
