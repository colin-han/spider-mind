import { createClient } from '@supabase/supabase-js'

// 本地开发环境使用直接的PostgreSQL连接配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // 本地开发配置
  db: {
    schema: 'public',
  },
  auth: {
    // 在本地开发环境禁用认证，直接使用测试用户ID
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      // 开发环境跳过认证
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  },
})

// 类型定义
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      mind_maps: {
        Row: {
          id: string
          title: string
          content: object
          user_id: string
          is_public: boolean
          created_at: string
          updated_at: string
          embedding?: number[]
        }
        Insert: {
          id?: string
          title: string
          content: object
          user_id: string
          is_public?: boolean
          embedding?: number[]
        }
        Update: {
          title?: string
          content?: object
          is_public?: boolean
          updated_at?: string
          embedding?: number[]
        }
      }
      mind_map_nodes: {
        Row: {
          id: string
          mind_map_id: string
          content: string
          parent_node_id: string | null
          sort_order: number
          node_level: number
          node_type: string
          style: object | null
          created_at: string
          updated_at: string
          embedding?: number[]
        }
        Insert: {
          id?: string
          mind_map_id: string
          content: string
          parent_node_id?: string | null
          sort_order?: number
          node_level?: number
          node_type?: string
          style?: object | null
          embedding?: number[]
        }
        Update: {
          content?: string
          parent_node_id?: string | null
          sort_order?: number
          node_level?: number
          node_type?: string
          style?: object | null
          updated_at?: string
          embedding?: number[]
        }
      }
    }
  }
}
