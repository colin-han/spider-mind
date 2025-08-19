import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/database-postgres'
import { mindMapTransformer } from '@/lib/services/mindmap-transformer'
import type {
  ApiResponse,
  MindMapInfo,
  CreateMindMapInput,
  MindMapNodeData,
} from '@/lib/types/mindmap-data'

// 获取所有思维导图
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || '11111111-1111-1111-1111-111111111111' // 默认用户

    // 从数据库获取用户的思维导图
    const userMindMaps = await MindMapService.getUserMindMaps(userId)

    // 将数据库格式转换为标准数据模型
    const standardMindMaps: MindMapInfo[] = userMindMaps.map(
      mindMap =>
        mindMapTransformer.fromDatabase(mindMap as unknown as Record<string, unknown>, []).mindmap
    )

    return NextResponse.json<ApiResponse<MindMapInfo[]>>({
      success: true,
      data: standardMindMaps,
    })
  } catch (error) {
    console.error('Failed to get mind maps:', error)
    return NextResponse.json<ApiResponse>(
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

    // 验证输入数据格式
    let createInput: CreateMindMapInput

    if (body.title && body.user_id) {
      // 标准数据模型格式
      createInput = {
        title: body.title,
        user_id: body.user_id,
        is_public: body.is_public || false,
      }
    } else {
      // 传统格式兼容
      createInput = {
        title: body.title || '新思维导图',
        user_id: body.userId || '11111111-1111-1111-1111-111111111111',
        is_public: body.is_public || false,
      }
    }

    // 创建思维导图
    const mindMap = await MindMapService.createMindMap(createInput)

    // 创建根节点
    const rootNodeId = crypto.randomUUID()
    const rootNodeData: MindMapNodeData = {
      id: rootNodeId,
      mind_map_id: mindMap.id,
      content: createInput.title,
      parent_node_id: null,
      sort_order: 0,
      node_type: 'mindMapNode',
      style: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 使用标准格式创建根节点
    await MindMapService.upsertNodes([
      {
        id: rootNodeData.id,
        mind_map_id: rootNodeData.mind_map_id,
        content: rootNodeData.content,
        parent_node_id: rootNodeData.parent_node_id,
        sort_order: rootNodeData.sort_order,
        node_type: rootNodeData.node_type,
        style: rootNodeData.style,
      },
    ])

    // 转换为标准数据模型
    const standardMindMap = mindMapTransformer.fromDatabase(
      mindMap as unknown as Record<string, unknown>,
      []
    )

    return NextResponse.json<ApiResponse<MindMapInfo>>({
      success: true,
      message: '思维导图创建成功',
      data: standardMindMap.mindmap,
    })
  } catch (error) {
    console.error('Failed to create mind map:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: '创建思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
