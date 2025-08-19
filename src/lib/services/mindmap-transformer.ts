/**
 * 思维导图数据转换服务
 * 处理数据库格式、标准数据模型、ReactFlow格式之间的转换
 */

import { Node, Edge } from '@xyflow/react'
import {
  MindMapInfo,
  MindMapNodeData,
  MindMapWithNodes,
  NodeHierarchy,
  TestIdConfig,
} from '@/lib/types/mindmap-data'
import { calculateAutoLayout, generateEdges, type LayoutNode } from '@/lib/auto-layout'

// Test-ID 生成配置
const DEFAULT_TEST_ID_CONFIG: TestIdConfig = {
  rootId: 'root',
  floatPrefix: 'float',
  childSeparator: '-',
}

/**
 * Test-ID 生成器
 */
export class TestIdGenerator {
  private config: TestIdConfig

  constructor(config: TestIdConfig = DEFAULT_TEST_ID_CONFIG) {
    this.config = config
  }

  /**
   * 生成节点的test-id
   */
  generateTestId(node: MindMapNodeData, allNodes: MindMapNodeData[]): string {
    if (!node.parent_node_id) {
      // 根级节点：需要区分真正的根节点和浮动节点
      const rootLevelNodes = allNodes
        .filter(n => !n.parent_node_id)
        .sort((a, b) => a.sort_order - b.sort_order)

      const index = rootLevelNodes.findIndex(n => n.id === node.id)

      if (index === 0) {
        // 第一个根级节点是真正的根节点
        return this.config.rootId
      } else {
        // 其他根级节点是浮动节点
        return `${this.config.floatPrefix}-${index - 1}`
      }
    }

    // 构建父子关系映射
    const childrenMap = new Map<string, MindMapNodeData[]>()
    for (const n of allNodes) {
      if (n.parent_node_id) {
        if (!childrenMap.has(n.parent_node_id)) {
          childrenMap.set(n.parent_node_id, [])
        }
        childrenMap.get(n.parent_node_id)!.push(n)
      }
    }

    // 对每个父节点的子节点按sort_order排序
    for (const [, children] of childrenMap) {
      children.sort((a, b) => a.sort_order - b.sort_order)
    }

    // 找到节点在兄弟节点中的索引
    const siblings = childrenMap.get(node.parent_node_id) || []
    const index = siblings.findIndex(n => n.id === node.id)

    // 递归生成父节点的test-id
    const parentNode = allNodes.find(n => n.id === node.parent_node_id)
    if (!parentNode) {
      throw new Error(`Parent node not found for node ${node.id}`)
    }

    const parentTestId = this.generateTestId(parentNode, allNodes)
    return `${parentTestId}${this.config.childSeparator}${index}`
  }

  /**
   * 为所有节点生成test-id映射
   */
  generateTestIdMap(nodes: MindMapNodeData[]): Map<string, string> {
    const testIdMap = new Map<string, string>()

    for (const node of nodes) {
      const testId = this.generateTestId(node, nodes)
      testIdMap.set(node.id, testId)
    }

    return testIdMap
  }
}

/**
 * 思维导图数据转换器
 */
export class MindMapTransformer {
  private testIdGenerator: TestIdGenerator

  constructor(testIdConfig?: TestIdConfig) {
    this.testIdGenerator = new TestIdGenerator(testIdConfig)
  }

  /**
   * 将数据库格式转换为标准数据模型
   */
  fromDatabase(
    dbMindMap: Record<string, unknown>,
    dbNodes: Record<string, unknown>[]
  ): MindMapWithNodes {
    const mindmap: MindMapInfo = {
      id: String(dbMindMap.id),
      title: String(dbMindMap.title),
      user_id: String(dbMindMap.user_id),
      is_public: Boolean(dbMindMap.is_public),
      created_at: String(dbMindMap.created_at),
      updated_at: String(dbMindMap.updated_at),
      embedding: dbMindMap.embedding as number[] | undefined,
    }

    const nodes: MindMapNodeData[] = dbNodes.map(dbNode => ({
      id: String(dbNode.id),
      mind_map_id: String(dbNode.mind_map_id),
      content: String(dbNode.content),
      parent_node_id: dbNode.parent_node_id ? String(dbNode.parent_node_id) : null,
      sort_order: Number(dbNode.sort_order),
      node_type: String(dbNode.node_type) || 'mindMapNode',
      style: (dbNode.style as Record<string, unknown>) || {},
      embedding: dbNode.embedding as number[] | undefined,
      created_at: String(dbNode.created_at),
      updated_at: String(dbNode.updated_at),
    }))

    return { mindmap, nodes }
  }

