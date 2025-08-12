import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/database-postgres'

// 获取所有思维导图
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || '11111111-1111-1111-1111-111111111111' // 默认用户

    // 从Supabase获取用户的思维导图
    const userMindMaps = await MindMapService.getUserMindMaps(userId)

    return NextResponse.json({
      success: true,
      data: userMindMaps,
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
    const title = body.title || '新思维导图'
    const userId = body.userId || '11111111-1111-1111-1111-111111111111'

    // 创建根节点ID
    const rootNodeId = crypto.randomUUID()

    // 准备思维导图数据（只包含基本信息，不包含content字段）
    const mindMapData = {
      title,
      user_id: userId,
      is_public: body.is_public || false,
    }

    // 创建思维导图
    const mindMap = await MindMapService.createMindMap(mindMapData)

    // 准备根节点数据
    const rootNodeContent = {
      nodes: [
        {
          id: rootNodeId,
          type: 'mindMapNode',
          position: { x: 400, y: 300 },
          data: {
            content: title,
            isEditing: false,
            parent_node_id: null,
            sort_order: 0,
            node_level: 0,
          },
        },
      ],
      edges: [],
    }

    // 同步节点数据到nodes表
    await MindMapService.syncNodesFromContent(mindMap.id, rootNodeContent)

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
