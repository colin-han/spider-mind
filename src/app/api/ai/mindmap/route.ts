import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, context } = body

    if (!action || !context) {
      return NextResponse.json(
        { error: '缺少必要参数: action 和 context' },
        { status: 400 }
      )
    }

    const suggestions = await ClaudeService.processMindMapRequest({
      action,
      context
    })

    return NextResponse.json({ suggestions })

  } catch (error) {
    console.error('AI处理错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI处理失败' },
      { status: 500 }
    )
  }
}