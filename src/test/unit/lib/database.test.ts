import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TestDataFactory, MockSupabaseService } from '@/test/helpers'

describe('Database Services', () => {
  let mockMindMapService: ReturnType<typeof MockSupabaseService.mockMindMapService>
  let mockAuthService: ReturnType<typeof MockSupabaseService.mockAuthService>

  beforeEach(() => {
    mockMindMapService = MockSupabaseService.mockMindMapService()
    mockAuthService = MockSupabaseService.mockAuthService()
  })

  describe('MindMapService', () => {
    it('应该获取用户的思维导图列表', async () => {
      const userId = 'test-user-1'
      
      const mindMaps = await mockMindMapService.getMindMaps()
      
      expect(mockMindMapService.getMindMaps).toHaveBeenCalled()
      expect(Array.isArray(mindMaps)).toBe(true)
      expect(mindMaps).toHaveLength(1)
      expect(mindMaps[0]).toHaveProperty('title')
    })

    it('应该根据ID获取单个思维导图', async () => {
      const mapId = 'test-map-1'
      
      const mindMap = await mockMindMapService.getMindMapById(mapId)
      
      expect(mockMindMapService.getMindMapById).toHaveBeenCalledWith(mapId)
      expect(mindMap).toHaveProperty('id', mapId)
      expect(mindMap).toHaveProperty('content')
    })

    it('应该创建新的思维导图', async () => {
      const newMapData = {
        title: '新思维导图',
        description: '测试描述',
        content: JSON.stringify({ nodes: [], edges: [] })
      }
      
      const createdMap = await mockMindMapService.createMindMap(newMapData)
      
      expect(mockMindMapService.createMindMap).toHaveBeenCalledWith(newMapData)
      expect(createdMap).toHaveProperty('title', newMapData.title)
      expect(createdMap).toHaveProperty('id')
    })

    it('应该更新思维导图内容', async () => {
      const mapId = 'test-map-1'
      const updateData = { title: '更新后的标题' }
      
      const updatedMap = await mockMindMapService.updateMindMap(mapId, updateData)
      
      expect(mockMindMapService.updateMindMap).toHaveBeenCalledWith(mapId, updateData)
      expect(updatedMap).toHaveProperty('title', updateData.title)
    })

    it('应该删除思维导图', async () => {
      const mapId = 'test-map-1'
      
      const result = await mockMindMapService.deleteMindMap(mapId)
      
      expect(mockMindMapService.deleteMindMap).toHaveBeenCalledWith(mapId)
      expect(result).toBe(true)
    })

    it('应该支持语义搜索', async () => {
      const query = '人工智能相关内容'
      
      const searchResults = await mockMindMapService.searchMindMaps(query)
      
      expect(mockMindMapService.searchMindMaps).toHaveBeenCalledWith(query)
      expect(Array.isArray(searchResults)).toBe(true)
    })
  })

  describe('AuthService', () => {
    it('应该获取当前用户信息', async () => {
      const user = await mockAuthService.getCurrentUser()
      
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled()
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
    })

    it('应该处理用户登录', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' }
      
      const result = await mockAuthService.signIn(credentials)
      
      expect(mockAuthService.signIn).toHaveBeenCalledWith(credentials)
      expect(result).toHaveProperty('user')
    })

    it('应该处理用户注册', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        full_name: '新用户'
      }
      
      const result = await mockAuthService.signUp(userData)
      
      expect(mockAuthService.signUp).toHaveBeenCalledWith(userData)
      expect(result).toHaveProperty('user')
    })

    it('应该处理用户登出', async () => {
      await mockAuthService.signOut()
      
      expect(mockAuthService.signOut).toHaveBeenCalled()
    })
  })

  describe('数据验证', () => {
    it('应该验证思维导图数据格式', () => {
      const validMindMap = TestDataFactory.createMindMap()
      
      // 验证必需字段
      expect(validMindMap).toHaveProperty('id')
      expect(validMindMap).toHaveProperty('title')
      expect(validMindMap).toHaveProperty('content')
      expect(validMindMap).toHaveProperty('user_id')
      
      // 验证content是有效JSON
      expect(() => JSON.parse(validMindMap.content)).not.toThrow()
    })

    it('应该验证用户数据格式', () => {
      const validUser = TestDataFactory.createUser()
      
      expect(validUser).toHaveProperty('id')
      expect(validUser).toHaveProperty('email')
      expect(validUser.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    })
  })
})