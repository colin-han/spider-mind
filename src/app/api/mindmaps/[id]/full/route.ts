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

    // 生成test-id的纯函数
    const generateTestId = (
      node: {
        id: string
        parent_node_id: string | null
        sort_order: number
      },
      allNodes: typeof nodes
    ): string => {
      // 根级节点（没有父节点）
      if (!node.parent_node_id) {
        // 检查是否有多个根级节点
        const rootNodes = allNodes.filter(n => !n.parent_node_id)
        if (rootNodes.length === 1) {
          return 'root' // 单个根节点
        } else {
          // 多个根级节点，第一个是root，其他是浮动节点
          const sortedRootNodes = rootNodes.sort((a, b) => a.sort_order - b.sort_order)
          const rootIndex = sortedRootNodes.findIndex(n => n.id === node.id)
          if (rootIndex === 0) {
            return 'root'
          } else {
            return `float-${rootIndex - 1}`
          }
        }
      }

      // 子节点：基于父节点的test-id + 同级索引
      if (node.parent_node_id) {
        const parentNode = allNodes.find(n => n.id === node.parent_node_id)
        if (!parentNode) return `unknown-${node.id}`

        const parentTestId = generateTestId(parentNode, allNodes)

        // 计算在同级节点中的索引
        const siblings = allNodes
          .filter(n => n.parent_node_id === node.parent_node_id)
          .sort((a, b) => a.sort_order - b.sort_order)

        const siblingIndex = siblings.findIndex(n => n.id === node.id)
        return `${parentTestId}-${siblingIndex}`
      }

      return `unknown-${node.id}`
    }

    // 确定应该选中的节点（优先选择root节点）
    const rootLevelNodes = nodes.filter(n => !n.parent_node_id)
    const hasRootNode = rootLevelNodes.some(n => generateTestId(n, nodes) === 'root')

    // 选中逻辑：优先选择root节点，如果没有root则选择第一个浮动节点
    const selectedNodeTestId = hasRootNode ? 'root' : 'float-0'

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
        testId: generateTestId(node, nodes), // 添加test-id
      },
      selected: generateTestId(node, nodes) === selectedNodeTestId, // 只选中指定的节点
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
