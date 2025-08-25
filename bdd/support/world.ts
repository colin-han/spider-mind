import { setWorldConstructor, Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { ElementHandle } from '@playwright/test'
import { BrowserManager } from './browser-manager'
import { AuthNavigation } from './auth-navigation'
import { MindMapOperations } from './mindmap-operations'
import { DeleteOperations } from './delete-operations'
import { NodeOperations } from './node-operations'
import { DatabaseHelpers } from './database-helpers'
import { VerificationHelpers } from './verification-helpers'
import { DeleteVerification } from './delete-verification'
import { TestAuthHelper } from './test-auth-helper'
import { performanceMonitor } from './performance-monitor'

export class BDDWorld {
  public currentMindMapId: string | undefined
  public createdMindMapIds: string[] = []
  public baseUrl: string

  private browserManager: BrowserManager
  private authNavigation: AuthNavigation | undefined
  private testAuthHelper: TestAuthHelper | undefined
  private mindMapOperations: MindMapOperations | undefined
  private deleteOperations: DeleteOperations | undefined
  private nodeOperations: NodeOperations | undefined
  private databaseHelpers: DatabaseHelpers | undefined
  private verificationHelpers: VerificationHelpers | undefined
  private deleteVerification: DeleteVerification | undefined

  constructor(options: { parameters: { baseUrl: string } }) {
    this.baseUrl = options.parameters.baseUrl || 'http://localhost:3000'
    this.browserManager = new BrowserManager()
  }

  // 代理属性访问器，便于向后兼容
  get browser() {
    return this.browserManager.browser
  }
  get context() {
    return this.browserManager.context
  }
  get page() {
    return this.browserManager.page
  }

  async setupBrowser() {
    await this.browserManager.setupBrowser()

    // 初始化其他模块
    if (this.page) {
      this.authNavigation = new AuthNavigation(this.page, this.baseUrl)
      this.testAuthHelper = new TestAuthHelper(this.page, this.baseUrl)
      this.mindMapOperations = new MindMapOperations(
        this.page,
        this.baseUrl,
        this.currentMindMapId,
        this.createdMindMapIds
      )
      this.deleteOperations = new DeleteOperations(
        this.page,
        this.currentMindMapId,
        this.browserManager.getDeleteRequests()
      )
      this.nodeOperations = new NodeOperations(this.page)
      this.databaseHelpers = new DatabaseHelpers(
        this.page,
        this.baseUrl,
        this.currentMindMapId,
        this.createdMindMapIds
      )
      this.verificationHelpers = new VerificationHelpers(
        this.page,
        this.currentMindMapId,
        this.browserManager.getDeleteRequests()
      )
      this.deleteVerification = new DeleteVerification(
        this.page,
        this.currentMindMapId,
        this.browserManager.getDeleteRequests()
      )
    }
  }

  private syncMindMapIds() {
    if (this.mindMapOperations) {
      this.currentMindMapId = this.mindMapOperations.getCurrentMindMapId()
      this.createdMindMapIds = this.mindMapOperations.getCreatedMindMapIds()
    }
  }

  async cleanup() {
    await this.browserManager.cleanup()
  }

  async captureScreenshotOnFailure(scenario: { result?: { status: string } }) {
    return this.browserManager.captureScreenshotOnFailure(scenario)
  }

  // 清理测试期间创建的思维导图
  async cleanupMindMaps() {
    if (this.mindMapOperations) {
      await this.mindMapOperations.cleanupMindMaps()
      this.browserManager.clearDeleteRequests()
    }
  }

  // =========================================
  // 代理方法 - 认证和导航
  // =========================================
  async loginAsTestUser() {
    if (!this.authNavigation) throw new Error('AuthNavigation not initialized')
    return this.authNavigation.loginAsTestUser()
  }

  async setupTestAuth(userEmail: string = 'autotester@test.com') {
    if (!this.testAuthHelper) throw new Error('TestAuthHelper not initialized')
    return this.testAuthHelper.setupTestAuth(userEmail)
  }

  async verifyOnEditPage() {
    if (!this.authNavigation) throw new Error('AuthNavigation not initialized')
    return this.authNavigation.verifyOnEditPage()
  }

  async verifyOnListPage() {
    if (!this.authNavigation) throw new Error('AuthNavigation not initialized')
    return this.authNavigation.verifyOnListPage()
  }

  async refreshPage() {
    if (!this.authNavigation) throw new Error('AuthNavigation not initialized')
    return this.authNavigation.refreshPage()
  }

  // =========================================
  // 代理方法 - 思维导图操作
  // =========================================
  async clickNewMindMapButtonOnly() {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    await this.mindMapOperations.clickNewMindMapButtonOnly()
    this.syncMindMapIds()
  }

  async clickFirstMindMapCard() {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    await this.mindMapOperations.clickFirstMindMapCard()
    this.syncMindMapIds()
  }

  async extractAndTrackMindMapId() {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    await this.mindMapOperations.extractAndTrackMindMapId()
    this.syncMindMapIds()
  }

  async createMindMapWithMainNode(name?: string) {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    await this.mindMapOperations.createMindMapWithMainNode(name)
    this.syncMindMapIds()
  }

  async openExistingMindMap() {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    await this.mindMapOperations.openExistingMindMap()
    this.syncMindMapIds()
  }

  async openMindMapFromList() {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    return this.mindMapOperations.openMindMapFromList()
  }

  async openMindMapWithChildNodes() {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    return this.mindMapOperations.openMindMapWithChildNodes()
  }

  async clickAddChildNode() {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    return this.mindMapOperations.clickAddChildNode()
  }

  async verifyStayOnCurrentMindMap() {
    if (!this.mindMapOperations) throw new Error('MindMapOperations not initialized')
    return this.mindMapOperations.verifyStayOnCurrentMindMap()
  }

  // =========================================
  // 代理方法 - 删除操作
  // =========================================
  async clickDeleteButtonOnMindMapCard(mindMapName: string) {
    if (!this.deleteOperations) throw new Error('DeleteOperations not initialized')
    return this.deleteOperations.clickDeleteButtonOnMindMapCard(mindMapName)
  }

  async clickConfirmDeleteButton() {
    if (!this.deleteOperations) throw new Error('DeleteOperations not initialized')
    return this.deleteOperations.clickConfirmDeleteButton()
  }

  async clickCancelDeleteButton() {
    if (!this.deleteOperations) throw new Error('DeleteOperations not initialized')
    return this.deleteOperations.clickCancelDeleteButton()
  }

  async hoverOnMindMapCard() {
    if (!this.deleteOperations) throw new Error('DeleteOperations not initialized')
    return this.deleteOperations.hoverOnMindMapCard()
  }

  async moveMouseAwayFromMindMapCard() {
    if (!this.deleteOperations) throw new Error('DeleteOperations not initialized')
    return this.deleteOperations.moveMouseAwayFromMindMapCard()
  }

  async clickMindMapCardContent() {
    if (!this.deleteOperations) throw new Error('DeleteOperations not initialized')
    return this.deleteOperations.clickMindMapCardContent()
  }

  // =========================================
  // 代理方法 - 节点操作
  // =========================================
  async findNodeByTestId(testId: string): Promise<ElementHandle<Element> | null> {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.findNodeByTestId(testId)
  }

  async getCurrentSelectedNodeTestId(): Promise<string | null> {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.getCurrentSelectedNodeTestId()
  }

  async selectNodeByTestId(testId: string): Promise<void> {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.selectNodeByTestId(testId)
  }

  async waitForNewChildNode(parentTestId: string): Promise<string> {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.waitForNewChildNode(parentTestId)
  }

  async clickBlankArea() {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.clickBlankArea()
  }

  async getAllNodeTestIds(): Promise<string[]> {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.getAllNodeTestIds()
  }

  async doubleClickNode(testId: string): Promise<void> {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.doubleClickNode(testId)
  }

  async editNodeContent(testId: string, newContent: string): Promise<void> {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.editNodeContent(testId, newContent)
  }

  async createMultipleChildNodes(parentTestId: string, childrenNames: string[]): Promise<void> {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.createMultipleChildNodes(parentTestId, childrenNames)
  }

  async clickChildNode() {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.clickChildNode()
  }

  async clickMainNode() {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.clickMainNode()
  }

  async doubleClickMainNode() {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.doubleClickMainNode()
  }

  async inputText(text: string) {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.inputText(text)
  }

  async pressEnter() {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.pressEnter()
  }

  async clickSaveButton() {
    if (!this.nodeOperations) throw new Error('NodeOperations not initialized')
    return this.nodeOperations.clickSaveButton()
  }

  // =========================================
  // 代理方法 - 数据库操作
  // =========================================
  async createMindMapFromTreeStructure(treeText: string): Promise<void> {
    if (!this.databaseHelpers) throw new Error('DatabaseHelpers not initialized')
    return this.databaseHelpers.createMindMapFromTreeStructure(treeText)
  }

  // =========================================
  // 代理方法 - 验证
  // =========================================
  async verifyDefaultMainNode() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyDefaultMainNode()
  }

  async verifyMainNodeExists() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyMainNodeExists()
  }

  async verifyMainNodeSelected() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyMainNodeSelected()
  }

  async verifyMainNodeHasChild() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyMainNodeHasChild()
  }

  async verifyNodeConnection() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeConnection()
  }

  async verifyNodeExitEditMode() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeExitEditMode()
  }

  async verifyMainNodeVisualFeedback() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyMainNodeVisualFeedback()
  }

  async verifyNodeInEditMode() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeInEditMode()
  }

  async verifyCanEditNodeContent() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyCanEditNodeContent()
  }

  async verifyChildNodeSelected() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyChildNodeSelected()
  }

  async verifyMainNodeNotSelected() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyMainNodeNotSelected()
  }

  async verifyChildNodeNotSelected() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyChildNodeNotSelected()
  }

  async verifySaveSuccessMessage() {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifySaveSuccessMessage()
  }

  async verifyNodeInEditingState(testId: string) {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeInEditingState(testId)
  }

  async verifyNodeExitEditingState(testId: string) {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeExitEditingState(testId)
  }

  async verifyNodeExists(testId: string): Promise<void> {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeExists(testId)
  }

  async verifyNodeNotExists(testId: string): Promise<void> {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeNotExists(testId)
  }

  async verifyNodeSelected(testId: string): Promise<void> {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeSelected(testId)
  }

  async verifyNodeNotSelected(testId: string): Promise<void> {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeNotSelected(testId)
  }

  async verifyNodeContent(testId: string, expectedContent: string): Promise<void> {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeContent(testId, expectedContent)
  }

  async verifyNodeContentNot(testId: string, notExpectedContent: string): Promise<void> {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeContentNot(testId, notExpectedContent)
  }

  async verifyParentChildRelationship(childTestId: string, parentTestId: string): Promise<void> {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyParentChildRelationship(childTestId, parentTestId)
  }

  async verifyNodeChildrenCount(parentTestId: string, expectedCount: number): Promise<void> {
    if (!this.verificationHelpers) throw new Error('VerificationHelpers not initialized')
    return this.verificationHelpers.verifyNodeChildrenCount(parentTestId, expectedCount)
  }

  // =========================================
  // 代理方法 - 删除验证
  // =========================================
  async verifyDeleteConfirmDialog(): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDeleteConfirmDialog()
  }

  async verifyDialogTitle(expectedTitle: string): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDialogTitle(expectedTitle)
  }

  async verifyDialogContent(expectedContent: string): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDialogContent(expectedContent)
  }

  async verifyDeleteProgressStatus(expectedStatus: string): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDeleteProgressStatus(expectedStatus)
  }

  async verifyDeleteApiRequest(expectedUrl: string): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDeleteApiRequest(expectedUrl)
  }

  async verifyMindMapCardNotVisible(mindMapName: string): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyMindMapCardNotVisible(mindMapName)
  }

  async verifyMindMapCardVisible(mindMapName: string): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyMindMapCardVisible(mindMapName)
  }

  async verifyStatsUpdated(): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyStatsUpdated()
  }

  async verifyDeleteDialogClosed(): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDeleteDialogClosed()
  }

  async verifyDeleteSuccessMessage(expectedMessage: string): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDeleteSuccessMessage(expectedMessage)
  }

  async verifyDeleteButtonVisible(): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDeleteButtonVisible()
  }

  async verifyDeleteButtonHidden(): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyDeleteButtonHidden()
  }

  async verifyNoDeleteTriggered(): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyNoDeleteTriggered()
  }

  async verifyErrorMessage(expectedErrorMessage: string): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyErrorMessage(expectedErrorMessage)
  }

  async verifyListRefreshedAfterError(): Promise<boolean> {
    if (!this.deleteVerification) throw new Error('DeleteVerification not initialized')
    return this.deleteVerification.verifyListRefreshedAfterError()
  }
}

setWorldConstructor(BDDWorld)

// Hooks
Before(async function (this: BDDWorld, scenario) {
  // 开始性能监控
  performanceMonitor.startScenario(scenario.pickle.name)
  performanceMonitor.startTimer('browser-setup', { type: 'setup' })
  
  await this.setupBrowser()
  
  performanceMonitor.endTimer('browser-setup')
})

Before({ tags: '@longTimeout' }, function () {
  setDefaultTimeout(60 * 1000) // 只对标记了 @longTimeout 的场景生效
})

After(async function (this: BDDWorld, scenario) {
  performanceMonitor.startTimer('cleanup', { type: 'teardown' })
  
  await this.captureScreenshotOnFailure(scenario)

  // 清理测试创建的思维导图
  await this.cleanupMindMaps()

  // 清理浏览器资源
  await this.cleanup()
  
  performanceMonitor.endTimer('cleanup')
  
  // 结束场景性能监控
  performanceMonitor.endScenario()
  
  // 如果是最后一个场景，生成总体报告
  if (process.env.NODE_ENV !== 'test') {
    // 在测试结束时可以通过环境变量或其他方式触发报告生成
  }
})
