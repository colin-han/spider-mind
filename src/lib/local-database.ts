import { Pool } from 'pg'

// 本地PostgreSQL连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// 数据库类型定义，兼容Supabase类型
interface MindMap {
  id: string
  title: string
  user_id: string
  is_public: boolean
  embedding: string | null
  created_at: Date
  updated_at: Date
}

interface MindMapInsert {
  title: string
  user_id: string
  is_public?: boolean
  embedding?: string | null
}

interface MindMapUpdate {
  title?: string
  is_public?: boolean
  embedding?: string | null
}

interface MindMapNode {
  id: string
  mind_map_id: string
  content: string
  parent_node_id: string | null
  sort_order: number
  node_level: number
  node_type: string
  style: Record<string, unknown>
  embedding: string | null
  created_at: Date
  updated_at: Date
}

interface MindMapNodeInsert {
  id?: string
  mind_map_id: string
  content: string
  parent_node_id?: string | null
  sort_order?: number
  node_level?: number
  node_type?: string
  style?: Record<string, unknown>
  embedding?: string | null
}

interface User {
  id: string
  email: string
  full_name: string | null
  created_at: Date
  updated_at: Date
}

// 本地数据库操作类
export class LocalMindMapService {
  // 获取用户的所有思维导图
  static async getUserMindMaps(userId: string): Promise<MindMap[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(
        'SELECT * FROM mind_maps WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      )
      return result.rows
    } finally {
      client.release()
    }
  }

