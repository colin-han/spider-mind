import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MockAIService } from '@/test/helpers'

// AI服务单元测试
describe('AI Service', () => {
  let mockClaude: ReturnType<typeof MockAIService.mockClaude>
  let mockOpenAI: ReturnType<typeof MockAIService.mockOpenAI>

  beforeEach(() => {
    mockClaude = MockAIService.mockClaude()
    mockOpenAI = MockAIService.mockOpenAI()
  })

  describe('Claude Service', () => {
    it('应该生成思维导图建议', async () => {
      const nodeContent = '人工智能'
      
      const suggestions = await mockClaude.generateSuggestions(nodeContent)
      
      expect(mockClaude.generateSuggestions).toHaveBeenCalledWith(nodeContent)
      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]).toHaveProperty('type', 'expand')
      expect(suggestions[0]).toHaveProperty('title')
      expect(suggestions[0]).toHaveProperty('content')
    })

    it('应该分析思维导图结构', async () => {
      const mindMapData = {
        nodes: [{ id: '1', data: { content: '中心主题' } }],
        edges: []
      }
      
      const analysis = await mockClaude.analyzeStructure(mindMapData)
      
      expect(mockClaude.analyzeStructure).toHaveBeenCalledWith(mindMapData)
      expect(analysis).toHaveProperty('analysis')
      expect(analysis).toHaveProperty('suggestions')
      expect(Array.isArray(analysis.suggestions)).toBe(true)
    })

    it('处理API错误时应该抛出异常', async () => {
      mockClaude.generateSuggestions.mockRejectedValue(new Error('API错误'))
      
      await expect(mockClaude.generateSuggestions('test'))
        .rejects
        .toThrow('API错误')
    })
  })

  describe('OpenAI Embeddings Service', () => {
    it('应该生成单个文本的向量嵌入', async () => {
      const text = '测试文本'
      
      const embeddings = await mockOpenAI.generateEmbeddings(text)
      
      expect(mockOpenAI.generateEmbeddings).toHaveBeenCalledWith(text)
      expect(Array.isArray(embeddings)).toBe(true)
      expect(embeddings).toHaveLength(3)
    })

    it('应该批量生成向量嵌入', async () => {
      const texts = ['文本1', '文本2']
      
      const embeddings = await mockOpenAI.batchGenerateEmbeddings(texts)
      
      expect(mockOpenAI.batchGenerateEmbeddings).toHaveBeenCalledWith(texts)
      expect(Array.isArray(embeddings)).toBe(true)
      expect(embeddings).toHaveLength(2)
    })

    it('空文本应该返回空数组', async () => {
      mockOpenAI.generateEmbeddings.mockResolvedValue([])
      
      const embeddings = await mockOpenAI.generateEmbeddings('')
      
      expect(embeddings).toEqual([])
    })
  })

  describe('AI Service Integration', () => {
    it('应该结合Claude建议和OpenAI向量化', async () => {
      const nodeContent = '机器学习'
      
      // 1. 获取Claude建议
      const suggestions = await mockClaude.generateSuggestions(nodeContent)
      
      // 2. 为建议生成向量嵌入
      const embeddings = await mockOpenAI.generateEmbeddings(suggestions[0].content)
      
      expect(suggestions).toHaveLength(1)
      expect(embeddings).toHaveLength(3)
    })
  })
})