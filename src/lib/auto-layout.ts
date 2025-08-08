// 自动布局算法工具

export interface LayoutNode {
  id: string
  parent_node_id: string | null
  sort_order: number
  node_level: number
  content: string
}

export interface NodePosition {
  x: number
  y: number
}

// 布局配置常量
const LAYOUT_CONFIG = {
  // 层级间的水平间距
  LEVEL_SPACING: 250,
  // 兄弟节点间的垂直间距
  SIBLING_SPACING: 80,
  // 根节点起始位置
  ROOT_START_X: 200,
  ROOT_START_Y: 200,
  // 最小垂直间距（避免节点重叠）
  MIN_VERTICAL_SPACING: 60,
}

/**
 * 构建节点树结构
 */
function buildNodeTree(nodes: LayoutNode[]): Map<string | null, LayoutNode[]> {
  const tree = new Map<string | null, LayoutNode[]>()

  // 按父节点分组
  for (const node of nodes) {
    const parentId = node.parent_node_id
    if (!tree.has(parentId)) {
      tree.set(parentId, [])
    }
    tree.get(parentId)!.push(node)
  }

  // 对每个组内的节点按sort_order排序
  for (const [, children] of tree) {
    children.sort((a, b) => a.sort_order - b.sort_order)
  }

  return tree
}

/**
 * 计算子树的高度（用于垂直居中对齐）
 */
function calculateSubtreeHeight(nodeId: string, tree: Map<string | null, LayoutNode[]>): number {
  const children = tree.get(nodeId) || []
  if (children.length === 0) {
    return 1 // 叶子节点高度为1
  }

  let totalHeight = 0
  for (const child of children) {
    totalHeight += calculateSubtreeHeight(child.id, tree)
  }

  return Math.max(totalHeight, 1)
}

/**
 * 递归布局子节点
 */
function layoutChildren(
  parentId: string | null,
  tree: Map<string | null, LayoutNode[]>,
  positions: Map<string, NodePosition>,
  startX: number,
  startY: number
): number {
  const children = tree.get(parentId) || []
  if (children.length === 0) {
    return startY
  }

  let currentY = startY

  for (const child of children) {
    // 计算子树高度以确定垂直位置
    const subtreeHeight = calculateSubtreeHeight(child.id, tree)
    const nodeHeight = subtreeHeight * LAYOUT_CONFIG.SIBLING_SPACING

    // 设置当前节点位置
    positions.set(child.id, {
      x: startX,
      y: currentY + nodeHeight / 2,
    })

    // 递归布局子节点
    const childX = startX + LAYOUT_CONFIG.LEVEL_SPACING
    layoutChildren(child.id, tree, positions, childX, currentY)

    // 移动到下一个兄弟节点的起始位置
    currentY += Math.max(nodeHeight, LAYOUT_CONFIG.MIN_VERTICAL_SPACING)
  }

  return currentY
}

/**
 * 主布局计算函数
 */
export function calculateAutoLayout(nodes: LayoutNode[]): { [key: string]: NodePosition } {
  if (nodes.length === 0) {
    return {}
  }

  const tree = buildNodeTree(nodes)
  const positions = new Map<string, NodePosition>()

  // 获取所有根节点（parent_node_id为null的节点）
  const rootNodes = tree.get(null) || []

  let currentRootY = LAYOUT_CONFIG.ROOT_START_Y

  // 布局每个根节点及其子树
  for (const rootNode of rootNodes) {
    // 计算根节点的子树高度
    const subtreeHeight = calculateSubtreeHeight(rootNode.id, tree)
    const rootNodeHeight = subtreeHeight * LAYOUT_CONFIG.SIBLING_SPACING

    // 设置根节点位置
    positions.set(rootNode.id, {
      x: LAYOUT_CONFIG.ROOT_START_X,
      y: currentRootY + rootNodeHeight / 2,
    })

    // 布局根节点的子树
    const childX = LAYOUT_CONFIG.ROOT_START_X + LAYOUT_CONFIG.LEVEL_SPACING
    layoutChildren(rootNode.id, tree, positions, childX, currentRootY)

    // 移动到下一个根节点的起始位置
    currentRootY += Math.max(rootNodeHeight, LAYOUT_CONFIG.MIN_VERTICAL_SPACING * 2)
  }

  // 转换为普通对象返回
  const result: { [key: string]: NodePosition } = {}
  for (const [nodeId, position] of positions) {
    result[nodeId] = position
  }

  return result
}

/**
 * 从数据库节点数据创建布局节点
 */
export function createLayoutNodes(
  dbNodes: Array<{
    id: string
    parent_node_id: string | null
    sort_order: number
    node_level: number
    content: string
  }>
): LayoutNode[] {
  return dbNodes.map(node => ({
    id: node.id,
    parent_node_id: node.parent_node_id,
    sort_order: node.sort_order,
    node_level: node.node_level,
    content: node.content,
  }))
}

/**
 * 生成连接边
 */
export function generateEdges(nodes: LayoutNode[]): Array<{
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}> {
  const edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  }> = []

  for (const node of nodes) {
    if (node.parent_node_id) {
      edges.push({
        id: `edge_${node.parent_node_id}_${node.id}`,
        source: node.parent_node_id,
        target: node.id,
        sourceHandle: 'right',
        targetHandle: 'left',
      })
    }
  }

  return edges
}

/**
 * 获取下一个排序位置
 */
export function getNextSortOrder(nodes: LayoutNode[], parentId: string | null): number {
  const siblings = nodes.filter(n => n.parent_node_id === parentId)
  const maxOrder = siblings.reduce((max, node) => Math.max(max, node.sort_order), -1)
  return maxOrder + 1
}

/**
 * 获取节点层级
 */
export function getNodeLevel(nodes: LayoutNode[], parentId: string | null): number {
  if (!parentId) {
    return 0 // 根节点层级为0
  }

  const parentNode = nodes.find(n => n.id === parentId)
  return parentNode ? parentNode.node_level + 1 : 0
}
