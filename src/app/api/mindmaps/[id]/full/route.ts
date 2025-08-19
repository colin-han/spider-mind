import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/database-postgres'
import { mindMapTransformer } from '@/lib/services/mindmap-transformer'
import type { ApiResponse, MindMapWithNodes } from '@/lib/types/mindmap-data'

// 获取完整的思维导图数据（标准格式，前端负责ReactFlow转换）
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // 获取思维导图基本信息
    const mindMap = await MindMapService.getMindMap(id)
    if (!mindMap) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 获取所有节点
    const nodes = await MindMapService.getMindMapNodes(id)

    // 使用转换器将数据库格式转换为标准数据模型
    const standardData = mindMapTransformer.fromDatabase(
      mindMap as unknown as Record<string, unknown>,
      nodes as unknown as Record<string, unknown>[]
    )

    return NextResponse.json<ApiResponse<MindMapWithNodes>>({
      success: true,
      data: standardData,
    })
  } catch (error) {
    console.error('Failed to get full mind map:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: '获取完整思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
