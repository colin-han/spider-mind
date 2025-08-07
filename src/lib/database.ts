import { supabase } from './supabase'
import type { Database } from './supabase'

type Tables = Database['public']['Tables']
type MindMap = Tables['mind_maps']['Row']
type MindMapInsert = Tables['mind_maps']['Insert']
type MindMapUpdate = Tables['mind_maps']['Update']
type MindMapNode = Tables['mind_map_nodes']['Row']
type MindMapNodeInsert = Tables['mind_map_nodes']['Insert']
type Profile = Tables['profiles']['Row']

// 思维导图操作
export class MindMapService {
  // 获取用户的所有思维导图
  static async getUserMindMaps(userId: string): Promise<MindMap[]> {
    const { data, error } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // 获取单个思维导图
  static async getMindMap(id: string): Promise<MindMap | null> {
    const { data, error } = await supabase.from('mind_maps').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') return null // 未找到
      throw error
    }
    return data
  }

  // 创建新的思维导图
  static async createMindMap(mindMap: MindMapInsert): Promise<MindMap> {
    const { data, error } = await supabase.from('mind_maps').insert(mindMap).select().single()

    if (error) throw error
    return data
  }

  // 更新思维导图
  static async updateMindMap(id: string, updates: MindMapUpdate): Promise<MindMap> {
    const { data, error } = await supabase
      .from('mind_maps')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 删除思维导图
  static async deleteMindMap(id: string): Promise<void> {
    const { error } = await supabase.from('mind_maps').delete().eq('id', id)

    if (error) throw error
  }

  // 获取思维导图的所有节点
  static async getMindMapNodes(mindMapId: string): Promise<MindMapNode[]> {
    const { data, error } = await supabase
      .from('mind_map_nodes')
      .select('*')
      .eq('mind_map_id', mindMapId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // 批量更新节点
  static async upsertNodes(nodes: MindMapNodeInsert[]): Promise<MindMapNode[]> {
    const { data, error } = await supabase
      .from('mind_map_nodes')
      .upsert(nodes, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()

    if (error) throw error
    return data || []
  }

  // 删除节点
  static async deleteNodes(mindMapId: string, nodeIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('mind_map_nodes')
      .delete()
      .eq('mind_map_id', mindMapId)
      .in('id', nodeIds)

    if (error) throw error
  }

  // 获取节点的子节点
  static async getChildNodes(mindMapId: string, parentNodeId: string | null): Promise<MindMapNode[]> {
    const query = supabase
      .from('mind_map_nodes')
      .select('*')
      .eq('mind_map_id', mindMapId)
      .order('sort_order', { ascending: true })

    if (parentNodeId === null) {
      query.is('parent_node_id', null)
    } else {
      query.eq('parent_node_id', parentNodeId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // 获取指定层级的所有节点
  static async getNodesByLevel(mindMapId: string, level: number): Promise<MindMapNode[]> {
    const { data, error } = await supabase
      .from('mind_map_nodes')
      .select('*')
      .eq('mind_map_id', mindMapId)
      .eq('node_level', level)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
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

    const { data, error } = await supabase.rpc('search_mind_maps_by_similarity', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      user_id_filter: userId || null,
    })

    if (error) throw error
    return data || []
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

    const { data, error } = await supabase.rpc('search_nodes_by_similarity', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      user_id_filter: userId || null,
    })

    if (error) throw error
    return data || []
  }
}

// 用户配置操作
export class ProfileService {
  // 获取用户配置
  static async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  // 更新用户配置
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// 认证相关工具函数
export class AuthService {
  // 获取当前用户
  static async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }

  // 登录
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // 注册
  static async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error
    return data
  }

  // 登出
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // 监听认证状态变化
  static onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
