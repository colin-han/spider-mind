import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/database-postgres'

// 获取单个思维导图
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // 从数据库中查找
    let mindMap = await MindMapService.getMindMap(id)

    if (!mindMap) {
      // 如果没有找到，创建一个默认的思维导图
      const rootNodeId = crypto.randomUUID()
      const defaultMindMapData = {
        id: id, // 使用传入的ID
        title: '新思维导图',
        user_id: '11111111-1111-1111-1111-111111111111',
        is_public: false,
      }

      // 创建思维导图
      mindMap = await MindMapService.createMindMap(defaultMindMapData)

      // 准备根节点数据
      const rootNodeContent = {
        nodes: [
          {
            id: rootNodeId,
            type: 'mindMapNode',
            position: { x: 400, y: 300 },
            data: {
              content: '新思维导图',
              isEditing: false,
              parent_node_id: null,
              sort_order: 0,
              node_level: 0,
            },
            selected: true, // 默认选中主节点
          },
        ],
        edges: [],
      }

      // 同步节点数据到nodes表
      await MindMapService.syncNodesFromContent(mindMap.id, rootNodeContent)
    }

    return NextResponse.json({
      success: true,
      data: mindMap,
    })
  } catch (error) {
    console.error('Failed to get mind map:', error)
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

// 更新思维导图
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // 检查思维导图是否存在
    const existingMindMap = await MindMapService.getMindMap(id)
    if (!existingMindMap) {
      return NextResponse.json(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 准备更新数据
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    // 在单个事务中更新思维导图并同步节点数据（如果有的话）
    const updatedMindMap = await MindMapService.updateMindMapWithNodes(
      id, 
      updateData,
      body.content
    )

    return NextResponse.json({
      success: true,
      message: '思维导图更新成功',
      data: updatedMindMap,
    })
  } catch (error) {
    console.error('Failed to update mind map:', error)
    return NextResponse.json(
      {
        success: false,
        message: '更新思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 删除思维导图
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const requestId = `del-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  console.log(
    `[${requestId}] DELETE request started for mindmap ID: ${JSON.stringify(await params)}`
  )

  try {
    const { id } = await params
    console.log(`[${requestId}] Processing delete for mindmap ID: ${id}`)

    // 检查思维导图是否存在
    console.log(`[${requestId}] Checking if mindmap exists...`)
    const checkStartTime = Date.now()
    const existingMindMap = await MindMapService.getMindMap(id)
    console.log(
      `[${requestId}] getMindMap completed in ${Date.now() - checkStartTime}ms, found: ${!!existingMindMap}`
    )

    if (!existingMindMap) {
      console.log(`[${requestId}] Mindmap not found, returning 404`)
      return NextResponse.json(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 删除思维导图（级联删除节点）
    console.log(`[${requestId}] Starting delete operation...`)
    const deleteStartTime = Date.now()
    await MindMapService.deleteMindMap(id)
    console.log(`[${requestId}] deleteMindMap completed in ${Date.now() - deleteStartTime}ms`)

    const totalTime = Date.now() - startTime
    console.log(`[${requestId}] Delete operation successful, total time: ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      message: '思维导图删除成功',
    })
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[${requestId}] Delete operation failed after ${totalTime}ms:`, error)
    console.error(`[${requestId}] Error details:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
    })

    return NextResponse.json(
      {
        success: false,
        message: '删除思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
