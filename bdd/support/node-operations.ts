import { Page, ElementHandle } from '@playwright/test'

export class NodeOperations {
  constructor(private page: Page) {}

  // =========================
  // Test-ID 相关操作方法
  // =========================

  /**
   * 根据test-id查找节点元素
   */
  async findNodeByTestId(testId: string): Promise<ElementHandle<Element> | null> {
    if (!this.page) throw new Error('Page not initialized')

    try {
      // 直接使用语义化test-id查找节点组件
      await this.page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 10000 })
      return await this.page.$(`[data-testid="${testId}"]`)
    } catch {
      return null
    }
  }

  /**
   * 获取当前选中节点的test-id
   */
  async getCurrentSelectedNodeTestId(): Promise<string | null> {
    if (!this.page) return null

    try {
      // 查找选中状态的节点
      const selectedElement = await this.page.$('[data-node-selected="true"]')
      if (!selectedElement) return null

      return await selectedElement.getAttribute('data-testid')
    } catch (_error) {
      return null
    }
  }

  /**
   * 统一的节点选择方法
   */
  async selectNodeByTestId(testId: string): Promise<void> {
    const element = await this.findNodeByTestId(testId)
    if (!element) throw new Error(`找不到test-id为"${testId}"的节点`)

    await element.click()
    await this.page?.waitForTimeout(100)
  }

  // 等待新子节点出现并返回其test-id
  async waitForNewChildNode(parentTestId: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized')

    // 获取当前所有思维导图节点的test-id列表
    const getNodeTestIds = () => {
      const nodes = document.querySelectorAll(
        '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
      )
      return Array.from(nodes)
        .map(node => node.getAttribute('data-testid'))
        .filter(id => id)
    }

    const initialNodeTestIds = await this.page.evaluate(getNodeTestIds)

    // 等待出现新的节点test-id
    await this.page.waitForFunction(
      initialTestIds => {
        const currentTestIds = Array.from(
          document.querySelectorAll(
            '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
          )
        )
          .map(node => node.getAttribute('data-testid'))
          .filter(id => id)

        // Check if new nodes have been added

        return currentTestIds.length > initialTestIds.length
      },
      initialNodeTestIds,
      { timeout: 10000, polling: 500 }
    )

    // 等待一点时间确保节点完全渲染
    await this.page.waitForTimeout(1000)

    // 获取最终的节点test-id列表
    const finalNodeTestIds = await this.page.evaluate(getNodeTestIds)

    // 找出新增的节点
    const newTestIds = finalNodeTestIds.filter(testId => !initialNodeTestIds.includes(testId))

    if (newTestIds.length > 0) {
      // 优先返回父节点的子节点
      const childNode = newTestIds.find(testId => testId && testId.startsWith(`${parentTestId}-`))
      if (childNode) {
        return childNode
      }

      // 如果没有找到子节点，返回第一个新节点
      const firstNewNode = newTestIds[0]
      if (firstNewNode) {
        return firstNewNode
      }
    }

    throw new Error(`未能找到${parentTestId}的新子节点`)
  }

  // 点击空白区域取消所有节点选中
  async clickBlankArea() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击思维导图容器的空白区域
    const mindMapContainer = this.page.locator('.react-flow')
    await mindMapContainer.click({ position: { x: 50, y: 50 } })

    await this.page.waitForTimeout(300)
  }

  // 获取所有节点的test-id列表
  async getAllNodeTestIds(): Promise<string[]> {
    if (!this.page) throw new Error('Page not initialized')

    const nodeElements = await this.page
      .locator('[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]')
      .all()
    const testIds: string[] = []

    for (const element of nodeElements) {
      const testId = await element.getAttribute('data-testid')
      if (testId) {
        testIds.push(testId)
      }
    }

    return testIds
  }

  // 双击节点进入编辑模式，处理minimap拦截问题
  async doubleClickNode(testId: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    const element = await this.findNodeByTestId(testId)
    if (!element) throw new Error(`找不到节点"${testId}"`)

    try {
      // 尝试双击节点
      await element.dblclick()
      await this.page.waitForTimeout(300)
    } catch (_error) {
      // 如果仍然失败，使用force选项
      await this.page.dblclick(`[data-testid="${testId}"]`, { force: true })
      await this.page.waitForTimeout(300)
    }
  }

  // 编辑指定 test-id 节点的内容：双击进入编辑、直接操作input元素、回车确认
  async editNodeContent(testId: string, newContent: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    // 双击节点进入编辑模式
    await this.doubleClickNode(testId)
    await this.page.waitForTimeout(500)

    // 查找节点内的input元素
    const nodeElement = await this.findNodeByTestId(testId)
    if (!nodeElement) throw new Error(`找不到节点"${testId}"`)

    // 等待input元素出现
    const inputElement = await this.page.waitForSelector(`[data-testid="${testId}"] input`, {
      timeout: 300,
    })

    if (!inputElement) {
      throw new Error(`节点"${testId}"的input元素未找到`)
    }

    // 清空并填入新内容
    await inputElement.click() // 确保input获得焦点
    await inputElement.selectText() // 选中所有文本
    await inputElement.fill(newContent) // 直接填入新内容

    // 确认编辑
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(500)
  }

  // 为指定节点创建多个子节点
  async createMultipleChildNodes(parentTestId: string, childrenNames: string[]): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    // 为每个子节点名称创建节点
    for (let i = 0; i < childrenNames.length; i++) {
      const childName = childrenNames[i]

      // 选中父节点
      await this.selectNodeByTestId(parentTestId)
      await this.page.waitForTimeout(300)

      // 添加子节点 - 使用Tab键快捷方式
      await this.page.keyboard.press('Tab')
      await this.page.waitForTimeout(1500)

      // 计算预期的子节点test-id
      const expectedChildTestId = `${parentTestId}-${i}`

      // 等待子节点出现
      await this.page.waitForSelector(`[data-testid="${expectedChildTestId}"]`, {
        timeout: 8000,
      })

      // 编辑子节点内容
      await this.editNodeContent(expectedChildTestId, childName)
    }
  }

  // 点击子节点
  async clickChildNode() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击第二个节点（子节点）
    const childNode = this.page
      .locator('[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]')
      .nth(1)
    await childNode.click()
    // 等待节点选中状态更新
    await this.page.waitForFunction(
      () => {
        const selectedNodes = document.querySelectorAll('[data-node-selected="true"]')
        return selectedNodes.length > 0
      },
      { timeout: 300 }
    )
  }

  // 点击主节点
  async clickMainNode() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击主节点（根节点）
    const mainNode = this.page.locator('[data-testid="root"]')
    await mainNode.click()
    // 等待主节点选中状态更新
    await this.page.waitForFunction(
      () => {
        const rootNode = document.querySelector('[data-testid="root"]')
        return rootNode && rootNode.getAttribute('data-node-selected') === 'true'
      },
      { timeout: 300 }
    )
  }

  // 双击主节点
  async doubleClickMainNode() {
    if (!this.page) throw new Error('Page not initialized')

    // 找到并双击主节点（根节点）
    const mainNode = this.page.locator('[data-testid="root"]')
    await mainNode.dblclick()

    // 等待编辑模式激活（输入框出现）
    await this.page.waitForSelector('input[type="text"]', { timeout: 300 })
  }

  async inputText(text: string) {
    if (!this.page) throw new Error('Page not initialized')

    // 清空现有内容并输入新内容
    await this.page.keyboard.press('Control+a')
    await this.page.keyboard.type(text)
  }

  async pressEnter() {
    if (!this.page) throw new Error('Page not initialized')
    await this.page.keyboard.press('Enter')
  }

  async clickSaveButton() {
    if (!this.page) throw new Error('Page not initialized')

    // 尝试多种保存按钮选择器
    const saveButtonSelectors = [
      'button:has-text("保存")',
      'button[title*="保存"]',
      'button:has-text("Save")',
      '[data-testid*="save"]',
      'button:has([data-icon="save"])',
    ]

    let clicked = false
    for (const selector of saveButtonSelectors) {
      try {
        const button = this.page.locator(selector).first()
        if (await button.isVisible()) {
          await button.click()
          clicked = true
          break
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!clicked) {
      await this.page.keyboard.press('Control+S')
    }

    // 等待保存操作完成（通过检查节点没有编辑状态）
    await this.page.waitForFunction(
      () => {
        const editingNodes = document.querySelectorAll('input[type="text"]')
        return editingNodes.length === 0
      },
      { timeout: 300 }
    )
  }
}
