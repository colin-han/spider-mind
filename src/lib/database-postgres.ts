import { query, queryOne, transaction } from './postgres'

// 数据库类型定义
export interface MindMap {
  id: string
  title: string
  user_id: string
  is_public: boolean
  created_at: string
  updated_at: string
  embedding?: number[]
}

export interface MindMapInsert {
  id?: string
  title: string
  user_id: string
  is_public?: boolean
  embedding?: number[]
}

export interface MindMapUpdate {
  title?: string
  is_public?: boolean
  updated_at?: string
  embedding?: number[]
}

export interface MindMapNode {
  id: string
  mind_map_id: string
  content: string
  parent_node_id: string | null
  sort_order: number
  node_level: number
  node_type: string
  style: object
  embedding?: number[]
  created_at: string
  updated_at: string
}

export interface MindMapNodeInsert {
  id: string
  mind_map_id: string
  content: string
  parent_node_id?: string | null
  sort_order?: number
  node_level?: number
  node_type?: string
  style?: object
  embedding?: number[]
}

// 思维导图操作
export class MindMapService {
  // 获取用户的所有思维导图
  static async getUserMindMaps(userId: string): Promise<MindMap[]> {
    const sql = `
      SELECT * FROM mind_maps 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `
    return await query<MindMap>(sql, [userId])
  }

  // 获取单个思维导图
  static async getMindMap(id: string): Promise<MindMap | null> {
    const sql = 'SELECT * FROM mind_maps WHERE id = $1'
    return await queryOne<MindMap>(sql, [id])
  }

  // 创建新的思维导图
  static async createMindMap(mindMap: MindMapInsert): Promise<MindMap> {
    const sql = `
      INSERT INTO mind_maps (id, title, user_id, is_public, embedding)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const id = mindMap.id || crypto.randomUUID()
    const values = [
      id,
      mindMap.title,
      mindMap.user_id,
      mindMap.is_public || false,
      mindMap.embedding ? `[${mindMap.embedding.join(',')}]` : null,
    ]

    const result = await query<MindMap>(sql, values)
    return result[0]
  }

  // 更新思维导图
  static async updateMindMap(id: string, updates: MindMapUpdate): Promise<MindMap> {
    const setClause = []
    const values = []
    let paramIndex = 1

    if (updates.title !== undefined) {
      setClause.push(`title = $${paramIndex++}`)
      values.push(updates.title)
    }
    if (updates.is_public !== undefined) {
      setClause.push(`is_public = $${paramIndex++}`)
      values.push(updates.is_public)
    }
    if (updates.embedding !== undefined) {
      setClause.push(`embedding = $${paramIndex++}`)
      values.push(updates.embedding ? `[${updates.embedding.join(',')}]` : null)
    }

    setClause.push(`updated_at = $${paramIndex++}`)
    values.push(new Date().toISOString())

    values.push(id) // WHERE条件的参数

    const sql = `
      UPDATE mind_maps 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await query<MindMap>(sql, values)
    if (result.length === 0) {
      throw new Error('思维导图不存在')
    }
    return result[0]
  }

