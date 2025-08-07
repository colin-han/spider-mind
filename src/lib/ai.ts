// AI服务：集成Claude和OpenAI功能

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface MindMapAIRequest {
  action: 'expand' | 'suggest' | 'analyze' | 'optimize'
  context: {
    selectedNode?: {
      id: string
      content: string
    }
    allNodes?: Array<{ id: string; content: string }>
    userInput?: string
  }
}

interface MindMapAISuggestion {
  type: 'node' | 'connection' | 'restructure'
  title: string
  description: string
  content?: string
  position?: { x: number; y: number }
  connections?: string[]
}

// Claude API 集成
export class ClaudeService {
  private static readonly API_URL = 'https://api.anthropic.com/v1/messages'
  
  static async chat(messages: ChatMessage[], options?: {
    maxTokens?: number
    temperature?: number
  }): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 未配置')
    }

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Claude API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.content?.[0]?.text || ''
  }

  // 针对思维导图的AI助手功能
  static async processMindMapRequest(request: MindMapAIRequest): Promise<MindMapAISuggestion[]> {
    const { action, context } = request
    
    const systemPrompt = `你是一个专业的思维导图AI助手。你需要根据用户的请求和当前思维导图的内容，提供有用的建议。

请以JSON格式返回建议，格式如下：
[
  {
    "type": "node|connection|restructure",
    "title": "建议标题",
    "description": "详细描述",
    "content": "节点内容（仅type为node时需要）",
    "position": {"x": 100, "y": 200},
    "connections": ["连接的节点ID数组"]
  }
]

注意：
- 建议要具体、实用、有创意
- 内容要简洁明了，适合思维导图展示
- 位置要考虑现有节点布局
- 连接要符合逻辑关系`

    let userPrompt = ''
    
    switch (action) {
      case 'expand':
        userPrompt = `请帮我扩展这个节点的内容。当前节点："${context.selectedNode?.content}"。
        请提供3-5个相关的子节点建议。`
        break
        
      case 'suggest':
        userPrompt = `基于当前思维导图的内容，请提供一些改进建议。
        现有节点：${context.allNodes?.map(n => n.content).join(', ')}
        用户输入：${context.userInput || '无特殊要求'}`
        break
        
      case 'analyze':
        userPrompt = `请分析这个思维导图的结构和内容，指出可能的问题或改进空间。
        所有节点：${context.allNodes?.map(n => n.content).join(', ')}`
        break
        
      case 'optimize':
        userPrompt = `请帮我优化这个思维导图的结构，使其更加清晰和有逻辑。
        当前结构：${context.allNodes?.map(n => n.content).join(', ')}`
        break
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    try {
      const response = await this.chat(messages, { temperature: 0.8 })
      
      // 尝试解析JSON响应
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0])
        return suggestions
      }
      
      // 如果不是JSON格式，创建一个通用建议
      return [{
        type: 'node',
        title: 'AI建议',
        description: response,
        content: response.slice(0, 50) + (response.length > 50 ? '...' : ''),
        position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 150 }
      }]
      
    } catch (error) {
      console.error('AI处理失败:', error)
      return [{
        type: 'node',
        title: 'AI助手暂时不可用',
        description: '请稍后重试或检查网络连接',
        content: 'AI助手异常',
        position: { x: 300, y: 200 }
      }]
    }
  }
}

// OpenAI Embeddings API
export class OpenAIService {
  private static readonly EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'
  
  static async getEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 未配置')
    }

    const response = await fetch(this.EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.data?.[0]?.embedding || []
  }

  static async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 未配置')
    }

    const response = await fetch(this.EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.data?.map((item: { embedding: number[] }) => item.embedding) || []
  }
}

// 综合AI服务
export class AIService {
  // 为思维导图内容生成嵌入向量
  static async generateEmbeddingForMindMap(title: string, nodes: Array<{content: string}>): Promise<number[]> {
    const combinedText = `${title}\n${nodes.map(n => n.content).join(' ')}`
    return await OpenAIService.getEmbedding(combinedText)
  }

  // 为单个节点生成嵌入向量
  static async generateEmbeddingForNode(content: string): Promise<number[]> {
    return await OpenAIService.getEmbedding(content)
  }

  // 智能搜索查询处理
  static async processSearchQuery(query: string): Promise<{
    embedding: number[]
    enhancedQuery: string
    suggestions: string[]
  }> {
    const [embedding, enhancedResult] = await Promise.all([
      OpenAIService.getEmbedding(query),
      ClaudeService.chat([
        {
          role: 'system',
          content: '你是搜索助手。根据用户查询，提供增强的搜索词和相关建议。以JSON格式返回：{"enhanced": "增强的查询", "suggestions": ["建议1", "建议2", "建议3"]}'
        },
        {
          role: 'user',
          content: `查询：${query}`
        }
      ], { maxTokens: 200 })
    ])

    try {
      const parsed = JSON.parse(enhancedResult)
      return {
        embedding,
        enhancedQuery: parsed.enhanced || query,
        suggestions: parsed.suggestions || []
      }
    } catch {
      return {
        embedding,
        enhancedQuery: query,
        suggestions: []
      }
    }
  }
}