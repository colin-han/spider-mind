import { Page } from '@playwright/test'

export class DatabaseHelpers {
  private currentMindMapId: string | undefined
  private createdMindMapIds: string[]

  constructor(
    private page: Page,
    private baseUrl: string,
    currentMindMapId: string | undefined,
    createdMindMapIds: string[]
  ) {
    this.currentMindMapId = currentMindMapId
    this.createdMindMapIds = createdMindMapIds
  }

  // 解析树形结构文本并创建思维导图
  async createMindMapFromTreeStructure(treeText: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    // 解析树形结构
    const nodes = this.parseTreeStructure(treeText)

    // 通过直接数据库操作创建思维导图
    const mindMapId = await this.createMindMapInDatabase(nodes)

    // 导航到新创建的思维导图
    await this.page.goto(`${this.baseUrl}/mindmaps/${mindMapId}`)
    await this.page.waitForLoadState('networkidle')

    // 等待思维导图组件加载完成
    await this.page.waitForSelector('[data-testid="root"]')
  }

  // 解析树形结构文本
  private parseTreeStructure(treeText: string): Array<{
    testId: string
    content: string
    parentTestId: string | null
    sortOrder: number
  }> {
    const lines = treeText
      .trim()
      .split('\n')
      .filter(line => line.trim())
    const nodes: Array<{
      testId: string
      content: string
      parentTestId: string | null
      sortOrder: number
    }> = []

    // 存储每个缩进级别的父节点
    const parentStack: Array<{ testId: string; level: number }> = []

    lines.forEach(line => {
      // 计算缩进级别（2个空格为一级）
      const match = line.match(/^(\s*)(.+)$/)
      if (!match) return

      const indentLevel = Math.floor(match[1].length / 2)
      const content = match[2].trim()

      // 清理父节点堆栈，保留当前级别的父节点
      while (parentStack.length > indentLevel) {
        parentStack.pop()
      }

      // 确定父节点和test-id
      let parentTestId: string | null = null
      let testId: string

      if (indentLevel === 0) {
        // 根级节点 - 检查是否已经有根节点
        const rootLevelNodes = nodes.filter(n => n.parentTestId === null)
        if (rootLevelNodes.length === 0) {
          testId = 'root'
        } else {
          testId = `float-${rootLevelNodes.length - 1}`
        }
      } else {
        // 子节点
        const parent = parentStack[parentStack.length - 1]
        if (!parent) throw new Error(`无法找到父节点，缩进级别: ${indentLevel}`)

        parentTestId = parent.testId

        // 计算同级节点的排序
        const siblingCount = nodes.filter(n => n.parentTestId === parentTestId).length
        testId = `${parentTestId}-${siblingCount}`
      }

      // 计算排序顺序
      const sortOrder = nodes.filter(n => n.parentTestId === parentTestId).length

      // 添加节点
      nodes.push({
        testId,
        content,
        parentTestId,
        sortOrder,
      })

      // 将当前节点加入父节点堆栈
      parentStack.push({ testId, level: indentLevel })
    })

    return nodes
  }

  // 在数据库中创建思维导图
  private async createMindMapInDatabase(
    nodes: Array<{
      testId: string
      content: string
      parentTestId: string | null
      sortOrder: number
    }>
  ): Promise<string> {
    // 导入数据库服务
    const { MindMapService } = await import('../../src/lib/database-postgres')

    // 生成思维导图ID
    const mindMapId = crypto.randomUUID()

    // 为每个节点生成唯一ID并建立ID映射
    const nodeIdMap = new Map<string, string>()
    nodes.forEach(node => {
      nodeIdMap.set(node.testId, crypto.randomUUID())
    })

    try {
      // 1. 创建思维导图记录
      const mindMapData = {
        title: `测试思维导图 ${new Date().toLocaleString()}`,
        user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        is_public: false,
      }

      await MindMapService.createMindMap({
        ...mindMapData,
        id: mindMapId,
      })

      // 2. 创建节点记录
      const nodeInserts = nodes.map(node => ({
        id: nodeIdMap.get(node.testId)!,
        mind_map_id: mindMapId,
        content: node.content,
        parent_node_id: node.parentTestId ? nodeIdMap.get(node.parentTestId) || null : null,
        sort_order: node.sortOrder,
        node_type: 'mindMapNode',
        style: {},
        embedding: undefined,
      }))

      // 批量插入节点
      await MindMapService.upsertNodes(nodeInserts)

      // 记录创建的思维导图ID用于清理
      this.currentMindMapId = mindMapId
      if (!this.createdMindMapIds.includes(mindMapId)) {
        this.createdMindMapIds.push(mindMapId)
      }

      return mindMapId
    } catch (error) {
      throw new Error(
        `创建思维导图失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
