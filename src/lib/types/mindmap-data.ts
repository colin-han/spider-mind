/**
 * 统一的思维导图数据模型
 * 作为前后端数据交互的标准接口，独立于ReactFlow格式
 */

// 基础思维导图信息
export interface MindMapInfo {
  id: string
  title: string
  user_id: string
  is_public: boolean
  created_at: string
  updated_at: string
  embedding?: number[]
}

// 思维导图节点标准格式
export interface MindMapNodeData {
  id: string
  mind_map_id: string
  content: string
  parent_node_id: string | null
  sort_order: number
  node_type: string
  style: Record<string, unknown>
  embedding?: number[]
  created_at: string
  updated_at: string
}

// 创建思维导图的输入数据
export interface CreateMindMapInput {
  title: string
  user_id: string
  is_public?: boolean
}

// 更新思维导图的输入数据
export interface UpdateMindMapInput {
  title?: string
  is_public?: boolean
}

// 创建节点的输入数据
export interface CreateNodeInput {
  id: string
  mind_map_id: string
  content: string
  parent_node_id: string | null
  sort_order?: number
  node_type?: string
  style?: Record<string, unknown>
}

// 更新节点的输入数据
export interface UpdateNodeInput {
  content?: string
  parent_node_id?: string | null
  sort_order?: number
  node_type?: string
  style?: Record<string, unknown>
}

// 完整的思维导图数据（包含所有节点）
export interface MindMapWithNodes {
  mindmap: MindMapInfo
  nodes: MindMapNodeData[]
}

// 节点层次结构信息
export interface NodeHierarchy {
  node: MindMapNodeData
  children: NodeHierarchy[]
  level: number
  test_id: string
}

// Test-ID 生成配置
export interface TestIdConfig {
  rootId: string
  floatPrefix: string
  childSeparator: string
}

// 节点位置和布局信息
export interface NodePosition {
  x: number
  y: number
}

export interface NodeLayout {
  id: string
  position: NodePosition
  width?: number
  height?: number
}

// 思维导图的完整布局数据
export interface MindMapLayout {
  nodes: NodeLayout[]
  viewport?: {
    x: number
    y: number
    zoom: number
  }
}

// API响应格式
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 批量操作相关
export interface BatchNodeOperation {
  type: 'create' | 'update' | 'delete'
  nodeId: string
  data?: CreateNodeInput | UpdateNodeInput
}

export interface BatchUpdateInput {
  mindmap?: UpdateMindMapInput
  operations: BatchNodeOperation[]
}

// 搜索相关
export interface SearchQuery {
  query: string
  user_id: string
  limit?: number
  similarity_threshold?: number
}

export interface SearchResult {
  mindmap: MindMapInfo
  node: MindMapNodeData
  similarity_score: number
  snippet: string
}

// 数据验证错误
export interface ValidationError {
  field: string
  message: string
  code: string
}

// 节点关系信息
export interface NodeRelation {
  parent_id: string | null
  children_ids: string[]
  sibling_ids: string[]
  level: number
  path: string[]
}

// 导出/导入格式
export interface ExportData {
  version: string
  mindmap: MindMapInfo
  nodes: MindMapNodeData[]
  layout?: MindMapLayout
  exported_at: string
}

export interface ImportData {
  mindmap: Omit<MindMapInfo, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  nodes: Omit<MindMapNodeData, 'id' | 'mind_map_id' | 'created_at' | 'updated_at'>[]
  layout?: Omit<MindMapLayout, 'nodes'> & {
    nodes: Omit<NodeLayout, 'id'>[]
  }
}