  // 在单个事务中更新思维导图并同步节点数据
  static async updateMindMapWithNodes(
    id: string, 
    updates: MindMapUpdate,
    content?: { nodes: unknown[]; edges: unknown[] }
  ): Promise<MindMap> {
    console.log(`[DB] Starting updateMindMapWithNodes for mindmap ${id}`)
    const startTime = Date.now()
    
    return await transaction(async txQuery => {
      // 1. 更新思维导图基本信息
      const setClause = []
      const values = []
      let paramIndex = 1

      if (updates.title !== undefined) {
        setClause.push(`title = $${paramIndex++}`)
        values.push(updates.title)
      }
      if (updates.is_public !== undefined) {
        setClause.push(`is_public = $${paramIndex++}`)
        values.push(updates.is_public)
      }
      if (updates.embedding !== undefined) {
        setClause.push(`embedding = $${paramIndex++}`)
        values.push(updates.embedding ? `[${updates.embedding.join(',')}]` : null)
      }

      setClause.push(`updated_at = $${paramIndex++}`)
      values.push(new Date().toISOString())

      values.push(id) // WHERE条件的参数

      const updateSql = `
        UPDATE mind_maps 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const updateResult = await txQuery<MindMap>(updateSql, values)
      if (updateResult.length === 0) {
        throw new Error('思维导图不存在')
      }

      // 2. 如果有内容更新，同步节点数据
      if (content && content.nodes) {
        console.log(`[DB] Syncing ${content.nodes.length} nodes within transaction`)
        
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

        // 删除现有节点
        const deleteStart = Date.now()
        await txQuery('DELETE FROM mind_map_nodes WHERE mind_map_id = $1', [id])
        console.log(`[DB] Delete nodes completed in ${Date.now() - deleteStart}ms`)

        // 准备插入新节点
        const nodesToInsert = content.nodes
          .map((node, index) => {
            const nodeObj = node as {
              id?: string
              data?: { content?: string; style?: unknown }
              type?: string
            }
            if (nodeObj && nodeObj.id) {
              return {
                id: nodeObj.id,
                mind_map_id: id,
                content: nodeObj.data?.content || '',
                parent_node_id: parentMap[nodeObj.id] || null,
                sort_order: index,
                node_level: calculateNodeLevel(nodeObj.id),
                node_type: nodeObj.type || 'mindMapNode',
                style: nodeObj.data?.style || {},
              }
            }
            return null
          })
          .filter(Boolean) as MindMapNodeInsert[]

        // 批量插入新节点
        if (nodesToInsert.length > 0) {
          const insertStart = Date.now()
          const values: (string | number | null)[] = []
          const placeholders: string[] = []
          let paramIndex = 1

          nodesToInsert.forEach(node => {
            placeholders.push(
              `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
            )
            values.push(
              node.id,
              node.mind_map_id,
              node.content,
              node.parent_node_id,
              node.sort_order,
              node.node_level,
              node.node_type,
              JSON.stringify(node.style)
            )
          })

          const insertSql = `
            INSERT INTO mind_map_nodes 
            (id, mind_map_id, content, parent_node_id, sort_order, node_level, node_type, style)
            VALUES ${placeholders.join(', ')}
          `