  // 获取单个思维导图
  static async getMindMap(id: string): Promise<MindMap | null> {
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT * FROM mind_maps WHERE id = $1', [id])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  // 创建新的思维导图
  static async createMindMap(mindMap: MindMapInsert): Promise<MindMap> {
    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO mind_maps (title, user_id, is_public, embedding) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [mindMap.title, mindMap.user_id, mindMap.is_public || false, mindMap.embedding || null]
      )
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  // 更新思维导图
  static async updateMindMap(id: string, updates: MindMapUpdate): Promise<MindMap> {
    const client = await pool.connect()
    try {
      const setPairs: string[] = []
      const values: unknown[] = []
      let paramIndex = 1

      if (updates.title !== undefined) {
        setPairs.push(`title = $${paramIndex}`)
        values.push(updates.title)
        paramIndex++
      }
      if (updates.is_public !== undefined) {
        setPairs.push(`is_public = $${paramIndex}`)
        values.push(updates.is_public)
        paramIndex++
      }
      if (updates.embedding !== undefined) {
        setPairs.push(`embedding = $${paramIndex}`)
        values.push(updates.embedding)
        paramIndex++
      }

      if (setPairs.length === 0) {
        throw new Error('No updates provided')
      }

      setPairs.push(`updated_at = NOW()`)
      values.push(id)

      const query = `UPDATE mind_maps SET ${setPairs.join(', ')} WHERE id = $${paramIndex} RETURNING *`
      const result = await client.query(query, values)

      if (result.rows.length === 0) {
        throw new Error('Mind map not found')
      }

      return result.rows[0]
    } finally {
      client.release()
    }
  }

  // 删除思维导图
  static async deleteMindMap(id: string): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('DELETE FROM mind_maps WHERE id = $1', [id])
    } finally {
      client.release()
    }
  }

  // 获取思维导图的所有节点
  static async getMindMapNodes(mindMapId: string): Promise<MindMapNode[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(
        'SELECT * FROM mind_map_nodes WHERE mind_map_id = $1 ORDER BY created_at ASC',
        [mindMapId]
      )
      return result.rows
    } finally {
      client.release()
    }
  }

  // 批量更新节点
  static async upsertNodes(nodes: MindMapNodeInsert[]): Promise<MindMapNode[]> {
    const client = await pool.connect()
    try {
      const results: MindMapNode[] = []

      for (const node of nodes) {
        let result
        if (node.id) {
          // 尝试更新现有节点
          result = await client.query(
            `UPDATE mind_map_nodes 
             SET content = $2, parent_node_id = $3, sort_order = $4, 
                 node_level = $5, node_type = $6, style = $7, embedding = $8, 
                 updated_at = NOW()
             WHERE id = $1 AND mind_map_id = $9
             RETURNING *`,
            [
              node.id,
              node.content,
              node.parent_node_id,
              node.sort_order || 0,
              node.node_level || 0,
              node.node_type || 'mindMapNode',
              JSON.stringify(node.style || {}),
              node.embedding,
              node.mind_map_id,
            ]
          )

          // 如果更新没有影响任何行，则插入新节点
          if (result.rows.length === 0) {
            result = await client.query(
              `INSERT INTO mind_map_nodes 
               (id, mind_map_id, content, parent_node_id, sort_order, node_level, node_type, style, embedding)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
               RETURNING *`,
              [
                node.id,
                node.mind_map_id,
                node.content,
                node.parent_node_id,
                node.sort_order || 0,
                node.node_level || 0,
                node.node_type || 'mindMapNode',
                JSON.stringify(node.style || {}),
                node.embedding,
              ]
            )
          }
        } else {
          // 创建新节点
          result = await client.query(
            `INSERT INTO mind_map_nodes 
             (mind_map_id, content, parent_node_id, sort_order, node_level, node_type, style, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [
              node.mind_map_id,
              node.content,
              node.parent_node_id,
              node.sort_order || 0,
              node.node_level || 0,
              node.node_type || 'mindMapNode',
              JSON.stringify(node.style || {}),
              node.embedding,
            ]
          )
        }

        if (result.rows[0]) {
          results.push(result.rows[0])
        }
      }

      return results
    } finally {
      client.release()
    }
  }

  // 删除节点
  static async deleteNodes(mindMapId: string, nodeIds: string[]): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('DELETE FROM mind_map_nodes WHERE mind_map_id = $1 AND id = ANY($2)', [
        mindMapId,
        nodeIds,
      ])
    } finally {
      client.release()
    }
  }

  // 从ReactFlow格式的content同步节点数据到nodes表
  static async syncNodesFromContent(
    mindMapId: string,
    content: { nodes: unknown[]; edges: unknown[] }
  ): Promise<void> {
    const client = await pool.connect()
    try {
      // 开启事务
      await client.query('BEGIN')

      // 清空现有节点
      await client.query('DELETE FROM mind_map_nodes WHERE mind_map_id = $1', [mindMapId])

      // 构建父子关系映射
      const parentMap: { [nodeId: string]: string | null } = {}
      content.edges?.forEach((edge: unknown) => {
        const edgeObj = edge as { source?: string; target?: string }
        if (edgeObj.source && edgeObj.target) {
          parentMap[edgeObj.target] = edgeObj.source
        }
      })

      // 计算节点层级
      const calculateNodeLevel = (nodeId: string, visited = new Set()): number => {
        if (visited.has(nodeId)) return 0 // 防止循环引用
        visited.add(nodeId)

        const parentId = parentMap[nodeId]
        if (!parentId) return 0 // 根节点层级为0

        return calculateNodeLevel(parentId, visited) + 1
      }

      // 插入新节点
      for (let i = 0; i < (content.nodes || []).length; i++) {
        const node = content.nodes[i] as { id?: string; data?: { content?: string; style?: unknown }; type?: string }
        if (node && node.id) {
          await client.query(
            `INSERT INTO mind_map_nodes 
             (id, mind_map_id, content, parent_node_id, sort_order, node_level, node_type, style, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              node.id,
              mindMapId,
              node.data?.content || '',
              parentMap[node.id] || null,
              i, // 使用数组索引作为排序
              calculateNodeLevel(node.id),
              node.type || 'mindMapNode',
              JSON.stringify(node.data?.style || {}),
              null, // embedding暂时为空
            ]
          )
        }
      }

      // 提交事务
      await client.query('COMMIT')
    } catch (error) {
      // 回滚事务
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // 获取用户信息
  static async getUser(userId: string): Promise<User | null> {
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [userId])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }
}

// 根据环境变量决定使用哪个数据库服务
export const MindMapService =
  process.env.USE_LOCAL_DB === 'true'
    ? LocalMindMapService
    : // fallback 到原来的服务，这里需要从原文件导入
      class {
        static async getUserMindMaps() {
          throw new Error('Supabase service not available in local mode')
        }
        static async getMindMap() {
          throw new Error('Supabase service not available in local mode')
        }
        static async createMindMap() {
          throw new Error('Supabase service not available in local mode')
        }
        static async updateMindMap() {
          throw new Error('Supabase service not available in local mode')
        }
        static async deleteMindMap() {
          throw new Error('Supabase service not available in local mode')
        }
        static async getMindMapNodes() {
          throw new Error('Supabase service not available in local mode')
        }
        static async upsertNodes() {
          throw new Error('Supabase service not available in local mode')
        }
        static async deleteNodes() {
          throw new Error('Supabase service not available in local mode')
        }
        static async syncNodesFromContent() {
          throw new Error('Supabase service not available in local mode')
        }
      }

export default MindMapService
