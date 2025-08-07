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
INSERT INTO mind_maps (id, title, content, user_id, is_public, created_at, updated_at) VALUES 
(
  '123e4567-e89b-12d3-a456-426614174000',
  '项目规划思维导图',
  '{
    "nodes": [
      {"id": "1", "type": "mindMapNode", "position": {"x": 400, "y": 300}, "data": {"content": "项目规划", "isEditing": false}},
      {"id": "2", "type": "mindMapNode", "position": {"x": 200, "y": 200}, "data": {"content": "需求分析", "isEditing": false}},
      {"id": "3", "type": "mindMapNode", "position": {"x": 600, "y": 200}, "data": {"content": "技术选型", "isEditing": false}},
      {"id": "4", "type": "mindMapNode", "position": {"x": 200, "y": 400}, "data": {"content": "时间安排", "isEditing": false}},
      {"id": "5", "type": "mindMapNode", "position": {"x": 600, "y": 400}, "data": {"content": "团队分工", "isEditing": false}}
    ],
    "edges": [
      {"id": "e1-2", "source": "1", "target": "2"},
      {"id": "e1-3", "source": "1", "target": "3"},
      {"id": "e1-4", "source": "1", "target": "4"},
      {"id": "e1-5", "source": "1", "target": "5"}
    ]
  }',
  '550e8400-e29b-41d4-a716-446655440000',
  true
),
(
  '123e4567-e89b-12d3-a456-426614174001',
  '学习计划',
  '{
    "nodes": [
      {"id": "1", "type": "mindMapNode", "position": {"x": 400, "y": 300}, "data": {"content": "学习计划", "isEditing": false}},
      {"id": "2", "type": "mindMapNode", "position": {"x": 250, "y": 200}, "data": {"content": "前端技术", "isEditing": false}},
      {"id": "3", "type": "mindMapNode", "position": {"x": 550, "y": 200}, "data": {"content": "后端技术", "isEditing": false}},
      {"id": "4", "type": "mindMapNode", "position": {"x": 150, "y": 100}, "data": {"content": "React", "isEditing": false}},
      {"id": "5", "type": "mindMapNode", "position": {"x": 350, "y": 100}, "data": {"content": "TypeScript", "isEditing": false}},
      {"id": "6", "type": "mindMapNode", "position": {"x": 500, "y": 100}, "data": {"content": "Node.js", "isEditing": false}},
      {"id": "7", "type": "mindMapNode", "position": {"x": 650, "y": 100}, "data": {"content": "PostgreSQL", "isEditing": false}}
    ],
    "edges": [
      {"id": "e1-2", "source": "1", "target": "2"},
      {"id": "e1-3", "source": "1", "target": "3"},
      {"id": "e2-4", "source": "2", "target": "4"},
      {"id": "e2-5", "source": "2", "target": "5"},
      {"id": "e3-6", "source": "3", "target": "6"},
      {"id": "e3-7", "source": "3", "target": "7"}
    ]
  }',
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