          await txQuery(insertSql, values)
          console.log(`[DB] Insert ${nodesToInsert.length} nodes completed in ${Date.now() - insertStart}ms`)
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`[DB] updateMindMapWithNodes completed in ${totalTime}ms`)
      
      return updateResult[0]
    })
  }

  // 删除思维导图
  static async deleteMindMap(id: string): Promise<void> {
    const startTime = Date.now()
    console.log(`[DB] Starting deleteMindMap for ID: ${id}`)

    try {
      const sql = 'DELETE FROM mind_maps WHERE id = $1'
      console.log(`[DB] Executing delete query: ${sql} with params: [${id}]`)

      const result = await query(sql, [id])
      const duration = Date.now() - startTime

      console.log(
        `[DB] Delete query completed in ${duration}ms, affected rows: ${result.length || 'unknown'}`
      )

      if (duration > 1000) {
        console.warn(
          `[DB] WARNING: Delete operation took ${duration}ms - potential connection issue`
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[DB] Delete query failed after ${duration}ms:`, error)
      throw error
    }
  }

  // 获取思维导图的所有节点
  static async getMindMapNodes(mindMapId: string): Promise<MindMapNode[]> {
    const sql = `
      SELECT * FROM mind_map_nodes 
      WHERE mind_map_id = $1 
      ORDER BY created_at ASC
    `
    return await query<MindMapNode>(sql, [mindMapId])
  }

  // 批量插入或更新节点 - 优化性能版本
  static async upsertNodes(nodes: MindMapNodeInsert[]): Promise<MindMapNode[]> {
    if (nodes.length === 0) return []

    console.log(`[DB] Starting upsertNodes for ${nodes.length} nodes`)
    const startTime = Date.now()

    return await transaction(async txQuery => {
      // 批量构建VALUES子句，避免循环中的多次INSERT
      const values: any[] = []
      const placeholders: string[] = []
      let paramIndex = 1

      for (const node of nodes) {
        const nodeValues = [
          node.id,
          node.mind_map_id,
          node.content,
          node.parent_node_id || null,
          node.sort_order || 0,
          node.node_level || 0,
          node.node_type || 'mindMapNode',
          JSON.stringify(node.style || {}),
          node.embedding ? `[${node.embedding.join(',')}]` : null,
        ]

        values.push(...nodeValues)
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
        )
        paramIndex += 9
      }

      const sql = `
        INSERT INTO mind_map_nodes 
        (id, mind_map_id, content, parent_node_id, sort_order, node_level, node_type, style, embedding)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          parent_node_id = EXCLUDED.parent_node_id,
          sort_order = EXCLUDED.sort_order,
          node_level = EXCLUDED.node_level,
          node_type = EXCLUDED.node_type,
          style = EXCLUDED.style,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
        RETURNING *
      `

      const result = await txQuery<MindMapNode>(sql, values)
      const duration = Date.now() - startTime
      console.log(`[DB] upsertNodes completed in ${duration}ms for ${nodes.length} nodes`)

      if (duration > 1000) {
        console.warn(
          `[DB] WARNING: upsertNodes took ${duration}ms for ${nodes.length} nodes - consider further optimization`
        )
      }

      return result
    })
  }

  // 删除节点
  static async deleteNodes(mindMapId: string, nodeIds: string[]): Promise<void> {
    if (nodeIds.length === 0) return

    const placeholders = nodeIds.map((_, i) => `$${i + 2}`).join(',')
    const sql = `
      DELETE FROM mind_map_nodes 
      WHERE mind_map_id = $1 AND id IN (${placeholders})
    `
    await query(sql, [mindMapId, ...nodeIds])
  }

  // 获取节点的子节点
  static async getChildNodes(
    mindMapId: string,
    parentNodeId: string | null
  ): Promise<MindMapNode[]> {
    let sql: string
    let values: any[]

    if (parentNodeId === null) {
      sql = `
        SELECT * FROM mind_map_nodes 
        WHERE mind_map_id = $1 AND parent_node_id IS NULL
        ORDER BY sort_order ASC
      `
      values = [mindMapId]
    } else {
      sql = `
        SELECT * FROM mind_map_nodes 
        WHERE mind_map_id = $1 AND parent_node_id = $2
        ORDER BY sort_order ASC
      `
      values = [mindMapId, parentNodeId]
    }

    return await query<MindMapNode>(sql, values)
  }

  // 获取指定层级的所有节点
  static async getNodesByLevel(mindMapId: string, level: number): Promise<MindMapNode[]> {
    const sql = `
      SELECT * FROM mind_map_nodes 
      WHERE mind_map_id = $1 AND node_level = $2
      ORDER BY sort_order ASC
    `
    return await query<MindMapNode>(sql, [mindMapId, level])
  }

  // 通过向量搜索思维导图
  static async searchMindMapsBySimilarity(
    queryEmbedding: number[],
    options: {
      threshold?: number
      limit?: number
      userId?: string
    } = {}
  ) {
    const { threshold = 0.78, limit = 10, userId } = options

    let sql = `
      SELECT *, 
             1 - (embedding <=> $1::vector) AS similarity
      FROM mind_maps 
      WHERE embedding IS NOT NULL
    `
    const values: any[] = [`[${queryEmbedding.join(',')}]`]
    let paramIndex = 2

    if (userId) {
      sql += ` AND user_id = $${paramIndex++}`
      values.push(userId)
    }

    sql += ` AND 1 - (embedding <=> $1::vector) > $${paramIndex++}`
    values.push(threshold)

    sql += ` ORDER BY similarity DESC LIMIT $${paramIndex}`
    values.push(limit)

    return await query(sql, values)
  }

  // 通过向量搜索节点
  static async searchNodesBySimilarity(
    queryEmbedding: number[],
    options: {
      threshold?: number
      limit?: number
      userId?: string
    } = {}
  ) {
    const { threshold = 0.78, limit = 20, userId } = options

    let sql = `
      SELECT n.*, m.title as mind_map_title,
             1 - (n.embedding <=> $1::vector) AS similarity
      FROM mind_map_nodes n
      JOIN mind_maps m ON n.mind_map_id = m.id
      WHERE n.embedding IS NOT NULL
    `
    const values: any[] = [`[${queryEmbedding.join(',')}]`]
    let paramIndex = 2

    if (userId) {
      sql += ` AND m.user_id = $${paramIndex++}`
      values.push(userId)
    }

    sql += ` AND 1 - (n.embedding <=> $1::vector) > $${paramIndex++}`
    values.push(threshold)

    sql += ` ORDER BY similarity DESC LIMIT $${paramIndex}`
    values.push(limit)

    return await query(sql, values)
  }

  // 从ReactFlow格式的content同步节点数据到nodes表 - 优化版本
  static async syncNodesFromContent(
    mindMapId: string,
    content: { nodes: unknown[]; edges: unknown[] }
  ): Promise<void> {
    const startTime = Date.now()
    const nodeCount = content.nodes?.length || 0
    console.log(`[DB] Starting syncNodesFromContent for mindmap ${mindMapId}, ${nodeCount} nodes`)

    await transaction(async txQuery => {
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

      // 使用更高效的删除方式 - 避免级联删除触发
      const deleteStart = Date.now()
      console.log(`[DB] Deleting existing nodes for mindmap ${mindMapId}`)
      await txQuery('DELETE FROM mind_map_nodes WHERE mind_map_id = $1', [mindMapId])
      const deleteTime = Date.now() - deleteStart
      console.log(`[DB] Delete completed in ${deleteTime}ms`)

      // 准备新节点数据
      const nodesToInsert = (content.nodes || [])
        .map((node, index) => {
          const nodeObj = node as {
            id?: string
            data?: { content?: string; style?: unknown }
            type?: string
          }
          if (nodeObj && nodeObj.id) {
            return {
              id: nodeObj.id,
              mind_map_id: mindMapId,
              content: nodeObj.data?.content || '',
              parent_node_id: parentMap[nodeObj.id] || null,
              sort_order: index,
              node_level: calculateNodeLevel(nodeObj.id),
              node_type: nodeObj.type || 'mindMapNode',
              style: nodeObj.data?.style || {},
              embedding: undefined, // embedding暂时为空
            }
          }
          return null
        })
        .filter(Boolean) as MindMapNodeInsert[]

      if (nodesToInsert.length > 0) {
        console.log(`[DB] Inserting ${nodesToInsert.length} new nodes`)
        const insertStart = Date.now()
        await MindMapService.upsertNodes(nodesToInsert)
        const insertTime = Date.now() - insertStart
        console.log(`[DB] Insert completed in ${insertTime}ms`)
      }

      const totalTime = Date.now() - startTime
      console.log(`[DB] syncNodesFromContent completed in ${totalTime}ms (${nodeCount} nodes)`)

      if (totalTime > 2000) {
        console.warn(`[DB] WARNING: syncNodesFromContent took ${totalTime}ms - performance issue`)
      }
    })
  }
}

// 用户配置操作（简化版，暂时不实现完整功能）
export class ProfileService {
  static async getProfile(userId: string) {
    // 暂时返回模拟数据
    return {
      id: userId,
      email: 'test@example.com',
      full_name: 'Test User',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  static async updateProfile(userId: string, updates: any) {
    // 暂时返回模拟数据
    return {
      id: userId,
      email: 'test@example.com',
      full_name: 'Test User',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    }
  }
}

// 认证相关工具函数（简化版）
export class AuthService {
  static async getCurrentUser() {
    // 暂时返回固定的测试用户
    return {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'test@example.com',
    }
  }

  static async signIn(email: string, password: string) {
    // 暂时返回模拟数据
    return {
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        email,
      },
      session: {
        access_token: 'fake-token',
      },
    }
  }

  static async signUp(email: string, password: string, fullName?: string) {
    // 暂时返回模拟数据
    return {
      user: {
        id: crypto.randomUUID(),
        email,
        user_metadata: { full_name: fullName },
      },
      session: {
        access_token: 'fake-token',
      },
    }
  }

  static async signOut() {
    // 暂时不实现
  }

  static onAuthStateChange(callback: (event: string, session: unknown) => void) {
    // 暂时不实现
    return { data: { subscription: null } }
  }
}
