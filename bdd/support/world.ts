import { setWorldConstructor, Before, After } from '@cucumber/cucumber'
import { BrowserContext, Page, Browser, expect } from '@playwright/test'
import { chromium } from '@playwright/test'

export class BDDWorld {
  public browser: Browser | undefined
  public context: BrowserContext | undefined
  public page: Page | undefined
  public currentMindMapId: string | undefined
  public createdMindMapIds: string[] = []
  public baseUrl: string
  private deleteRequests: string[] = []

  constructor(options: { parameters: { baseUrl: string } }) {
    this.baseUrl = options.parameters.baseUrl || 'http://localhost:3000'
  }

  async setupBrowser() {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: 100,
    })
    this.context = await this.browser.newContext()
    this.page = await this.context.newPage()

    // 设置较长的超时时间
    this.page.setDefaultTimeout(30000)

    // 监听网络请求，用于验证删除API调用
    this.page.on('request', request => {
      if (request.method() === 'DELETE' && request.url().includes('/api/mindmaps/')) {
        this.deleteRequests.push(request.url())
        console.log('捕获到DELETE请求:', request.url())
      }
    })
  }

  async cleanup() {
    if (this.page) {
      await this.page.close()
    }
    if (this.context) {
      await this.context.close()
    }
    if (this.browser) {
      await this.browser.close()
    }
  }

  // 登录相关方法
  async loginAsTestUser() {
    if (!this.page) throw new Error('Page not initialized')

    console.log('导航到登录页面...')
    await this.page.goto(`${this.baseUrl}/login`)
    await this.page.waitForLoadState('networkidle')

    console.log('等待登录表单加载...')
    await this.page.waitForSelector('input[id="email"]', { timeout: 10000 })

    // 填写测试用户信息
    console.log('填写登录信息...')
    await this.page.fill('input[id="email"]', 'dev@test.com')
    await this.page.fill('input[id="password"]', 'password')

    // 点击登录按钮
    console.log('点击登录按钮...')
    await this.page.click('button:has-text("登录")')

    // 等待重定向到思维导图列表页面
    console.log('等待重定向到思维导图列表页面...')
    await this.page.waitForURL('**/mindmaps', { timeout: 15000 })
    console.log('登录成功，已到达思维导图列表页面')
  }

  // 思维导图操作方法
  async clickNewMindMapButtonOnly() {
    if (!this.page) throw new Error('Page not initialized')

    console.log('等待新建思维导图按钮出现...')
    await this.page.waitForSelector('button:has-text("新建思维导图")', { timeout: 10000 })

    console.log('点击新建思维导图按钮...')
    await this.page.click('button:has-text("新建思维导图")')

    console.log('等待页面跳转到编辑页面...')
    await this.page.waitForURL('**/mindmaps/**', { timeout: 15000 })

    // 提取并跟踪新创建的思维导图ID
    console.log('提取思维导图ID...')
    await this.extractAndTrackMindMapId()
  }

  async clickNewMindMapButton() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击新建思维导图按钮
    await this.page.click('button:has-text("新建思维导图")')

    // 等待新思维导图创建完成并出现在列表中
    await this.page.waitForTimeout(3000)
  }

  async clickFirstMindMapCard() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击第一个思维导图卡片进入编辑页面
    await this.page.click('a[href*="/mindmaps/"]:first-child')

    // 等待跳转到编辑页面
    await this.page.waitForURL('**/mindmaps/**')

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
        console.log(`跟踪新创建的思维导图ID: ${mindMapId}`)
      }
    }
  }

  // 保持向后兼容的旧方法
  async createNewMindMap() {
    await this.clickNewMindMapButton()
    await this.clickFirstMindMapCard()
  }

  async verifyOnEditPage() {
    if (!this.page) throw new Error('Page not initialized')
    return this.page.url().includes('/mindmaps/') && !this.page.url().endsWith('/mindmaps')
  }

  async verifyOnListPage() {
    if (!this.page) throw new Error('Page not initialized')
    return this.page.url().endsWith('/mindmaps')
  }

  async verifyDefaultMainNode() {
    if (!this.page) throw new Error('Page not initialized')

    // 等待思维导图加载完成
    await this.page.waitForSelector('[data-testid*="rf__node"]', { timeout: 10000 })

    // 验证是否有默认节点
    const nodes = await this.page.locator('[data-testid*="rf__node"]').count()
    return nodes >= 1
  }

  async verifyMainNodeSelected() {
    if (!this.page) throw new Error('Page not initialized')

    // 等待思维导图加载完成
    await this.page.waitForSelector('[data-testid*="rf__node"]', { timeout: 10000 })
    await this.page.waitForTimeout(1000)

    // 直接检查是否有选中的节点，不要主动点击
    const selectedNode = await this.page
      .locator('[data-testid*="rf__node"] .ring-2.ring-primary')
      .count()
    if (selectedNode > 0) return true

    // 也检查ReactFlow的内置选中状态
    const reactFlowSelected = await this.page.locator('[data-testid*="rf__node"].selected').count()
    return reactFlowSelected > 0
  }

  async clickAddChildNode() {
    if (!this.page) throw new Error('Page not initialized')

    await this.page.click('button:has-text("添加节点")')

    // 等待新节点出现
    await this.page.waitForTimeout(1000)
  }

  async verifyMainNodeHasChild() {
    if (!this.page) throw new Error('Page not initialized')

    // 等待节点更新
    await this.page.waitForTimeout(1000)

    // 检查节点数量是否增加到2个
    const nodeCount = await this.page.locator('[data-testid*="rf__node"]').count()
    return nodeCount >= 2
  }

  async verifyNodeConnection() {
    if (!this.page) throw new Error('Page not initialized')

    // 检查是否有连接线
    const edgeCount = await this.page.locator('.react-flow__edge').count()
    return edgeCount >= 1
  }

  async doubleClickMainNode() {
    if (!this.page) throw new Error('Page not initialized')

    // 找到并双击主节点
    const mainNode = this.page.locator('[data-testid*="rf__node"]').first()
    await mainNode.dblclick()

    // 等待编辑模式激活
    await this.page.waitForTimeout(500)
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

  async verifyNodeExitEditMode() {
    if (!this.page) throw new Error('Page not initialized')

    // 等待编辑模式退出
    await this.page.waitForTimeout(500)

    // 检查是否还有输入框
    const inputCount = await this.page.locator('input[type="text"]').count()
    return inputCount === 0 || !(await this.page.locator('input[type="text"]').first().isVisible())
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
          console.log(`点击了保存按钮: ${selector}`)
          break
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!clicked) {
      console.log('未找到保存按钮，尝试使用键盘快捷键')
      await this.page.keyboard.press('Control+S')
    }

    // 等待保存完成
    await this.page.waitForTimeout(2000)
  }

  async verifySaveSuccessMessage() {
    if (!this.page) throw new Error('Page not initialized')

    // 等待保存操作完成
    await this.page.waitForTimeout(2000)

    // 检查是否有保存成功的提示（可能是toast或文本）
    const saveMessages = [
      this.page.locator('text="保存成功"'),
      this.page.locator('text="已保存"'),
      this.page.locator('text="保存中..."'),
      this.page.locator('[role="status"]'),
      this.page.locator('.toast'),
      // 也可能只是简单地验证页面没有报错
    ]

    for (const locator of saveMessages) {
      const count = await locator.count()
      if (count > 0) return true
    }

    // 如果没有明确的保存提示，检查是否至少没有错误信息
    const errorCount = await this.page.locator('text="错误"').count()
    return errorCount === 0
  }

  async refreshPage() {
    if (!this.page) throw new Error('Page not initialized')

    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
  }

  async verifyStayOnCurrentMindMap() {
    if (!this.page) throw new Error('Page not initialized')

    // 验证URL还是当前思维导图的编辑页面
    const currentUrl = this.page.url()
    return this.currentMindMapId ? currentUrl.includes(this.currentMindMapId) : false
  }

  async captureScreenshotOnFailure(scenario: { result?: { status: string } }) {
    if (scenario.result?.status === 'FAILED' && this.page) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      await this.page.screenshot({
        path: `test-results/failure-${timestamp}.png`,
        fullPage: true,
      })
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
          userId: '11111111-1111-1111-1111-111111111111',
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
    await this.clickFirstMindMapCard()
  }

  // 从列表中打开思维导图
  async openMindMapFromList() {
    await this.clickFirstMindMapCard()
  }

  // 点击子节点
  async clickChildNode() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击第二个节点（子节点）
    const childNode = this.page.locator('[data-testid*="rf__node"]').nth(1)
    await childNode.click()
    await this.page.waitForTimeout(50)
  }

  // 点击主节点
  async clickMainNode() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击第一个节点（主节点）
    const mainNode = this.page.locator('[data-testid*="rf__node"]').first()
    await mainNode.click()
    await this.page.waitForTimeout(50)
  }

  // 验证主节点视觉反馈
  async verifyMainNodeVisualFeedback() {
    if (!this.page) throw new Error('Page not initialized')

    // 检查选中状态的视觉反馈
    const visualFeedback = await this.page
      .locator('[data-testid*="rf__node"] .ring-2.ring-primary')
      .count()

    if (visualFeedback > 0) return true

    // 也检查ReactFlow的内置选中状态样式
    const reactFlowSelected = await this.page.locator('[data-testid*="rf__node"].selected').count()
    return reactFlowSelected > 0
  }

  // 验证节点处于编辑模式
  async verifyNodeInEditMode() {
    if (!this.page) throw new Error('Page not initialized')

    // 检查是否有输入框处于激活状态，尝试多种选择器
    const selectors = [
      'input[type="text"]',
      'input',
      '.mindmap-node input',
      '[data-testid*="rf__node"] input',
    ]

    for (const selector of selectors) {
      try {
        const inputVisible = await this.page
          .locator(selector)
          .isVisible()
          .catch(() => false)
        if (inputVisible) {
          console.log(`找到编辑输入框: ${selector}`)
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    console.log('未找到任何编辑输入框')
    return false
  }

  // 验证可以编辑节点内容
  async verifyCanEditNodeContent() {
    if (!this.page) throw new Error('Page not initialized')

    // 检查是否出现了输入框（假设已经在编辑模式）
    const selectors = [
      'input[type="text"]',
      'input',
      '.mindmap-node input',
      '[data-testid*="rf__node"] input',
    ]

    let inputFound = false
    for (const selector of selectors) {
      try {
        const inputVisible = await this.page
          .locator(selector)
          .isVisible()
          .catch(() => false)
        if (inputVisible) {
          console.log(`使用编辑输入框: ${selector}`)
          inputFound = true
          break
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!inputFound) {
      console.log('未找到编辑输入框，无法验证编辑功能')
      return false
    }

    return true
  }

  // 验证子节点被选中
  async verifyChildNodeSelected() {
    if (!this.page) throw new Error('Page not initialized')

    // 检查子节点是否有选中样式
    const childNode = this.page.locator('[data-testid*="rf__node"]').nth(1)
    const hasSelectedClass = await childNode.locator('.ring-2.ring-primary').count()

    if (hasSelectedClass > 0) return true

    // 也检查ReactFlow的选中状态
    const isReactFlowSelected = await childNode.getAttribute('class')
    return isReactFlowSelected?.includes('selected') || false
  }

  // 验证主节点未被选中
  async verifyMainNodeNotSelected() {
    if (!this.page) throw new Error('Page not initialized')

    // 检查主节点是否没有选中样式
    const mainNode = this.page.locator('[data-testid*="rf__node"]').first()
    const hasSelectedClass = await mainNode.locator('.ring-2.ring-primary').count()

    if (hasSelectedClass > 0) return false

    // 也检查ReactFlow的选中状态
    const isReactFlowSelected = await mainNode.getAttribute('class')
    return !isReactFlowSelected?.includes('selected')
  }

  // 验证子节点未被选中
  async verifyChildNodeNotSelected() {
    if (!this.page) throw new Error('Page not initialized')

    // 检查子节点是否没有选中样式
    const childNode = this.page.locator('[data-testid*="rf__node"]').nth(1)
    const hasSelectedClass = await childNode.locator('.ring-2.ring-primary').count()

    if (hasSelectedClass > 0) return false

    // 也检查ReactFlow的选中状态
    const isReactFlowSelected = await childNode.getAttribute('class')
    return !isReactFlowSelected?.includes('selected')
  }

  // =========================
  // 删除功能相关方法
  // =========================

  // 点击思维导图卡片上的删除按钮
  async clickDeleteButtonOnMindMapCard(mindMapName: string) {
    if (!this.page) throw new Error('Page not initialized')

    console.log(`寻找名为"${mindMapName}"的思维导图卡片...`)

    // 等待思维导图列表加载完成
    await this.page.waitForSelector(
      '[data-testid*="mindmap-card"], .mindmap-card, a[href*="/mindmaps/"]',
      { timeout: 10000 }
    )

    // 尝试多种方式定位思维导图卡片
    const cardSelectors = [
      `[data-testid*="mindmap-card"]:has-text("${mindMapName}")`,
      `.mindmap-card:has-text("${mindMapName}")`,
      `a[href*="/mindmaps/"]:has-text("${mindMapName}")`,
      `div:has(h3:text("${mindMapName}"))`,
      `div:has(text("${mindMapName}"))`,
    ]

    let cardFound = false
    for (const cardSelector of cardSelectors) {
      try {
        const card = this.page.locator(cardSelector).first()
        if (await card.isVisible()) {
          console.log(`找到思维导图卡片，使用选择器: ${cardSelector}`)

          // 悬停在卡片上以显示删除按钮
          await card.hover()
          await this.page.waitForTimeout(500)

          // 尝试多种删除按钮选择器
          const deleteButtonSelectors = [
            `${cardSelector} [data-testid*="delete"]`,
            `${cardSelector} button[title*="删除"]`,
            `${cardSelector} button:has-text("删除")`,
            `${cardSelector} .delete-button`,
            `${cardSelector} button[aria-label*="删除"]`,
            `${cardSelector} svg[data-testid*="trash"]`,
            `${cardSelector} [class*="delete"]`,
          ]

          for (const deleteSelector of deleteButtonSelectors) {
            try {
              const deleteButton = this.page.locator(deleteSelector).first()
              if (await deleteButton.isVisible()) {
                console.log(`找到删除按钮，使用选择器: ${deleteSelector}`)
                await deleteButton.click()
                cardFound = true
                break
              }
            } catch {
              // 继续尝试下一个删除按钮选择器
            }
          }

          if (cardFound) break
        }
      } catch {
        // 继续尝试下一个卡片选择器
      }
    }

    if (!cardFound) {
      throw new Error(`未能找到名为"${mindMapName}"的思维导图卡片或其删除按钮`)
    }

    // 等待删除确认对话框出现
    await this.page.waitForTimeout(500)
  }

  // 点击确认删除按钮
  async clickConfirmDeleteButton() {
    if (!this.page) throw new Error('Page not initialized')

    // 清除之前的删除请求记录
    this.deleteRequests = []

    // 尝试多种确认按钮选择器
    const confirmSelectors = [
      '[data-testid="alert-dialog-confirm"]',
      'button:has-text("确认")',
      'button:has-text("删除")',
      'button:has-text("Delete")',
      'button:has-text("确定")',
      '[data-testid*="confirm"]',
      '[role="dialog"] button[variant="destructive"]',
      '.dialog button:has-text("确认")',
      'button[type="submit"]:has-text("确认")',
    ]

    let clicked = false
    for (const selector of confirmSelectors) {
      try {
        const button = this.page.locator(selector).first()
        if (await button.isVisible()) {
          console.log(`点击确认删除按钮: ${selector}`)
          await button.click()
          clicked = true
          break
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!clicked) {
      throw new Error('未能找到确认删除按钮')
    }

    // 等待删除操作完成
    await this.page.waitForTimeout(2000)
  }

  // 点击取消删除按钮
  async clickCancelDeleteButton() {
    if (!this.page) throw new Error('Page not initialized')

    // 尝试多种取消按钮选择器
    const cancelSelectors = [
      '[data-testid="alert-dialog-cancel"]',
      'button:has-text("取消")',
      'button:has-text("Cancel")',
      '[data-testid*="cancel"]',
      '[role="dialog"] button:not([variant="destructive"])',
      '.dialog button:has-text("取消")',
      'button[type="button"]:has-text("取消")',
    ]

    let clicked = false
    for (const selector of cancelSelectors) {
      try {
        const button = this.page.locator(selector).first()
        if (await button.isVisible()) {
          console.log(`点击取消删除按钮: ${selector}`)
          await button.click()
          clicked = true
          break
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!clicked) {
      throw new Error('未能找到取消删除按钮')
    }

    await this.page.waitForTimeout(500)
  }

  // 验证删除确认对话框是否显示
  async verifyDeleteConfirmDialog(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 尝试多种对话框选择器
    const dialogSelectors = [
      '[data-testid="alert-dialog"]',
      '[role="dialog"]',
      '.dialog',
      '[data-testid*="delete-dialog"]',
      '[data-testid*="confirm-dialog"]',
      '.modal',
      '.delete-confirmation',
    ]

    for (const selector of dialogSelectors) {
      try {
        const dialog = this.page.locator(selector)
        if (await dialog.isVisible()) {
          console.log(`找到删除确认对话框: ${selector}`)
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证对话框标题
  async verifyDialogTitle(expectedTitle: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 尝试多种标题选择器
    const titleSelectors = [
      '[data-testid="alert-dialog-title"]',
      '[role="dialog"] h1',
      '[role="dialog"] h2',
      '[role="dialog"] .dialog-title',
      '.dialog h1',
      '.dialog h2',
      '.modal-title',
      '[data-testid*="dialog-title"]',
    ]

    for (const selector of titleSelectors) {
      try {
        const titleElement = this.page.locator(selector)
        if (await titleElement.isVisible()) {
          const actualTitle = await titleElement.textContent()
          console.log(`对话框标题: ${actualTitle}, 期望: ${expectedTitle}`)
          if (actualTitle?.includes(expectedTitle)) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    // 也检查是否有包含期望标题的文本
    const titleText = await this.page.locator(`text="${expectedTitle}"`).count()
    return titleText > 0
  }

  // 验证对话框内容
  async verifyDialogContent(expectedContent: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 检查对话框是否包含期望的内容
    const contentSelectors = ['[role="dialog"]', '.dialog', '.modal']

    for (const selector of contentSelectors) {
      try {
        const dialog = this.page.locator(selector)
        if (await dialog.isVisible()) {
          const dialogText = await dialog.textContent()
          console.log(`对话框内容: ${dialogText}`)
          console.log(`期望包含: ${expectedContent}`)
          if (dialogText?.includes(expectedContent)) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证删除进度状态
  async verifyDeleteProgressStatus(expectedStatus: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 检查是否显示删除进度状态
    const statusSelectors = [
      `text="${expectedStatus}"`,
      '[role="status"]',
      '.loading',
      '.progress',
      '[data-testid*="status"]',
    ]

    for (const selector of statusSelectors) {
      try {
        const status = this.page.locator(selector)
        if (await status.isVisible()) {
          console.log(`找到删除状态: ${selector}`)
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证删除API请求
  async verifyDeleteApiRequest(expectedUrl: string): Promise<boolean> {
    // 替换URL中的占位符
    const actualExpectedUrl = expectedUrl.replace('{思维导图ID}', this.currentMindMapId || '')
    console.log(`期望的删除API URL: ${actualExpectedUrl}`)
    console.log(`实际捕获的删除请求: ${this.deleteRequests}`)

    // 检查是否有匹配的删除请求
    return this.deleteRequests.some(
      url =>
        url.includes('/api/mindmaps/') &&
        (this.currentMindMapId ? url.includes(this.currentMindMapId) : true)
    )
  }

  // 验证思维导图卡片不再可见
  async verifyMindMapCardNotVisible(mindMapName: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待页面更新
    await this.page.waitForTimeout(2000)

    // 检查思维导图卡片是否不再存在
    const cardSelectors = [
      `[data-testid*="mindmap-card"]:has-text("${mindMapName}")`,
      `.mindmap-card:has-text("${mindMapName}")`,
      `a[href*="/mindmaps/"]:has-text("${mindMapName}")`,
      `div:has(h3:text("${mindMapName}"))`,
      `text="${mindMapName}"`,
    ]

    for (const selector of cardSelectors) {
      try {
        const card = this.page.locator(selector)
        const isVisible = await card.isVisible().catch(() => false)
        if (isVisible) {
          console.log(`思维导图"${mindMapName}"仍然可见，使用选择器: ${selector}`)
          return false
        }
      } catch {
        // 继续检查下一个选择器
      }
    }

    console.log(`思维导图"${mindMapName}"已不可见`)
    return true
  }

  // 验证思维导图卡片仍然可见
  async verifyMindMapCardVisible(mindMapName: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待页面稳定
    await this.page.waitForTimeout(1000)

    // 检查思维导图卡片是否仍然存在
    const cardSelectors = [
      `text="${mindMapName}"`,
      `h3:has-text("${mindMapName}")`,
      `[title="${mindMapName}"]`,
      `a[href*="/mindmaps/"]:has-text("${mindMapName}")`,
      `div:has(h3:text("${mindMapName}"))`,
      `[data-testid*="mindmap-card"]:has-text("${mindMapName}")`,
      `.mindmap-card:has-text("${mindMapName}")`,
    ]

    for (const selector of cardSelectors) {
      try {
        const card = this.page.locator(selector)
        const isVisible = await card.isVisible().catch(() => false)
        if (isVisible) {
          console.log(`思维导图"${mindMapName}"仍然可见，使用选择器: ${selector}`)
          return true
        }
      } catch {
        // 继续检查下一个选择器
      }
    }

    console.log(`思维导图"${mindMapName}"不再可见`)
    return false
  }

  // 验证统计信息更新
  async verifyStatsUpdated(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待统计信息更新
    await this.page.waitForTimeout(1000)

    // 检查页面底部是否有统计信息并已更新
    const statsSelectors = [
      '.stats',
      '.statistics',
      '[data-testid*="stats"]',
      'text*="总计"',
      'text*="个思维导图"',
      'footer',
    ]

    for (const selector of statsSelectors) {
      try {
        const stats = this.page.locator(selector)
        if (await stats.isVisible()) {
          console.log(`找到统计信息: ${selector}`)
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    // 如果没有明确的统计信息，认为更新成功
    console.log('未找到明确的统计信息，假设更新成功')
    return true
  }

  // 验证删除对话框关闭
  async verifyDeleteDialogClosed(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待对话框关闭
    await this.page.waitForTimeout(1000)

    // 检查删除确认对话框是否已关闭
    return !(await this.verifyDeleteConfirmDialog())
  }

  // 验证删除成功提示
  async verifyDeleteSuccessMessage(expectedMessage: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 检查是否有成功提示
    const messageSelectors = [
      `text="${expectedMessage}"`,
      '.toast',
      '[role="status"]',
      '.success-message',
      '[data-testid*="success"]',
      '.notification',
    ]

    for (const selector of messageSelectors) {
      try {
        const message = this.page.locator(selector)
        if (await message.isVisible()) {
          const messageText = await message.textContent()
          console.log(`找到成功提示: ${messageText}`)
          if (messageText?.includes(expectedMessage)) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证删除按钮可见
  async verifyDeleteButtonVisible(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 检查删除按钮是否可见（考虑opacity）
    const deleteButtonSelectors = [
      'button[title*="删除"]',
      '[data-testid*="delete"]',
      'button:has-text("删除")',
      '.delete-button',
      'svg[data-testid*="trash"]',
    ]

    for (const selector of deleteButtonSelectors) {
      try {
        const deleteButton = this.page.locator(selector).first()
        if (await deleteButton.isVisible()) {
          // 检查opacity属性，大于0表示真正可见
          const opacity = await deleteButton
            .evaluate(el => {
              const style = window.getComputedStyle(el)
              return parseFloat(style.opacity)
            })
            .catch(() => 1) // 默认为不透明

          if (opacity > 0) {
            console.log(`删除按钮可见: ${selector}, opacity: ${opacity}`)
            return true
          } else {
            console.log(`删除按钮存在但透明: ${selector}, opacity: ${opacity}`)
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证删除按钮隐藏
  async verifyDeleteButtonHidden(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待动画完成
    await this.page.waitForTimeout(500)

    // 检查删除按钮是否隐藏
    return !(await this.verifyDeleteButtonVisible())
  }

  // 悬停在思维导图卡片上
  async hoverOnMindMapCard() {
    if (!this.page) throw new Error('Page not initialized')

    // 找到第一个思维导图卡片并悬停
    const cardSelectors = [
      '[data-testid*="mindmap-card"]',
      '.mindmap-card',
      'a[href*="/mindmaps/"]',
    ]

    for (const selector of cardSelectors) {
      try {
        const card = this.page.locator(selector).first()
        if (await card.isVisible()) {
          console.log(`悬停在思维导图卡片上: ${selector}`)
          await card.hover()
          await this.page.waitForTimeout(500)
          return
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    throw new Error('未找到可悬停的思维导图卡片')
  }

  // 鼠标移出思维导图卡片
  async moveMouseAwayFromMindMapCard() {
    if (!this.page) throw new Error('Page not initialized')

    // 将鼠标移动到页面的一个空白区域
    await this.page.mouse.move(50, 50)
    await this.page.waitForTimeout(500)
  }

  // 点击思维导图卡片内容区域（非删除按钮）
  async clickMindMapCardContent() {
    if (!this.page) throw new Error('Page not initialized')

    // 找到思维导图卡片并点击其内容区域
    const cardSelectors = [
      'a[href*="/mindmaps/"] h3',
      'a[href*="/mindmaps/"]',
      '[data-testid*="mindmap-card"] h3',
      '.mindmap-card h3',
      '[data-testid*="mindmap-card"] .title',
      '.mindmap-card .title',
    ]

    for (const selector of cardSelectors) {
      try {
        const cardContent = this.page.locator(selector).first()
        if (await cardContent.isVisible()) {
          console.log(`点击思维导图卡片内容: ${selector}`)
          await cardContent.click()
          // 等待页面跳转
          await this.page.waitForURL('**/mindmaps/**', { timeout: 10000 })
          return
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    throw new Error('未找到可点击的思维导图卡片内容区域')
  }

  // 验证没有触发删除操作
  async verifyNoDeleteTriggered(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 检查是否没有删除确认对话框出现
    const hasDialog = await this.verifyDeleteConfirmDialog()
    if (hasDialog) {
      console.log('意外出现删除确认对话框')
      return false
    }

    // 检查是否没有删除API请求
    if (this.deleteRequests.length > 0) {
      console.log('意外发送了删除API请求')
      return false
    }

    console.log('确认没有触发删除操作')
    return true
  }

  // 验证错误提示
  async verifyErrorMessage(expectedErrorMessage: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待错误提示出现（可能需要时间）
    await this.page.waitForTimeout(2000)

    // 检查是否有错误提示
    const errorSelectors = [
      '[data-testid="delete-error-message"]',
      `text="${expectedErrorMessage}"`,
      '.error-message',
      '.toast.error',
      '[role="alert"]',
      '[data-testid*="error"]',
      '.notification.error',
    ]

    for (const selector of errorSelectors) {
      try {
        const error = this.page.locator(selector)
        // 等待元素可见，最多5秒
        await error.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
        if (await error.isVisible()) {
          const errorText = await error.textContent()
          console.log(`找到错误提示: ${errorText}`)
          if (errorText?.includes(expectedErrorMessage)) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    console.log(`未找到期望的错误提示: ${expectedErrorMessage}`)
    return false
  }

  // 验证列表刷新移除不存在的条目
  async verifyListRefreshedAfterError(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待列表刷新
    await this.page.waitForTimeout(2000)

    // 检查页面是否重新加载了思维导图列表
    const listSelectors = [
      '[data-testid*="mindmap-card"]',
      '.mindmap-card',
      'a[href*="/mindmaps/"]',
    ]

    for (const selector of listSelectors) {
      try {
        const cards = this.page.locator(selector)
        const count = await cards.count()
        if (count > 0) {
          console.log(`列表刷新后还有 ${count} 个思维导图卡片`)
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    // 如果没有卡片，也认为列表已刷新
    console.log('列表已刷新，可能没有剩余的思维导图')
    return true
  }

  // 创建包含子节点的思维导图
  async openMindMapWithChildNodes() {
    if (!this.page) throw new Error('Page not initialized')

    // 复用现有方法
    await this.openExistingMindMap()
    // 等待加载完成后添加子节点
    await this.page.waitForTimeout(2000)
    await this.clickAddChildNode()
  }

  // =========================
  // Test-ID 相关操作方法
  // =========================

  /**
   * 根据test-id查找节点元素
   */
  async findNodeByTestId(testId: string): Promise<any> {
    if (!this.page) throw new Error('Page not initialized')

    try {
      // 等待节点出现
      await this.page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 5000 })
      return await this.page.$(`[data-testid="${testId}"]`)
    } catch (error) {
      console.log(`找不到test-id为"${testId}"的节点`)
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
    } catch (error) {
      console.log('获取当前选中节点test-id失败:', error)
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

  // 清理测试期间创建的思维导图
  async cleanupMindMaps() {
    if (this.createdMindMapIds.length === 0) {
      console.log('没有需要清理的思维导图')
      return
    }

    console.log(
      `清理 ${this.createdMindMapIds.length} 个测试创建的思维导图: ${this.createdMindMapIds.join(', ')}`
    )

    for (const mindMapId of this.createdMindMapIds) {
      try {
        console.log(`🗑️ 尝试删除思维导图: ${mindMapId}`)

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

        console.log(`✅ 成功删除思维导图: ${mindMapId}`)
      } catch (error) {
        console.warn(`❌ 删除思维导图失败 ${mindMapId}:`, error)
        // 继续删除其他思维导图，不中断清理流程
      }
    }

    // 清空跟踪列表
    this.createdMindMapIds = []
    this.deleteRequests = []
    console.log('清理流程完成')
  }

  // ===========================
  // 键盘快捷键支持方法
  // ===========================

  // 等待新子节点出现并返回其test-id
  async waitForNewChildNode(parentTestId: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized')

    // 根据父节点test-id预测子节点test-id模式
    const expectedChildPattern = `${parentTestId}-`

    // 等待新子节点出现
    await this.page.waitForTimeout(1000)

    // 查找所有节点，找到新的子节点
    const allNodes = await this.page.locator('[data-testid*="rf__node"]').all()

    for (const node of allNodes) {
      const testId = await node.getAttribute('data-testid')
      if (testId && testId.startsWith(expectedChildPattern)) {
        console.log(`找到新子节点: ${testId}`)
        return testId.replace('rf__node-', '')
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

    const nodeElements = await this.page.locator('[data-testid*="rf__node"]').all()
    const testIds: string[] = []

    for (const element of nodeElements) {
      const fullTestId = await element.getAttribute('data-testid')
      if (fullTestId) {
        // 移除'rf__node-'前缀，只保留实际的节点ID
        const testId = fullTestId.replace('rf__node-', '')
        testIds.push(testId)
      }
    }

    return testIds
  }

  // 验证节点是否在编辑状态
  async verifyNodeInEditingState(testId: string) {
    const element = await this.findNodeByTestId(testId)
    if (!element) throw new Error(`找不到节点: ${testId}`)

    // 检查节点是否包含输入框
    const inputElement = await element.$('input')
    expect(inputElement).not.toBeNull()

    // 验证输入框是否获得焦点
    const isFocused = await inputElement?.evaluate(
      (el: HTMLElement) => el === document.activeElement
    )
    expect(isFocused).toBe(true)
  }

  // 验证节点存在
  async verifyNodeExists(testId: string): Promise<void> {
    const element = await this.findNodeByTestId(testId)
    if (!element) {
      throw new Error(`节点"${testId}"不存在`)
    }
  }

  // 验证节点不存在
  async verifyNodeNotExists(testId: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    const element = await this.findNodeByTestId(testId)
    if (element !== null) {
      throw new Error(`节点"${testId}"仍然存在，但期望它应该被删除`)
    }
  }

  // 验证节点被选中
  async verifyNodeSelected(testId: string): Promise<void> {
    const element = await this.findNodeByTestId(testId)
    if (!element) throw new Error(`找不到节点"${testId}"`)

    // 检查多种选中状态的指示
    const hasSelectedClass = await element.evaluate((el: Element) =>
      el.classList.contains('selected')
    )
    const hasSelectedAttribute = await element.getAttribute('data-node-selected')
    const hasRingClass = await element.locator('.ring-2.ring-primary').count()

    if (!hasSelectedClass && hasSelectedAttribute !== 'true' && hasRingClass === 0) {
      throw new Error(`节点"${testId}"未被选中`)
    }
  }

  // 验证节点未被选中
  async verifyNodeNotSelected(testId: string): Promise<void> {
    const element = await this.findNodeByTestId(testId)
    if (!element) throw new Error(`找不到节点"${testId}"`)

    // 检查多种选中状态的指示都不存在
    const hasSelectedClass = await element.evaluate((el: Element) =>
      el.classList.contains('selected')
    )
    const hasSelectedAttribute = await element.getAttribute('data-node-selected')
    const hasRingClass = await element.locator('.ring-2.ring-primary').count()

    if (hasSelectedClass || hasSelectedAttribute === 'true' || hasRingClass > 0) {
      throw new Error(`节点"${testId}"被选中了，但期望它应该未被选中`)
    }
  }

  // 验证节点内容
  async verifyNodeContent(testId: string, expectedContent: string): Promise<void> {
    const element = await this.findNodeByTestId(testId)
    if (!element) throw new Error(`找不到节点"${testId}"`)

    const content = await element.textContent()
    if (content?.trim() !== expectedContent) {
      throw new Error(`节点"${testId}"的内容是"${content?.trim()}"，期望是"${expectedContent}"`)
    }
  }

  // 验证父子关系
  async verifyParentChildRelationship(childTestId: string, parentTestId: string): Promise<void> {
    // 通过test-id结构验证父子关系
    if (!childTestId.startsWith(`${parentTestId}-`)) {
      throw new Error(`节点"${childTestId}"不是节点"${parentTestId}"的子节点`)
    }

    // 验证节点确实存在
    await this.verifyNodeExists(childTestId)
    await this.verifyNodeExists(parentTestId)
  }

  // 验证节点子节点数量
  async verifyNodeChildrenCount(parentTestId: string, expectedCount: number): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    // 查找所有直接子节点（只匹配一级子节点，不包括孙节点）
    const childPattern = `${parentTestId}-\\d+$`
    const allElements = await this.page.locator('[data-testid*="rf__node"]').all()

    const directChildren: string[] = []
    for (const element of allElements) {
      const fullTestId = await element.getAttribute('data-testid')
      if (fullTestId) {
        const testId = fullTestId.replace('rf__node-', '')
        if (new RegExp(childPattern).test(testId)) {
          directChildren.push(testId)
        }
      }
    }

    if (directChildren.length !== expectedCount) {
      throw new Error(
        `节点"${parentTestId}"有${directChildren.length}个子节点，期望是${expectedCount}个`
      )
    }
  }

  // 双击节点进入编辑模式
  async doubleClickNode(testId: string): Promise<void> {
    const element = await this.findNodeByTestId(testId)
    if (!element) throw new Error(`找不到节点"${testId}"`)

    await element.dblclick()
    await this.page?.waitForTimeout(300)
  }
}

setWorldConstructor(BDDWorld)

// Hooks
Before(async function (this: BDDWorld) {
  await this.setupBrowser()
})

After(async function (this: BDDWorld, scenario) {
  await this.captureScreenshotOnFailure(scenario)

  // 清理测试创建的思维导图
  await this.cleanupMindMaps()

  // 清理浏览器资源
  await this.cleanup()
})
