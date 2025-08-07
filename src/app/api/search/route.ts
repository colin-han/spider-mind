import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/ai'
import { MindMapService } from '@/lib/database'
import { AuthService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, type = 'both', limit = 10 } = body

    if (!query) {
      return NextResponse.json(
        { error: '搜索查询不能为空' },
        { status: 400 }
      )
    }

    // 获取当前用户
    const user = await AuthService.getCurrentUser()
    const userId = user?.id

    // 处理搜索查询
    const searchResult = await AIService.processSearchQuery(query)

    let mindMaps = []
    let nodes = []

    // 搜索思维导图
    if (type === 'mindmaps' || type === 'both') {
      mindMaps = await MindMapService.searchMindMapsBySimilarity(
        searchResult.embedding,
        {
          limit: Math.ceil(limit / 2),
          userId
        }
      )
    }

    // 搜索节点
    if (type === 'nodes' || type === 'both') {
      nodes = await MindMapService.searchNodesBySimilarity(
        searchResult.embedding,
        {
          limit: Math.ceil(limit / 2),
          userId
        }
      )
    }

    return NextResponse.json({
      query: searchResult.enhancedQuery,
      suggestions: searchResult.suggestions,
      results: {
        mindMaps,
        nodes
      }
    })

  } catch (error) {
    console.error('搜索错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '搜索失败' },
      { status: 500 }
    )
  }
}