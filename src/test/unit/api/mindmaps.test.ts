import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/mindmaps/route'
import { PUT, DELETE, GET as GET_SINGLE } from '@/app/api/mindmaps/[id]/route'
import { MindMapService } from '@/lib/local-database'

// Mock MindMapService
vi.mock('@/lib/local-database', () => ({
  MindMapService: {
    getUserMindMaps: vi.fn(),
    getMindMap: vi.fn(),
    createMindMap: vi.fn(),
    updateMindMap: vi.fn(),
    deleteMindMap: vi.fn(),
  },
}))

describe('MindMaps API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/mindmaps', () => {
    it('应该返回用户的思维导图列表', async () => {
      const mockMindMaps = [
        {
          id: '1',
          title: '测试思维导图1',
          content: { nodes: [], edges: [] },
          user_id: '123',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
        {
          id: '2',
          title: '测试思维导图2',
          content: { nodes: [], edges: [] },
          user_id: '123',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ]

      vi.mocked(MindMapService.getUserMindMaps).mockResolvedValue(mockMindMaps)

      const request = new Request('http://localhost:3000/api/mindmaps')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockMindMaps)
      expect(MindMapService.getUserMindMaps).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111')
    })

    it('应该处理数据库错误', async () => {
      vi.mocked(MindMapService.getUserMindMaps).mockRejectedValue(new Error('数据库连接失败'))

      const request = new Request('http://localhost:3000/api/mindmaps')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('获取思维导图失败')
    })
  })

  describe('POST /api/mindmaps', () => {
    it('应该创建新的思维导图', async () => {
      const mockCreatedMindMap = {
        id: 'new-id',
        title: '新思维导图',
        content: { nodes: [], edges: [] },
        user_id: '123',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }

      vi.mocked(MindMapService.createMindMap).mockResolvedValue(mockCreatedMindMap)

      const request = new Request('http://localhost:3000/api/mindmaps', {
        method: 'POST',
        body: JSON.stringify({
          title: '新思维导图',
          content: { nodes: [], edges: [] },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCreatedMindMap)
      expect(MindMapService.createMindMap).toHaveBeenCalledWith({
        title: '新思维导图',
        content: { nodes: [], edges: [] },
        user_id: '11111111-1111-1111-1111-111111111111',
        is_public: false,
      })
    })

    it('应该使用默认值创建思维导图', async () => {
      const mockCreatedMindMap = {
        id: 'new-id',
        title: '新思维导图',
        content: {
          nodes: [
            {
              id: 'root',
              data: { content: '新思维导图' },
              position: { x: 400, y: 300 },
              type: 'mindMapNode',
            },
          ],
          edges: [],
        },
        user_id: '11111111-1111-1111-1111-111111111111',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }

      vi.mocked(MindMapService.createMindMap).mockResolvedValue(mockCreatedMindMap)

      const request = new Request('http://localhost:3000/api/mindmaps', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(MindMapService.createMindMap).toHaveBeenCalledWith({
        title: '新思维导图',
        content: {
          nodes: [
            {
              id: 'root',
              data: { content: '新思维导图' },
              position: { x: 400, y: 300 },
              type: 'mindMapNode',
            },
          ],
          edges: [],
        },
        user_id: '11111111-1111-1111-1111-111111111111',
        is_public: false,
      })
    })
  })

  describe('GET /api/mindmaps/[id]', () => {
    it('应该返回指定ID的思维导图', async () => {
      const mockMindMap = {
        id: '123',
        title: '测试思维导图',
        content: { nodes: [], edges: [] },
        user_id: '456',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }

      vi.mocked(MindMapService.getMindMap).mockResolvedValue(mockMindMap)

      const request = new Request('http://localhost:3000/api/mindmaps/123')
      const response = await GET_SINGLE(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockMindMap)
      expect(MindMapService.getMindMap).toHaveBeenCalledWith('123')
    })

    it('应该处理思维导图不存在的情况', async () => {
      vi.mocked(MindMapService.getMindMap).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/mindmaps/nonexistent')
      const response = await GET_SINGLE(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('思维导图不存在')
    })
  })

  describe('PUT /api/mindmaps/[id]', () => {
    it('应该更新思维导图', async () => {
      const mockUpdatedMindMap = {
        id: '123',
        title: '更新后的标题',
        content: { nodes: [{ id: 'node1' }], edges: [] },
        user_id: '456',
        created_at: '2025-01-01',
        updated_at: '2025-01-02',
      }

      vi.mocked(MindMapService.updateMindMap).mockResolvedValue(mockUpdatedMindMap)

      const request = new Request('http://localhost:3000/api/mindmaps/123', {
        method: 'PUT',
        body: JSON.stringify({
          title: '更新后的标题',
          content: { nodes: [{ id: 'node1' }], edges: [] },
        }),
      })

      const response = await PUT(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockUpdatedMindMap)
      expect(MindMapService.updateMindMap).toHaveBeenCalledWith('123', {
        title: '更新后的标题',
        content: { nodes: [{ id: 'node1' }], edges: [] },
        is_public: undefined,
      })
    })
  })

  describe('DELETE /api/mindmaps/[id]', () => {
    it('应该删除思维导图', async () => {
      vi.mocked(MindMapService.deleteMindMap).mockResolvedValue(undefined)

      const request = new Request('http://localhost:3000/api/mindmaps/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('思维导图删除成功')
      expect(MindMapService.deleteMindMap).toHaveBeenCalledWith('123')
    })

    it('应该处理删除错误', async () => {
      vi.mocked(MindMapService.deleteMindMap).mockRejectedValue(new Error('删除失败'))

      const request = new Request('http://localhost:3000/api/mindmaps/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('删除思维导图失败')
    })
  })
})