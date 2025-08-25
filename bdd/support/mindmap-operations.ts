import { Page } from '@playwright/test'
import { SmartWait } from './smart-wait'

export class MindMapOperations {
  private currentMindMapId: string | undefined
  private createdMindMapIds: string[]
  private smartWait: SmartWait

  constructor(
    private page: Page,
    private baseUrl: string,
    currentMindMapId: string | undefined,
    createdMindMapIds: string[]
  ) {
    this.currentMindMapId = currentMindMapId
    this.createdMindMapIds = createdMindMapIds
    this.smartWait = new SmartWait(page)
  }

  // 思维导图操作方法
  async clickNewMindMapButtonOnly() {
    if (!this.page) throw new Error('Page not initialized')

    // 等待创建按钮可交互
    await this.smartWait.waitForElementInteractable('create-mindmap-button', { timeout: 8000 })

    await this.page.click('[data-testid="create-mindmap-button"]')

    // 等待页面导航到思维导图编辑页面
    await this.smartWait.waitForNavigation('**/mindmaps/**', { timeout: 12000 })

    // 提取并跟踪新创建的思维导图ID
    await this.extractAndTrackMindMapId()

    // 等待思维导图组件和根节点加载完成
    await this.smartWait.waitForElementVisible('root', { timeout: 8000 })

    // 等待思维导图组件完全加载（通过检查节点可交互性）
    await this.page.waitForFunction(
      () => {
        const rootNode = document.querySelector('[data-testid="root"]') as HTMLElement
        return rootNode && rootNode.offsetWidth > 0 && rootNode.offsetHeight > 0
      },
      { timeout: 3000 }
    )
  }

  async clickFirstMindMapCard() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击第一个思维导图卡片进入编辑页面
    await this.page.click('a[href*="/mindmaps/"]:first-child')

    // 等待跳转到编辑页面
    await this.smartWait.waitForNavigation('**/mindmaps/**', { timeout: 10000 })

    // 提取并跟踪思维导图ID
    await this.extractAndTrackMindMapId()
  }

  async extractAndTrackMindMapId() {
    if (!this.page) throw new Error('Page not initialized')

    // 从URL中提取思维导图ID
    const url = this.page.url()
    const matches = url.match(/\/mindmaps\/([^\/]+)/)
    if (matches) {
      const mindMapId = matches[1]
      this.currentMindMapId = mindMapId

      // 只有当ID还没有被跟踪时才添加到列表中
      if (!this.createdMindMapIds.includes(mindMapId)) {
        this.createdMindMapIds.push(mindMapId)
      }
    }
  }

  // 创建包含主节点的思维导图
  async createMindMapWithMainNode(name?: string) {
    // 直接通过API创建思维导图，而不是通过UI
    if (!this.page) throw new Error('Page not initialized')

    const title = name || '新思维导图'

    // 创建思维导图
    const createResponse = await this.page.evaluate(async title => {
      const response = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        }),
      })
      return response.json()
    }, title)

    if (createResponse.success) {
      this.currentMindMapId = createResponse.data.id
      this.createdMindMapIds.push(createResponse.data.id)
    }

    // 确保在首页
    await this.page.goto(`${this.baseUrl}/mindmaps`)
    await this.page.waitForLoadState('networkidle')
  }

  // 打开现有思维导图
  async openExistingMindMap() {
    // 如果不在思维导图列表页，先导航过去
    if (!this.page?.url().endsWith('/mindmaps')) {
      await this.page?.goto('/mindmaps')
    }

    // 等待思维导图卡片加载
    await this.smartWait.waitForCondition(
      async () => {
        const cards = await this.page?.$$('a[href*="/mindmaps/"]')
        return (cards?.length || 0) > 0
      },
      '思维导图卡片加载完成',
      { timeout: 8000 }
    )

    await this.clickFirstMindMapCard()
    // 等待思维导图组件加载完成（页面跳转已经在clickFirstMindMapCard中处理）
    await this.smartWait.waitForCondition(
      async () => {
        const nodes = await this.page?.$$('[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]')
        return (nodes?.length || 0) > 0
      },
      '思维导图节点加载完成',
      { timeout: 12000 }
    )
    
    // 等待React组件完全初始化（检查根节点加载）
    await this.smartWait.waitForElementVisible('root', { timeout: 2000 })
  }

  // 从列表中打开思维导图
  async openMindMapFromList() {
    await this.clickFirstMindMapCard()
  }

  // 创建包含子节点的思维导图
  async openMindMapWithChildNodes() {
    if (!this.page) throw new Error('Page not initialized')

    // 复用现有方法
    await this.openExistingMindMap()
    // 等待思维导图完全稳定后添加子节点
    await this.smartWait.waitForNetworkIdle({ timeout: 3000 })
    await this.clickAddChildNode()
  }

  async clickAddChildNode() {
    if (!this.page) throw new Error('Page not initialized')

    await this.page.click('button:has-text("添加节点")')

    // 等待新节点出现在DOM中
    await this.smartWait.waitForCondition(
      async () => {
        const nodes = await this.page.$$('[data-testid*="root-"]')
        return nodes.length > 0
      },
      '新子节点出现',
      { timeout: 2000 }
    )
  }

  async verifyStayOnCurrentMindMap() {
    if (!this.page) throw new Error('Page not initialized')

    // 验证URL还是当前思维导图的编辑页面
    const currentUrl = this.page.url()
    return this.currentMindMapId ? currentUrl.includes(this.currentMindMapId) : false
  }

  // 清理测试期间创建的思维导图
  async cleanupMindMaps() {
    if (this.createdMindMapIds.length === 0) {
      return
    }

    for (const mindMapId of this.createdMindMapIds) {
      try {
        // 通过API删除思维导图
        if (this.page) {
          await this.page.evaluate(async id => {
            try {
              const response = await fetch(`/api/mindmaps/${id}`, {
                method: 'DELETE',
              })
              return response.ok
            } catch (error) {
              console.error('删除思维导图失败:', error)
              return false
            }
          }, mindMapId)
        }
      } catch (error) {
        // 继续删除其他思维导图，不中断清理流程
        console.error('删除思维导图失败:', error)
      }
    }

    // 清空跟踪列表
    this.createdMindMapIds.length = 0
  }

  getCurrentMindMapId(): string | undefined {
    return this.currentMindMapId
  }

  getCreatedMindMapIds(): string[] {
    return this.createdMindMapIds
  }
}
