import { Page, ElementHandle } from '@playwright/test'
import { SmartWait } from './smart-wait'

export class NodeOperations {
  private smartWait: SmartWait

  constructor(private page: Page) {
    this.smartWait = new SmartWait(page)
  }

  // =========================
  // Test-ID 相关操作方法
  // =========================

  /**
   * 根据test-id查找节点元素
   */
  async findNodeByTestId(testId: string): Promise<ElementHandle<Element> | null> {
    if (!this.page) throw new Error('Page not initialized')

    try {
      // 使用SmartWait的智能等待
      await this.smartWait.waitForNodeVisible(testId, { timeout: 8000 })
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
    // 确保元素可交互
    await this.smartWait.waitForNodeInteractable(testId, { timeout: 5000 })

    // 使用locator而不是elementHandle来避免DOM分离问题
    const locator = this.page.locator(`[data-testid="${testId}"]`)
    await locator.click()

    // 等待选中状态生效
    await this.page.waitForFunction(
      testId => {
        const selectedElement = document.querySelector('[data-node-selected="true"]')
        if (!selectedElement) return false
        const selectedTestId = selectedElement.getAttribute('data-testid')
        return selectedTestId === testId
      },
      testId,
      { timeout: 2000 }
    )
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

    // 使用SmartWait等待节点数量变化
    await this.smartWait.waitForNodeCountChange(initialNodeTestIds.length + 1, { timeout: 8000 })

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

    // 等待所有节点取消选中状态
    await this.page.waitForFunction(
      () => {
        const selectedElements = document.querySelectorAll('[data-node-selected="true"]')
        return selectedElements.length === 0
      },
      undefined,
      { timeout: 2000 }
    )
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

    // 确保元素可交互
    await this.smartWait.waitForNodeInteractable(testId, { timeout: 5000 })

    const element = await this.page.$(`[data-testid="${testId}"]`)
    if (!element) throw new Error(`找不到节点"${testId}"`)

    try {
      // 尝试双击节点
      await element.dblclick()
    } catch (_error) {
      // 如果仍然失败，使用force选项
      await this.page.dblclick(`[data-testid="${testId}"]`, { force: true })
    }

    // 等待编辑模式激活（输入框出现）
    await this.page.waitForFunction(
      testId => {
        const inputElement = document.querySelector(`[data-testid="${testId}"] input`)
        return inputElement !== null
      },
      testId,
      { timeout: 2000 }
    )
  }

  /**
   * 为指定父节点添加子节点
   * 使用Tab快捷键创建子节点，等待新节点出现并返回其test-id
   */
  async addChildNode(parentTestId: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized')

    const startTime = Date.now()

    this.smartWait.waitForNodeVisible(parentTestId, { timeout: 6000 })
    // 计算预期的子节点test-id
    const expectedChildTestId = await this.calculateNextChildTestId(parentTestId)

    try {
      // 选中父节点
      await this.selectNodeByTestId(parentTestId)

      // 使用Tab快捷键添加子节点
      await this.page.keyboard.press('Tab')

      // 等待新子节点出现并验证父子关系
      await this.smartWait.waitForSpecificNodeWithValidation(expectedChildTestId, parentTestId, {
        timeout: 3000,
      })

      const duration = Date.now() - startTime
      console.log(
        `[INFO] 成功为节点"${parentTestId}"添加子节点"${expectedChildTestId}" (${duration}ms)`
      )

      return expectedChildTestId
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = `为节点"${parentTestId}"添加子节点失败 (${duration}ms)`

      console.error(`[ERROR] ${errorMessage}`, {
        parentTestId,
        expectedChildTestId,
        error: error instanceof Error ? error.message : String(error),
      })

      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 计算父节点的下一个子节点test-id
   */
  private async calculateNextChildTestId(parentTestId: string): Promise<string> {
    // 首先验证父节点确实存在
    const parentExists = await this.page.evaluate(parent => {
      return !!document.querySelector(`[data-testid="${parent}"]`)
    }, parentTestId)

    if (!parentExists) {
      throw new Error(`父节点"${parentTestId}"不存在，无法计算子节点test-id`)
    }

    const childCount = await this.page.evaluate(parent => {
      // 查找所有该父节点的直接子节点
      const childSelector = `[data-testid^="${parent}-"]`
      const childNodes = document.querySelectorAll(childSelector)

      // 过滤出直接子节点（避免包含孙子节点）
      const directChildren = Array.from(childNodes).filter(node => {
        const testId = node.getAttribute('data-testid')
        if (!testId || !testId.startsWith(`${parent}-`)) return false

        // 移除父节点前缀后，检查是否为直接子节点（只有一个数字）
        const suffix = testId.substring(`${parent}-`.length)
        return /^\d+$/.test(suffix)
      })
      return directChildren.length
    }, parentTestId)

    return `${parentTestId}-${childCount}`
  }

  /**
   * 删除指定的节点
   * 选中节点，按Delete键，确认删除
   */
  async deleteNode(testId: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    const startTime = Date.now()

    try {
      // 获取删除前的节点数量
      const initialNodeCount = await this.page.evaluate(() => {
        return document.querySelectorAll(
          '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
        ).length
      })

      // 选中要删除的节点
      await this.selectNodeByTestId(testId)

      // 按Delete键触发删除
      await this.page.keyboard.press('Delete')

      // 等待删除确认对话框出现
      try {
        await this.page.waitForSelector('[data-testid="alert-dialog-confirm"]', { timeout: 5000 })
      } catch (_error) {
        // 可能是根节点保护，检查是否有保护提示
        const protectionMessage = await this.page.locator('text="根节点不能被删除"').count()
        if (protectionMessage > 0) {
          throw new Error('试图删除受保护的根节点')
        }
        throw new Error('删除确认对话框未出现')
      }

      // 点击确认删除按钮
      const confirmButton = this.page.locator('[data-testid="alert-dialog-confirm"]')
      await confirmButton.click()

      // 等待对话框消失
      await this.page.waitForSelector('[data-testid="alert-dialog-confirm"]', {
        state: 'detached',
        timeout: 3000,
      })

      // 简化的验证：等待节点数量减少
      await this.page.waitForFunction(
        originalCount => {
          const currentCount = document.querySelectorAll(
            '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
          ).length
          return currentCount < originalCount
        },
        initialNodeCount,
        { timeout: 5000 }
      )

      const duration = Date.now() - startTime
      console.log(`[INFO] 成功删除节点"${testId}" (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[ERROR] 删除节点"${testId}"失败 (${duration}ms)`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // 编辑指定 test-id 节点的内容：双击进入编辑、直接操作input元素、回车确认
  async editNodeContent(testId: string, newContent: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    // 双击节点进入编辑模式
    await this.doubleClickNode(testId)

    // 等待input元素出现并可交互
    await this.page.waitForFunction(
      testId => {
        const inputElement = document.querySelector(`[data-testid="${testId}"] input`)
        return inputElement !== null
      },
      testId,
      { timeout: 2000 }
    )

    const inputElement = await this.page.$(`[data-testid="${testId}"] input`)
    if (!inputElement) {
      throw new Error(`节点"${testId}"的input元素未找到`)
    }

    // 清空并填入新内容
    await inputElement.click() // 确保input获得焦点
    await inputElement.selectText() // 选中所有文本
    await inputElement.fill(newContent) // 直接填入新内容

    // 确认编辑
    await this.page.keyboard.press('Enter')

    // 等待编辑完成（input消失，显示普通文本）
    await this.page.waitForFunction(
      testId => {
        const inputElement = document.querySelector(`[data-testid="${testId}"] input`)
        return inputElement === null
      },
      testId,
      { timeout: 3000 }
    )
  }

  // 为指定节点创建多个子节点
  async createMultipleChildNodes(parentTestId: string, childrenNames: string[]): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    // 为每个子节点名称创建节点
    for (let i = 0; i < childrenNames.length; i++) {
      const childName = childrenNames[i]

      // 选中父节点
      await this.selectNodeByTestId(parentTestId)

      // 添加子节点 - 使用Tab键快捷方式
      await this.page.keyboard.press('Tab')

      // 计算预期的子节点test-id
      const expectedChildTestId = `${parentTestId}-${i}`

      // 等待子节点出现
      await this.smartWait.waitForNodeVisible(expectedChildTestId, { timeout: 6000 })

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
      undefined,
      { timeout: 2000 }
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
        if (!rootNode) return false
        const selected = rootNode.getAttribute('data-node-selected')
        return selected === 'true'
      },
      undefined,
      { timeout: 2000 }
    )
  }

  // 双击主节点
  async doubleClickMainNode() {
    if (!this.page) throw new Error('Page not initialized')

    // 找到并双击主节点（根节点）
    const mainNode = this.page.locator('[data-testid="root"]')
    await mainNode.dblclick()

    // 等待编辑模式激活（输入框出现）
    await this.page.waitForFunction(
      () => {
        const inputElement = document.querySelector('input[type="text"]')
        return inputElement !== null
      },
      undefined,
      { timeout: 2000 }
    )
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
      undefined,
      { timeout: 2000 }
    )
  }
}
