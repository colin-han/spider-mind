-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 用户配置表
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 思维导图表
CREATE TABLE mind_maps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small 向量维度
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 思维导图节点表（用于更细粒度的搜索和AI功能）
CREATE TABLE mind_map_nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, -- 统一ID，也是ReactFlow节点ID
    mind_map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_node_id UUID REFERENCES mind_map_nodes(id) ON DELETE CASCADE, -- 父节点ID
    sort_order INTEGER NOT NULL DEFAULT 0, -- 兄弟节点间排序
    node_level INTEGER NOT NULL DEFAULT 0, -- 节点层级
    node_type TEXT DEFAULT 'mindMapNode',
    style JSONB DEFAULT '{}',
    embedding VECTOR(1536), -- 节点级别的向量嵌入
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);


-- 创建索引以优化查询性能
CREATE INDEX idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX idx_mind_maps_created_at ON mind_maps(created_at);
CREATE INDEX idx_mind_maps_is_public ON mind_maps(is_public);
CREATE INDEX idx_mind_map_nodes_mind_map_id ON mind_map_nodes(mind_map_id);
CREATE INDEX idx_mind_map_nodes_parent ON mind_map_nodes(parent_node_id);
CREATE INDEX idx_mind_map_nodes_level ON mind_map_nodes(mind_map_id, node_level);
CREATE INDEX idx_mind_map_nodes_sort ON mind_map_nodes(mind_map_id, parent_node_id, sort_order);
CREATE INDEX idx_mind_map_nodes_embedding ON mind_map_nodes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_mind_maps_embedding ON mind_maps USING ivfflat (embedding vector_cosine_ops);

-- 添加约束确保数据完整性
ALTER TABLE mind_map_nodes ADD CONSTRAINT uq_mindmap_parent_sort 
    UNIQUE (mind_map_id, parent_node_id, sort_order);

-- RLS (行级安全) 策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_nodes ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 思维导图访问策略
CREATE POLICY "Users can view own mind maps" ON mind_maps
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public mind maps" ON mind_maps
    FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can insert own mind maps" ON mind_maps
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mind maps" ON mind_maps
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mind maps" ON mind_maps
    FOR DELETE USING (auth.uid() = user_id);

-- 节点访问策略（基于思维导图的访问权限）
CREATE POLICY "Users can view nodes of accessible mind maps" ON mind_map_nodes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mind_maps 
            WHERE mind_maps.id = mind_map_nodes.mind_map_id 
            AND (mind_maps.user_id = auth.uid() OR mind_maps.is_public = TRUE)
        )
    );
CREATE POLICY "Users can manage nodes of own mind maps" ON mind_map_nodes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM mind_maps 
            WHERE mind_maps.id = mind_map_nodes.mind_map_id 
            AND mind_maps.user_id = auth.uid()
        )
    );


-- 创建触发器自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mind_map_nodes_updated_at BEFORE UPDATE ON mind_map_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建用户注册时自动创建profile的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建向量搜索函数
CREATE OR REPLACE FUNCTION search_mind_maps_by_similarity(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 10,
    user_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content JSONB,
    user_id UUID,
    is_public BOOLEAN,
    similarity FLOAT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mm.id,
        mm.title,
        mm.content,
        mm.user_id,
        mm.is_public,
        1 - (mm.embedding <=> query_embedding) AS similarity,
        mm.created_at,
        mm.updated_at
    FROM mind_maps mm
    WHERE 
        mm.embedding IS NOT NULL
        AND (1 - (mm.embedding <=> query_embedding)) > match_threshold
        AND (user_id_filter IS NULL OR mm.user_id = user_id_filter)
        AND (mm.is_public = TRUE OR mm.user_id = auth.uid())
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_nodes_by_similarity(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 20,
    user_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    mind_map_id UUID,
    node_id TEXT,
    content TEXT,
    position_x REAL,
    position_y REAL,
    similarity FLOAT,
    mind_map_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mn.id,
        mn.mind_map_id,
        mn.node_id,
        mn.content,
        mn.position_x,
        mn.position_y,
        1 - (mn.embedding <=> query_embedding) AS similarity,
        mm.title as mind_map_title,
        mn.created_at
    FROM mind_map_nodes mn
    JOIN mind_maps mm ON mm.id = mn.mind_map_id
    WHERE 
        mn.embedding IS NOT NULL
        AND (1 - (mn.embedding <=> query_embedding)) > match_threshold
        AND (user_id_filter IS NULL OR mm.user_id = user_id_filter)
        AND (mm.is_public = TRUE OR mm.user_id = auth.uid())
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;