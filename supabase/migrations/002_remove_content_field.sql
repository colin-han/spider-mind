-- 移除mind_maps表中的content字段
-- 节点数据现在完全存储在mind_map_nodes表中

-- 移除mind_maps表的content字段
ALTER TABLE mind_maps DROP COLUMN IF EXISTS content;