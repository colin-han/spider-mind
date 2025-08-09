import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