  /**
   * 将标准数据模型转换为ReactFlow格式
   */
  toReactFlow(data: MindMapWithNodes): { nodes: Node[]; edges: Edge[] } {
    const { nodes: mindMapNodes } = data

    // 生成test-id映射
    const testIdMap = this.testIdGenerator.generateTestIdMap(mindMapNodes)

    // 转换为LayoutNode格式进行布局计算
    const layoutNodes: LayoutNode[] = mindMapNodes.map(node => ({
      id: node.id,
      parent_node_id: node.parent_node_id,
      sort_order: node.sort_order,
      content: node.content,
    }))

    // 计算布局
    const nodePositions = calculateAutoLayout(layoutNodes)

    // 确定应该选中的节点（优先选择root节点）
    const rootLevelNodes = mindMapNodes.filter(n => !n.parent_node_id)
    const hasRootNode = rootLevelNodes.some(n => testIdMap.get(n.id) === 'root')
    const selectedNodeTestId = hasRootNode ? 'root' : 'float-0'

    // 转换为ReactFlow节点
    const reactFlowNodes: Node[] = mindMapNodes.map(node => {
      const position = nodePositions[node.id] || { x: 0, y: 0 }
      const testId = testIdMap.get(node.id) || node.id

      return {
        id: node.id,
        type: node.node_type,
        position,
        selected: testId === selectedNodeTestId, // 选中root节点或第一个float节点
        data: {
          content: node.content,
          testId,
          style: node.style,
          nodeData: node, // 保留完整的节点数据用于后续操作
          isEditing: false,
        },
      }
    })

    // 生成边
    const reactFlowEdges = generateEdges(layoutNodes)

    return {
      nodes: reactFlowNodes,
      edges: reactFlowEdges,
    }
  }

  /**
   * 将ReactFlow格式转换为标准数据模型
   */
  fromReactFlow(nodes: Node[], edges: Edge[], mindMapInfo: MindMapInfo): MindMapWithNodes {
    // 从ReactFlow节点提取标准节点数据
    const mindMapNodes: MindMapNodeData[] = nodes.map(node => {
      // 如果节点包含完整的nodeData，优先使用
      if (node.data.nodeData && typeof node.data.nodeData === 'object') {
        const nodeData = node.data.nodeData as MindMapNodeData
        return {
          ...nodeData,
          content: (node.data.content as string) || nodeData.content, // 确保内容是最新的
          style: (node.data.style as Record<string, unknown>) || nodeData.style || {},
        }
      }

      // 否则从ReactFlow节点构造标准格式
      return {
        id: node.id,
        mind_map_id: mindMapInfo.id,
        content: (node.data.content as string) || '',
        parent_node_id: this.findParentFromEdges(node.id, edges),
        sort_order: 0, // 需要重新计算
        node_type: node.type || 'mindMapNode',
        style: (node.data.style as Record<string, unknown>) || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

    // 重新计算sort_order
    this.recalculateSortOrder(mindMapNodes)

    return {
      mindmap: mindMapInfo,
      nodes: mindMapNodes,
    }
  }

  /**
   * 构建节点层次结构
   */
  buildHierarchy(nodes: MindMapNodeData[]): NodeHierarchy[] {
    const testIdMap = this.testIdGenerator.generateTestIdMap(nodes)
    const childrenMap = new Map<string | null, MindMapNodeData[]>()

    // 构建父子关系映射
    for (const node of nodes) {
      const parentId = node.parent_node_id
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, [])
      }
      childrenMap.get(parentId)!.push(node)
    }

    // 对每个父节点的子节点排序
    for (const [, children] of childrenMap) {
      children.sort((a, b) => a.sort_order - b.sort_order)
    }

    const buildHierarchyRecursive = (nodeId: string | null, level: number = 0): NodeHierarchy[] => {
      const children = childrenMap.get(nodeId) || []

      return children.map(node => ({
        node,
        children: buildHierarchyRecursive(node.id, level + 1),
        level,
        test_id: testIdMap.get(node.id) || node.id,
      }))
    }

    return buildHierarchyRecursive(null)
  }

  /**
   * 从边信息中找到父节点ID
   */
  private findParentFromEdges(nodeId: string, edges: Edge[]): string | null {
    const parentEdge = edges.find(edge => edge.target === nodeId)
    return parentEdge ? parentEdge.source : null
  }

  /**
   * 重新计算节点的sort_order
   */
  private recalculateSortOrder(nodes: MindMapNodeData[]): void {
    // 按父节点分组
    const childrenMap = new Map<string | null, MindMapNodeData[]>()

    for (const node of nodes) {
      const parentId = node.parent_node_id
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, [])
      }
      childrenMap.get(parentId)!.push(node)
    }

    // 为每组子节点重新分配sort_order
    for (const [, children] of childrenMap) {
      children.forEach((node, index) => {
        node.sort_order = index
      })
    }
  }

  /**
   * 获取下一个可用的sort_order
   */
  getNextSortOrder(parentNodeId: string | null, nodes: MindMapNodeData[]): number {
    const siblings = nodes.filter(node => node.parent_node_id === parentNodeId)
    return siblings.length > 0 ? Math.max(...siblings.map(n => n.sort_order)) + 1 : 0
  }

  /**
   * 验证节点数据的完整性
   */
  validateNodeData(node: MindMapNodeData): boolean {
    return !!(
      node.id &&
      node.mind_map_id &&
      node.content !== undefined &&
      typeof node.sort_order === 'number' &&
      node.node_type &&
      node.style
    )
  }

  /**
   * 清理和标准化节点数据
   */
  sanitizeNodeData(node: Partial<MindMapNodeData>): MindMapNodeData {
    const now = new Date().toISOString()

    return {
      id: node.id || '',
      mind_map_id: node.mind_map_id || '',
      content: node.content || '',
      parent_node_id: node.parent_node_id || null,
      sort_order: node.sort_order || 0,
      node_type: node.node_type || 'mindMapNode',
      style: node.style || {},
      embedding: node.embedding,
      created_at: node.created_at || now,
      updated_at: now,
    }
  }
}

// 导出默认实例
export const mindMapTransformer = new MindMapTransformer()
export const testIdGenerator = new TestIdGenerator()
