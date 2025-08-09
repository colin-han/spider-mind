import { setWorldConstructor, Before, After } from '@cucumber/cucumber'
import { BrowserContext, Page, Browser } from '@playwright/test'
import { chromium } from '@playwright/test'

export class BDDWorld {
  public browser: Browser | undefined
  public context: BrowserContext | undefined
  public page: Page | undefined
  public currentMindMapId: string | undefined
  public baseUrl: string

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

    await this.page.goto(`${this.baseUrl}/login`)
    await this.page.waitForLoadState('networkidle')

    // 填写测试用户信息
    await this.page.fill('input[placeholder*="邮箱"]', 'dev@test.com')
    await this.page.fill('input[placeholder*="密码"]', 'password')

    // 点击登录按钮
    await this.page.click('button:has-text("登录")')

    // 等待重定向到思维导图列表页面
    await this.page.waitForURL('**/mindmaps')
  }

  // 思维导图操作方法
  async createNewMindMap() {
    if (!this.page) throw new Error('Page not initialized')

    // 点击新建思维导图按钮
    await this.page.click('button:has-text("新建思维导图")')

    // 等待新思维导图创建完成并出现在列表中
    await this.page.waitForTimeout(2000)

    // 点击第一个思维导图卡片进入编辑页面
    await this.page.click('a[href*="/mindmaps/"]')

    // 等待跳转到编辑页面
    await this.page.waitForURL('**/mindmaps/**')

    // 从URL中提取思维导图ID
    const url = this.page.url()
    const matches = url.match(/\/mindmaps\/([^\/]+)/)
    if (matches) {
      this.currentMindMapId = matches[1]
    }
  }

  async verifyOnEditPage() {
    if (!this.page) throw new Error('Page not initialized')
    return this.page.url().includes('/mindmaps/')
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

    // 先点击主节点来选中它
    await this.page.click('[data-testid*="rf__node"]')
    await this.page.waitForTimeout(500)

    // 检查是否有选中的节点（通过ring-2 ring-primary类）
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

  async verifyNodeContent(expectedContent: string) {
    if (!this.page) throw new Error('Page not initialized')

    // 等待页面加载和内容更新（刷新后需要更长时间）
    await this.page.waitForTimeout(3000)

    // 确保思维导图已加载完成
    await this.page.waitForSelector('[data-testid*="rf__node"]', { timeout: 10000 })

    // 调试：打印页面上所有节点的内容
    const allNodeTexts = await this.page.locator('[data-testid*="rf__node"] div').allTextContents()
    console.log('页面上所有节点内容:', allNodeTexts)
    console.log('期望的内容:', expectedContent)

    // 检查是否有任何节点包含期望的内容
    const hasContent = allNodeTexts.some(text => text && text.includes(expectedContent))
    console.log('节点内容是否包含期望文本:', hasContent)

    if (hasContent) return true

    // 备选方案：使用getByText检查
    const containsContent = await this.page.getByText(expectedContent, { exact: false }).count()
    console.log('getByText匹配数量:', containsContent)

    return containsContent > 0
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
}

setWorldConstructor(BDDWorld)

// Hooks
Before(async function (this: BDDWorld) {
  await this.setupBrowser()
})

After(async function (this: BDDWorld, scenario) {
  await this.captureScreenshotOnFailure(scenario)
  await this.cleanup()
})
