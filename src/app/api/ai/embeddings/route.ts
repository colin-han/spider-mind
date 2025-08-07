import { NextRequest, NextResponse } from 'next/server'
import { OpenAIService } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { texts, single } = body

    if (!texts) {
      return NextResponse.json({ error: '缺少文本参数' }, { status: 400 })
    }

    let embeddings

    if (single || typeof texts === 'string') {
      // 单个文本
      const text = Array.isArray(texts) ? texts[0] : texts
      const embedding = await OpenAIService.getEmbedding(text)
      embeddings = embedding
    } else {
      // 批量处理
      embeddings = await OpenAIService.getBatchEmbeddings(texts)
    }

    return NextResponse.json({ embeddings })
  } catch (error) {
    console.error('嵌入向量生成错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '嵌入向量生成失败' },
      { status: 500 }
    )
  }
}
