import { describe, it, expect } from 'vitest'
import {
  calculateAutoLayout,
  generateEdges,
  getNextSortOrder,
  getNodeLevel,
  createLayoutNodes,
  type LayoutNode,
} from '@/lib/auto-layout'

describe('Auto Layout Module', () => {
  const mockNodes: LayoutNode[] = [
    {
      id: 'root-1',
      parent_node_id: null,
      sort_order: 0,
      node_level: 0,
      content: '根节点1',
    },
    {
      id: 'child-1-1',
      parent_node_id: 'root-1',
      sort_order: 0,
      node_level: 1,
      content: '子节点1-1',
    },
    {
      id: 'child-1-2',
      parent_node_id: 'root-1',
      sort_order: 1,
      node_level: 1,
      content: '子节点1-2',
    },
    {
      id: 'grandchild-1-1-1',
      parent_node_id: 'child-1-1',
      sort_order: 0,
      node_level: 2,
      content: '孙子节点1-1-1',
    },
  ]

  describe('calculateAutoLayout', () => {
    it('应该为空数组返回空对象', () => {
      const result = calculateAutoLayout([])
      expect(result).toEqual({})
    })

    it('应该为单个根节点计算正确位置', () => {
      const singleNode = [mockNodes[0]]
      const positions = calculateAutoLayout(singleNode)

      expect(positions['root-1']).toBeDefined()
      expect(positions['root-1'].x).toBe(200) // ROOT_START_X
      expect(positions['root-1'].y).toBeGreaterThan(0)
    })

    it('应该为层级结构计算正确的位置', () => {
      const positions = calculateAutoLayout(mockNodes)

      // 根节点应该在最左侧
      expect(positions['root-1'].x).toBe(200)

      // 子节点应该在根节点右侧
      expect(positions['child-1-1'].x).toBeGreaterThan(positions['root-1'].x)
      expect(positions['child-1-2'].x).toBe(positions['child-1-1'].x) // 同级节点x坐标相同

      // 孙子节点应该在子节点右侧
      expect(positions['grandchild-1-1-1'].x).toBeGreaterThan(positions['child-1-1'].x)

      // 同级节点应该垂直排列
      expect(positions['child-1-2'].y).toBeGreaterThan(positions['child-1-1'].y)
    })
  })

  describe('generateEdges', () => {
    it('应该为没有父节点的节点生成空边数组', () => {
      const rootOnly = [mockNodes[0]]
      const edges = generateEdges(rootOnly)
      expect(edges).toEqual([])
    })

    it('应该为有父子关系的节点生成正确的边', () => {
      const edges = generateEdges(mockNodes)

      expect(edges).toHaveLength(3) // 3个子节点，3条边

      // 检查边的结构
      const parentChildEdge = edges.find(
        edge => edge.source === 'root-1' && edge.target === 'child-1-1'
      )
      expect(parentChildEdge).toBeDefined()
      expect(parentChildEdge?.sourceHandle).toBe('right')
      expect(parentChildEdge?.targetHandle).toBe('left')
    })

    it('应该为所有有父节点的节点生成边', () => {
      const edges = generateEdges(mockNodes)
      const expectedEdges = [
        { source: 'root-1', target: 'child-1-1' },
        { source: 'root-1', target: 'child-1-2' },
        { source: 'child-1-1', target: 'grandchild-1-1-1' },
      ]

      expectedEdges.forEach(expected => {
        const edge = edges.find(e => e.source === expected.source && e.target === expected.target)
        expect(edge).toBeDefined()
        expect(edge?.sourceHandle).toBe('right')
        expect(edge?.targetHandle).toBe('left')
      })
    })
  })

  describe('getNextSortOrder', () => {
    it('应该为没有兄弟节点的情况返回0', () => {
      const sortOrder = getNextSortOrder(mockNodes, 'non-existing-parent')
      expect(sortOrder).toBe(0)
    })

    it('应该为根节点返回下一个排序值', () => {
      const sortOrder = getNextSortOrder(mockNodes, null)
      expect(sortOrder).toBe(1) // 已有root-1(sort_order=0)，下一个应该是1
    })

    it('应该为子节点返回正确的排序值', () => {
      const sortOrder = getNextSortOrder(mockNodes, 'root-1')
      expect(sortOrder).toBe(2) // 已有child-1-1(0)和child-1-2(1)，下一个应该是2
    })
  })

  describe('getNodeLevel', () => {
    it('应该为根节点返回0', () => {
      const level = getNodeLevel(mockNodes, null)
      expect(level).toBe(0)
    })

    it('应该为子节点返回正确的层级', () => {
      const level = getNodeLevel(mockNodes, 'root-1')
      expect(level).toBe(1) // root-1的level是0，子节点应该是1
    })

    it('应该为孙子节点返回正确的层级', () => {
      const level = getNodeLevel(mockNodes, 'child-1-1')
      expect(level).toBe(2) // child-1-1的level是1，子节点应该是2
    })

    it('应该为不存在的父节点返回0', () => {
      const level = getNodeLevel(mockNodes, 'non-existing')
      expect(level).toBe(0)
    })
  })

  describe('createLayoutNodes', () => {
    it('应该正确转换数据库节点到布局节点', () => {
      const dbNodes = [
        {
          id: 'test-1',
          parent_node_id: null,
          sort_order: 0,
          node_level: 0,
          content: '测试节点',
        },
      ]

      const layoutNodes = createLayoutNodes(dbNodes)
      expect(layoutNodes).toHaveLength(1)
      expect(layoutNodes[0]).toEqual({
        id: 'test-1',
        parent_node_id: null,
        sort_order: 0,
        node_level: 0,
        content: '测试节点',
      })
    })
  })
})
