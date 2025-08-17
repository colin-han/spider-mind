#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// 从环境变量读取数据库配置
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function runMigration() {
  try {
    console.log('🔗 连接到PostgreSQL数据库...')

    // 测试连接
    const client = await pool.connect()
    console.log('✅ 数据库连接成功')

    // 读取迁移文件
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '001_initial_schema.sql'
    )
    const _migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 执行数据库迁移...')

    // 修改后的迁移SQL，移除Supabase特定内容
    const localMigrationSQL = `
-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS vector; -- 暂时注释掉，稍后手动安装

-- 简化的用户表（开发环境）
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 思维导图表（移除content字段，节点数据存储在mind_map_nodes表中）
CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    embedding TEXT, -- 临时用TEXT存储向量，稍后改为VECTOR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 思维导图节点表
CREATE TABLE IF NOT EXISTS mind_map_nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mind_map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_node_id UUID REFERENCES mind_map_nodes(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    node_type TEXT DEFAULT 'mindMapNode',
    style JSONB DEFAULT '{}',
    embedding TEXT, -- 临时用TEXT存储向量
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_created_at ON mind_maps(created_at);
CREATE INDEX IF NOT EXISTS idx_mind_maps_is_public ON mind_maps(is_public);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_mind_map_id ON mind_map_nodes(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_parent ON mind_map_nodes(parent_node_id);
-- node_level索引已移除，因为不再存储层级信息
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_sort ON mind_map_nodes(mind_map_id, parent_node_id, sort_order);

-- 创建向量索引（如果数据量大的话）
-- CREATE INDEX IF NOT EXISTS idx_mind_maps_embedding ON mind_maps USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_embedding ON mind_map_nodes USING ivfflat (embedding vector_cosine_ops);

-- 添加约束（PostgreSQL 16不支持IF NOT EXISTS，先检查后添加）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_mindmap_parent_sort' 
        AND conrelid = 'mind_map_nodes'::regclass
    ) THEN
        ALTER TABLE mind_map_nodes ADD CONSTRAINT uq_mindmap_parent_sort 
            UNIQUE (mind_map_id, parent_node_id, sort_order);
    END IF;
END $$;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表添加触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mind_maps_updated_at ON mind_maps;
CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mind_map_nodes_updated_at ON mind_map_nodes;
CREATE TRIGGER update_mind_map_nodes_updated_at BEFORE UPDATE ON mind_map_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入测试用户
INSERT INTO users (id, email, full_name) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'dev@test.com', '开发测试用户')
ON CONFLICT (email) DO NOTHING;

-- 插入示例思维导图
INSERT INTO mind_maps (id, title, user_id) VALUES 
    ('22222222-2222-2222-2222-222222222222', '示例思维导图', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;
    `

    await client.query(localMigrationSQL)
    console.log('✅ 数据库迁移完成')

    // 验证表是否创建成功
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    console.log('📊 创建的表:')
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })

    client.release()
    console.log('🎉 数据库初始化完成!')
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  runMigration()
}

module.exports = { runMigration }
