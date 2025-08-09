import { Page, Locator } from '@playwright/test'

// 登录页面对象
export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByTestId('email-input')
    this.passwordInput = page.getByTestId('password-input')
    this.loginButton = page.getByTestId('login-button')
    this.errorMessage = page.getByTestId('error-message')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  async expectError(message: string) {
    await this.page.waitForSelector('[data-testid="error-message"]')
    await this.page.textContent(message)
  }
}

// 思维导图列表页面对象
export class MindMapListPage {
  readonly page: Page
  readonly createButton: Locator
  readonly searchInput: Locator
  readonly mindMapCards: Locator
  readonly userMenu: Locator

  constructor(page: Page) {
    this.page = page
    this.createButton = page.getByTestId('create-mindmap-button')
    this.searchInput = page.getByTestId('search-input')
    this.mindMapCards = page.getByTestId('mindmap-card')
    this.userMenu = page.getByTestId('user-menu')
  }

  async goto() {
    await this.page.goto('/mindmaps')
  }

  async createNewMindMap() {
    await this.createButton.click()
    await this.page.waitForURL('**/mindmaps/**')
  }

  async searchMindMaps(query: string) {
    await this.searchInput.fill(query)
    await this.page.keyboard.press('Enter')
  }

  async openMindMap(index: number = 0) {
    await this.mindMapCards.nth(index).click()
  }

  async getMindMapCount() {
    await this.page.waitForSelector('[data-testid="mindmap-card"]')
    return await this.mindMapCards.count()
  }
}

// 思维导图编辑页面对象
export class MindMapEditorPage {
  readonly page: Page
  readonly titleInput: Locator
  readonly saveButton: Locator
  readonly aiAssistantButton: Locator
  readonly addNodeButton: Locator
  readonly deleteNodeButton: Locator
  readonly mindMapCanvas: Locator
  readonly centerNode: Locator
  readonly backButton: Locator

  constructor(page: Page) {
    this.page = page
    this.titleInput = page.getByTestId('mindmap-title-input')
    this.saveButton = page.getByTestId('save-button')
    this.aiAssistantButton = page.getByTestId('ai-assistant-button')
    this.addNodeButton = page.getByTestId('add-node-button')
    this.deleteNodeButton = page.getByTestId('delete-node-button')
    this.mindMapCanvas = page.getByTestId('mindmap-canvas')
    this.centerNode = page.getByTestId('center-node')
    this.backButton = page.getByTestId('back-button')
  }

  async goto(mindMapId: string) {
    await this.page.goto(`/mindmaps/${mindMapId}`)
  }

  async updateTitle(title: string) {
    await this.titleInput.clear()
    await this.titleInput.fill(title)
  }

  async saveChanges() {
    await this.saveButton.click()
    // 等待保存完成
    await this.page.waitForTimeout(1000)
  }

  async editNodeContent(nodeSelector: string, content: string) {
    // 双击节点进入编辑模式
    await this.page.dblclick(nodeSelector)

    // 查找编辑输入框并输入内容
    const editInput = this.page.getByRole('textbox').first()
    await editInput.clear()
    await editInput.fill(content)
    await this.page.keyboard.press('Enter')
  }

  async addChildNode() {
    // 选择中心节点
    await this.centerNode.click()
    // 点击添加子节点
    await this.addNodeButton.click()
  }

  async openAIAssistant() {
    await this.aiAssistantButton.click()
    await this.page.waitForSelector('[data-testid="ai-assistant-panel"]')
  }

  async getNodeCount() {
    return await this.page.locator('[data-testid*="node-"]').count()
  }

  async goBack() {
    await this.backButton.click()
    await this.page.waitForURL('**/mindmaps')
  }
}

// AI助手面板对象
export class AIAssistantPanel {
  readonly page: Page
  readonly panel: Locator
  readonly expandNodeTab: Locator
  readonly smartSuggestionTab: Locator
  readonly structureAnalysisTab: Locator
  readonly generateButton: Locator
  readonly suggestionsList: Locator
  readonly closeButton: Locator

  constructor(page: Page) {
    this.page = page
    this.panel = page.getByTestId('ai-assistant-panel')
    this.expandNodeTab = page.getByTestId('expand-node-tab')
    this.smartSuggestionTab = page.getByTestId('smart-suggestion-tab')
    this.structureAnalysisTab = page.getByTestId('structure-analysis-tab')
    this.generateButton = page.getByTestId('generate-ai-suggestions')
    this.suggestionsList = page.getByTestId('ai-suggestions-list')
    this.closeButton = page.getByTestId('close-ai-assistant')
  }

  async switchToExpandNode() {
    await this.expandNodeTab.click()
  }

  async switchToSmartSuggestion() {
    await this.smartSuggestionTab.click()
  }

  async switchToStructureAnalysis() {
    await this.structureAnalysisTab.click()
  }

  async generateSuggestions() {
    await this.generateButton.click()
    await this.page.waitForSelector('[data-testid="ai-suggestions-list"]')
  }

  async getSuggestionCount() {
    return await this.suggestionsList.locator('li').count()
  }

  async applySuggestion(index: number = 0) {
    await this.suggestionsList.locator('li').nth(index).getByRole('button').click()
  }

  async close() {
    await this.closeButton.click()
  }
}

// 用户菜单对象
export class UserMenu {
  readonly page: Page
  readonly menuButton: Locator
  readonly dropdown: Locator
  readonly profileLink: Locator
  readonly settingsLink: Locator
  readonly logoutButton: Locator

  constructor(page: Page) {
    this.page = page
    this.menuButton = page.getByTestId('user-menu-button')
    this.dropdown = page.getByTestId('user-menu-dropdown')
    this.profileLink = page.getByTestId('profile-link')
    this.settingsLink = page.getByTestId('settings-link')
    this.logoutButton = page.getByTestId('logout-button')
  }

  async open() {
    await this.menuButton.click()
    await this.dropdown.waitFor()
  }

  async logout() {
    await this.open()
    await this.logoutButton.click()
    await this.page.waitForURL('**/login')
  }

  async goToProfile() {
    await this.open()
    await this.profileLink.click()
  }

  async goToSettings() {
    await this.open()
    await this.settingsLink.click()
  }
}

// 统一的页面对象管理器
export class PageObjectManager {
  readonly page: Page
  readonly loginPage: LoginPage
  readonly mindMapListPage: MindMapListPage
  readonly mindMapEditorPage: MindMapEditorPage
  readonly aiAssistantPanel: AIAssistantPanel
  readonly userMenu: UserMenu

  constructor(page: Page) {
    this.page = page
    this.loginPage = new LoginPage(page)
    this.mindMapListPage = new MindMapListPage(page)
    this.mindMapEditorPage = new MindMapEditorPage(page)
    this.aiAssistantPanel = new AIAssistantPanel(page)
    this.userMenu = new UserMenu(page)
  }
}

// 测试数据和工具函数
export class E2ETestHelpers {
  static createTestUser() {
    const timestamp = Date.now()
    return {
      email: `e2etest${timestamp}@example.com`,
      password: 'E2ETest123!',
      username: `e2euser${timestamp}`,
      fullName: `E2E Test User ${timestamp}`,
    }
  }

  static async waitForNetworkIdle(page: Page, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout })
  }

  static async takeScreenshot(page: Page, name: string) {
    await page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    })
  }

  static async mockApiResponse(page: Page, url: string, response: unknown) {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })
  }

  static getTestId(id: string) {
    return `[data-testid="${id}"]`
  }
}
