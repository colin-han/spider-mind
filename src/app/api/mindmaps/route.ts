import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/local-database'

// 获取所有思维导图
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || '11111111-1111-1111-1111-111111111111' // 默认用户

    const mindMaps = await MindMapService.getUserMindMaps(userId)

    return NextResponse.json({
      success: true,
      data: mindMaps,
    })
  } catch (error) {
    console.error('Failed to get mind maps:', error)
    return NextResponse.json(
      {
        success: false,
        message: '获取思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 创建新思维导图
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rootNodeId = crypto.randomUUID()
    const title = body.title || '新思维导图'

    // 创建思维导图（不包含content字段）
    const mindMap = await MindMapService.createMindMap({
      title,
      user_id: body.userId || '11111111-1111-1111-1111-111111111111',
      is_public: body.is_public || false,
    })

    // 在nodes表中创建初始节点
    await MindMapService.upsertNodes([
      {
        id: rootNodeId,
        mind_map_id: mindMap.id,
        parent_node_id: null,
        sort_order: 0,
        node_level: 0,
        content: title,
        node_type: 'mindMapNode',
        style: {},
      },
    ])

    return NextResponse.json({
      success: true,
      message: '思维导图创建成功',
      data: mindMap,
    })
  } catch (error) {
    console.error('Failed to create mind map:', error)
    return NextResponse.json(
      {
        success: false,
        message: '创建思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
