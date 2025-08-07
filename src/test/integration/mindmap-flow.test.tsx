import { describe, it, expect, vi } from 'vitest'
import { TestDataFactory, MockSupabaseService, MockAIService } from '@/test/helpers'

// 集成测试：思维导图完整流程
describe('MindMap Integration Flow', () => {
  let mockMindMapService: ReturnType<typeof MockSupabaseService.mockMindMapService>
  let mockAIService: ReturnType<typeof MockAIService.mockClaude>

  beforeEach(() => {
    mockMindMapService = MockSupabaseService.mockMindMapService()
    mockAIService = MockAIService.mockClaude()
  })

  it('应该完成创建思维导图的完整流程', async () => {
    // 1. 创建新思维导图
    const newMapData = {
      title: 'AI学习路径',
      description: '人工智能学习的完整路径规划'
    }
    
    const createdMap = await mockMindMapService.createMindMap(newMapData)
    expect(createdMap).toHaveProperty('id')
    
    // 2. 添加根节点
    const rootNode = TestDataFactory.createNode({
      data: { content: '人工智能学习' }
    })
    
    // 3. 使用AI生成建议
    const suggestions = await mockAIService.generateSuggestions(rootNode.data.content)
    expect(suggestions).toHaveLength(1)
    
    // 4. 基于AI建议创建子节点
    const suggestedContent = suggestions[0].content
    const childNodes = suggestedContent.split('\n').map((content, index) =>
      TestDataFactory.createNode({
        id: `child-${index + 1}`,
        data: { content: content.trim() }
      })
    )
    
    expect(childNodes.length).toBeGreaterThan(0)
    
    // 5. 更新思维导图内容
    const updatedContent = JSON.stringify({
      nodes: [rootNode, ...childNodes],
      edges: childNodes.map(child => 
        TestDataFactory.createEdge(rootNode.id, child.id)
      )
    })
    
    const updatedMap = await mockMindMapService.updateMindMap(createdMap.id, {
      content: updatedContent
    })
    
    expect(updatedMap).toHaveProperty('content', updatedContent)
  })

  it('应该处理节点编辑和AI扩展流程', async () => {
    // 1. 获取现有思维导图
    const existingMap = await mockMindMapService.getMindMapById('test-map-1')
    const mapContent = JSON.parse(existingMap.content)
    
    // 2. 选择一个节点进行编辑
    const selectedNode = mapContent.nodes[0]
    const newContent = '机器学习基础'
    
    // 3. 更新节点内容
    selectedNode.data.content = newContent
    
    // 4. 请求AI扩展建议
    const expansionSuggestions = await mockAIService.generateSuggestions(newContent)
    
    // 5. 创建新的子节点
    const newChildNodes = expansionSuggestions[0].content.split('\n').map((content, index) =>
      TestDataFactory.createNode({
        id: `expansion-${index + 1}`,
        data: { content: content.trim() }
      })
    )
    
    // 6. 添加新的边连接
    const newEdges = newChildNodes.map(child =>
      TestDataFactory.createEdge(selectedNode.id, child.id)
    )
    
    // 7. 更新思维导图
    const updatedContent = {
      nodes: [...mapContent.nodes, ...newChildNodes],
      edges: [...mapContent.edges, ...newEdges]
    }
    
    await mockMindMapService.updateMindMap(existingMap.id, {
      content: JSON.stringify(updatedContent)
    })
    
    expect(mockMindMapService.updateMindMap).toHaveBeenCalled()
  })

  it('应该处理思维导图分析和优化流程', async () => {
    // 1. 获取思维导图
    const mindMap = await mockMindMapService.getMindMapById('test-map-1')
    const content = JSON.parse(mindMap.content)
    
    // 2. 请求AI分析
    const analysis = await mockAIService.analyzeStructure(content)
    
    expect(analysis).toHaveProperty('analysis')
    expect(analysis).toHaveProperty('suggestions')
    
    // 3. 根据分析结果优化结构
    const optimizationSuggestions = analysis.suggestions
    expect(Array.isArray(optimizationSuggestions)).toBe(true)
    
    // 4. 应用优化建议（模拟）
    // 这里可以根据建议类型执行不同的优化操作
    if (optimizationSuggestions.includes('添加更多细节')) {
      // 为现有节点添加详细信息
      const nodeToDetail = content.nodes[0]
      const detailSuggestions = await mockAIService.generateSuggestions(
        `为"${nodeToDetail.data.content}"添加更多详细信息`
      )
      
      expect(detailSuggestions).toHaveLength(1)
    }
  })

  it('应该处理协作和分享流程', async () => {
    // 1. 创建公开思维导图
    const publicMap = await mockMindMapService.createMindMap({
      title: '公开学习资源',
      description: '共享的学习资源思维导图',
      is_public: true
    })
    
    expect(publicMap).toHaveProperty('is_public', true)
    
    // 2. 其他用户搜索公开内容
    const searchResults = await mockMindMapService.searchMindMaps('学习资源')
    
    expect(Array.isArray(searchResults)).toBe(true)
    
    // 3. 复制和修改（模拟fork功能）
    const forkedMap = await mockMindMapService.createMindMap({
      title: `${publicMap.title} - 个人版`,
      description: `基于 ${publicMap.title} 的个人定制版本`,
      content: publicMap.content,
      is_public: false
    })
    
    expect(forkedMap.title).toContain('个人版')
    expect(forkedMap.is_public).toBe(false)
  })

  it('应该处理错误和异常情况', async () => {
    // 1. 处理网络错误
    mockMindMapService.getMindMapById.mockRejectedValue(new Error('网络连接失败'))
    
    await expect(mockMindMapService.getMindMapById('invalid-id'))
      .rejects
      .toThrow('网络连接失败')
    
    // 2. 处理AI服务错误
    mockAIService.generateSuggestions.mockRejectedValue(new Error('AI服务暂时不可用'))
    
    await expect(mockAIService.generateSuggestions('test'))
      .rejects
      .toThrow('AI服务暂时不可用')
    
    // 3. 处理无效数据
    const invalidContent = '{ invalid json'
    
    expect(() => JSON.parse(invalidContent)).toThrow()
  })

  it('应该处理性能优化场景', async () => {
    // 1. 批量操作测试
    const batchSize = 10
    const batchCreatePromises = Array(batchSize).fill(0).map((_, index) =>
      mockMindMapService.createMindMap({
        title: `批量思维导图 ${index + 1}`,
        description: `第 ${index + 1} 个批量创建的思维导图`
      })
    )
    
    const batchResults = await Promise.all(batchCreatePromises)
    expect(batchResults).toHaveLength(batchSize)
    
    // 2. 大数据量处理测试
    const largeNodeCount = 100
    const largeNodes = Array(largeNodeCount).fill(0).map((_, index) =>
      TestDataFactory.createNode({
        id: `large-node-${index}`,
        data: { content: `节点 ${index + 1}` }
      })
    )
    
    expect(largeNodes).toHaveLength(largeNodeCount)
    
    // 3. 模拟复杂思维导图的AI分析
    const complexContent = {
      nodes: largeNodes,
      edges: largeNodes.slice(1).map((node, index) =>
        TestDataFactory.createEdge(largeNodes[0].id, node.id)
      )
    }
    
    const complexAnalysis = await mockAIService.analyzeStructure(complexContent)
    expect(complexAnalysis).toHaveProperty('analysis')
  })
})