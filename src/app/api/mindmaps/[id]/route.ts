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

    // 获取节点数据并构建ReactFlow格式
    const nodes = await MindMapService.getMindMapNodes(params.id)

    // 将节点数据转换为ReactFlow格式
    const reactFlowNodes = nodes.map(node => ({
      id: node.id,
      type: node.node_type || 'mindMapNode',
      position: { x: 0, y: 0 }, // 位置会在前端重新计算
      data: {
        content: node.content,
        isEditing: false,
        style: typeof node.style === 'object' ? node.style : {},
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

    // 构建完整的响应数据
    const responseData = {
      ...mindMap,
      content: {
        nodes: reactFlowNodes,
        edges: reactFlowEdges,
      },
    }

    return NextResponse.json({
      success: true,
      data: responseData,
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

    // 更新基本信息
    const updatedMindMap = await MindMapService.updateMindMap(params.id, {
      title: body.title,
      is_public: body.is_public,
    })

    // 如果有content，同步到nodes表（这是数据的主要保存路径）
    if (body.content && (body.content.nodes || body.content.edges)) {
      await MindMapService.syncNodesFromContent(params.id, body.content)
    }

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
