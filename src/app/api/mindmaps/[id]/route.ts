import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/local-database'

// 获取单个思维导图
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const mindMap = await MindMapService.getMindMap(params.id)

    if (!mindMap) {
      return NextResponse.json(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 获取最新的节点数据
    const nodes = await MindMapService.getMindMapNodes(params.id)

    // 如果有节点数据，用节点数据更新主表content
    if (nodes.length > 0) {
      // 将节点数据转换为ReactFlow格式
      const reactFlowNodes = nodes.map(node => ({
        id: node.id,
        type: 'mindMapNode',
        position: { x: 0, y: 0 }, // 位置会在前端重新计算
        data: {
          content: node.content,
          isEditing: false,
        },
      }))

      // 生成边的连接
      const reactFlowEdges = nodes
        .filter(node => node.parent_node_id)
        .map(node => ({
          id: `${node.parent_node_id}-${node.id}`,
          source: node.parent_node_id!,
          target: node.id,
          type: 'default',
        }))

      // 更新mindMap的content
      mindMap.content = {
        nodes: reactFlowNodes,
        edges: reactFlowEdges,
      }
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
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const updatedMindMap = await MindMapService.updateMindMap(params.id, {
      title: body.title,
      content: body.content,
      is_public: body.is_public,
    })

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
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await MindMapService.deleteMindMap(params.id)

    return NextResponse.json({
      success: true,
      message: '思维导图删除成功',
    })
  } catch (error) {
    console.error('Failed to delete mind map:', error)
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
