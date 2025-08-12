import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/database-postgres'

// 获取完整的思维导图数据（包含节点信息）
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // 获取思维导图基本信息
    const mindMap = await MindMapService.getMindMap(id)
    if (!mindMap) {
      return NextResponse.json(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 获取所有节点
    const nodes = await MindMapService.getMindMapNodes(id)
    
    // 重构ReactFlow格式的数据
    const reactFlowNodes = nodes.map(node => ({
      id: node.id,
      type: node.node_type,
      position: { x: 400, y: 300 }, // 暂时使用固定位置，后续可以从style中读取
      data: {
        content: node.content,
        isEditing: false,
        parent_node_id: node.parent_node_id,
        sort_order: node.sort_order,
        node_level: node.node_level,
      },
      selected: node.node_level === 0, // 根节点默认选中
      style: typeof node.style === 'object' ? node.style : {},
    }))

    // 构建edges（从parent_node_id关系推导）
    const reactFlowEdges = nodes
      .filter(node => node.parent_node_id)
      .map(node => ({
        id: `${node.parent_node_id}-${node.id}`,
        source: node.parent_node_id!,
        target: node.id,
        type: 'smoothstep',
      }))

    // 构建完整的content数据
    const fullMindMapData = {
      ...mindMap,
      content: {
        nodes: reactFlowNodes,
        edges: reactFlowEdges,
      },
    }

    return NextResponse.json({
      success: true,
      data: fullMindMapData,
    })
  } catch (error) {
    console.error('Failed to get full mind map:', error)
    return NextResponse.json(
      {
        success: false,
        message: '获取完整思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}