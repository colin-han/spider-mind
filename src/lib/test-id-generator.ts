/**
 * Test-ID 生成器
 * 
 * 实现基于路径的稳定test-id生成系统：
 * - 根节点: "root"  
 * - 浮动节点: "float-0", "float-1", "float-2"...
 * - 子节点: "${父节点test-id}-${兄弟序号}" (从0开始)
 */

export interface NodeStructureInfo {
  id: string              // 节点UUID
  parentId: string | null // 父节点UUID
  isFloating: boolean     // 是否为浮动节点
  sortOrder: number       // 在兄弟节点中的排序
}

export interface TestNodeInfo extends NodeStructureInfo {
  testId: string         // 生成的test-id
  content: string        // 节点内容
  level: number          // 节点层级 (根节点为0)
}

export class TestIdGenerator {
  private nodeMap = new Map<string, TestNodeInfo>()
  private testIdToUuidMap = new Map<string, string>()
  private floatingNodeCounter = 0

  /**
   * 注册新节点并生成test-id
   */
  registerNode(nodeInfo: NodeStructureInfo, content = '新节点'): string {
    const testId = this.generateTestId(nodeInfo)
    const level = this.calculateNodeLevel(nodeInfo)
    
    const testNodeInfo: TestNodeInfo = {
      ...nodeInfo,
      testId,
      content,
      level
    }
    
    this.nodeMap.set(nodeInfo.id, testNodeInfo)
    this.testIdToUuidMap.set(testId, nodeInfo.id)
    
    return testId
  }

  /**
   * 生成test-id的核心方法
   */
  private generateTestId(nodeInfo: NodeStructureInfo): string {
    // 根节点
    if (!nodeInfo.parentId && !nodeInfo.isFloating) {
      return 'root'
    }
    
    // 浮动节点
    if (nodeInfo.isFloating && !nodeInfo.parentId) {
      const floatingIndex = this.floatingNodeCounter++
      return `float-${floatingIndex}`
    }
    
    // 子节点：需要基于父节点构建路径
    if (!nodeInfo.parentId) {
      throw new Error('非浮动子节点必须有父节点')
    }
    
    const parentInfo = this.nodeMap.get(nodeInfo.parentId)
    if (!parentInfo) {
      throw new Error(`找不到父节点信息: ${nodeInfo.parentId}`)
    }
    
    const siblingPosition = this.calculateSiblingPosition(nodeInfo)
    return `${parentInfo.testId}-${siblingPosition}`
  }

  /**
   * 计算节点在兄弟节点中的位置
   */
  private calculateSiblingPosition(nodeInfo: NodeStructureInfo): number {
    const siblings = Array.from(this.nodeMap.values())
      .filter(node => node.parentId === nodeInfo.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    
    // 如果当前节点还未注册到map中，需要基于sortOrder计算位置
    let position = 0
    for (const sibling of siblings) {
      if (sibling.sortOrder < nodeInfo.sortOrder) {
        position++
      }
    }
    
    return position
  }

  /**
   * 计算节点层级
   */
  private calculateNodeLevel(nodeInfo: NodeStructureInfo): number {
    if (!nodeInfo.parentId) {
      return 0 // 根节点或浮动节点都是第0层
    }
    
    const parentInfo = this.nodeMap.get(nodeInfo.parentId)
    if (!parentInfo) {
      throw new Error(`找不到父节点信息: ${nodeInfo.parentId}`)
    }
    
    return parentInfo.level + 1
  }

  /**
   * 根据UUID获取test-id
   */
  getTestId(nodeUuid: string): string | undefined {
    const nodeInfo = this.nodeMap.get(nodeUuid)
    return nodeInfo?.testId
  }

  /**
   * 根据test-id获取UUID
   */
  getUuid(testId: string): string | undefined {
    return this.testIdToUuidMap.get(testId)
  }

  /**
   * 获取节点信息
   */
  getNodeInfo(nodeUuid: string): TestNodeInfo | undefined {
    return this.nodeMap.get(nodeUuid)
  }

  /**
   * 移除节点
   */
  removeNode(nodeUuid: string): void {
    const nodeInfo = this.nodeMap.get(nodeUuid)
    if (nodeInfo) {
      this.nodeMap.delete(nodeUuid)
      this.testIdToUuidMap.delete(nodeInfo.testId)
    }
  }

  /**
   * 更新节点内容
   */
  updateNodeContent(nodeUuid: string, content: string): void {
    const nodeInfo = this.nodeMap.get(nodeUuid)
    if (nodeInfo) {
      nodeInfo.content = content
    }
  }

  /**
   * 获取所有节点信息
   */
  getAllNodes(): TestNodeInfo[] {
    return Array.from(this.nodeMap.values())
  }

  /**
   * 获取节点的直接子节点
   */
  getChildren(nodeUuid: string): TestNodeInfo[] {
    return Array.from(this.nodeMap.values())
      .filter(node => node.parentId === nodeUuid)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  /**
   * 重置生成器状态
   */
  reset(): void {
    this.nodeMap.clear()
    this.testIdToUuidMap.clear()
    this.floatingNodeCounter = 0
  }

  /**
   * 验证test-id是否有效
   */
  isValidTestId(testId: string): boolean {
    // 根节点
    if (testId === 'root') return true
    
    // 浮动节点
    if (/^float-\d+$/.test(testId)) return true
    
    // 子节点路径
    if (/^(root|float-\d+)(-\d+)+$/.test(testId)) return true
    
    return false
  }

  /**
   * 从test-id解析层级信息
   */
  parseTestIdInfo(testId: string): { level: number; isFloating: boolean; parentTestId?: string } | null {
    if (!this.isValidTestId(testId)) return null
    
    if (testId === 'root') {
      return { level: 0, isFloating: false }
    }
    
    if (testId.startsWith('float-')) {
      return { level: 0, isFloating: true }
    }
    
    // 解析子节点路径
    const parts = testId.split('-')
    const level = parts.length - 1
    const parentParts = parts.slice(0, -1)
    const parentTestId = parentParts.join('-')
    
    return {
      level,
      isFloating: parentTestId.startsWith('float-'),
      parentTestId
    }
  }
}