-- 种子数据 - 用于开发和测试

-- 注意：这些数据仅用于开发环境，生产环境应删除

-- 示例用户（需要先在 Supabase Auth 中创建对应用户）
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW());

-- 示例profile（假设用户ID已存在）
INSERT INTO profiles (id, email, full_name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com', '演示用户')
ON CONFLICT (id) DO NOTHING;

-- 示例思维导图数据
INSERT INTO mind_maps (id, title, user_id, is_public, created_at, updated_at) VALUES 
(
  '123e4567-e89b-12d3-a456-426614174000',
  '项目规划思维导图',
  '550e8400-e29b-41d4-a716-446655440000',
  true
),
(
  '123e4567-e89b-12d3-a456-426614174001',
  '学习计划',
  '550e8400-e29b-41d4-a716-446655440000',
  false
)
ON CONFLICT (id) DO NOTHING;

-- 示例节点数据
INSERT INTO mind_map_nodes (id, mind_map_id, node_id, content, position_x, position_y, node_type) VALUES 
('node-001', '123e4567-e89b-12d3-a456-426614174000', '1', '项目规划', 400, 300, 'mindMapNode'),
('node-002', '123e4567-e89b-12d3-a456-426614174000', '2', '需求分析', 200, 200, 'mindMapNode'),
('node-003', '123e4567-e89b-12d3-a456-426614174000', '3', '技术选型', 600, 200, 'mindMapNode'),
('node-004', '123e4567-e89b-12d3-a456-426614174000', '4', '时间安排', 200, 400, 'mindMapNode'),
('node-005', '123e4567-e89b-12d3-a456-426614174000', '5', '团队分工', 600, 400, 'mindMapNode'),

('node-101', '123e4567-e89b-12d3-a456-426614174001', '1', '学习计划', 400, 300, 'mindMapNode'),
('node-102', '123e4567-e89b-12d3-a456-426614174001', '2', '前端技术', 250, 200, 'mindMapNode'),
('node-103', '123e4567-e89b-12d3-a456-426614174001', '3', '后端技术', 550, 200, 'mindMapNode'),
('node-104', '123e4567-e89b-12d3-a456-426614174001', '4', 'React', 150, 100, 'mindMapNode'),
('node-105', '123e4567-e89b-12d3-a456-426614174001', '5', 'TypeScript', 350, 100, 'mindMapNode'),
('node-106', '123e4567-e89b-12d3-a456-426614174001', '6', 'Node.js', 500, 100, 'mindMapNode'),
('node-107', '123e4567-e89b-12d3-a456-426614174001', '7', 'PostgreSQL', 650, 100, 'mindMapNode')
ON CONFLICT (id) DO NOTHING;