import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { BDDWorld } from '../support/world'

// Given步骤
Given('我是一个已登录的用户', async function (this: BDDWorld) {
  await this.loginAsTestUser()
})

Given('用户已经登录系统', async function (this: BDDWorld) {
  await this.loginAsTestUser()
})

Given('用户在思维导图管理页面', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')

  // 确保在思维导图管理页面
  await this.page.goto(`${this.baseUrl}/mindmaps`)
  await this.page.waitForLoadState('networkidle')
})

Given('我已经创建了一个包含主节点的思维导图', async function (this: BDDWorld) {
  await this.createMindMapWithMainNode()
})

Given(
  '我已经创建了一个仅包含主节点的思维导图，名字叫：{string}',
  async function (this: BDDWorld, mindMapName: string) {
    await this.createMindMapWithMainNode(mindMapName)
  }
)

Given('该思维导图已被其他方式删除', async function (this: BDDWorld) {
  if (!this.page || !this.currentMindMapId) {
    throw new Error('No current mindmap to delete')
  }

  // 通过API删除思维导图，模拟其他方式删除
  try {
    const result = await this.page.evaluate(async mindMapId => {
      const response = await fetch(`/api/mindmaps/${mindMapId}`, {
        method: 'DELETE',
      })
      return response.ok
    }, this.currentMindMapId)

    console.log(`思维导图 ${this.currentMindMapId} 已通过API删除: ${result}`)
  } catch (error) {
    console.log(`删除思维导图时发生错误: ${error}`)
  }
})

Given('我已经打开了一个思维导图', async function (this: BDDWorld) {
  await this.openExistingMindMap()
})

Given('我已经打开了一个包含子节点的思维导图', async function (this: BDDWorld) {
  await this.openMindMapWithChildNodes()
})

// When步骤
When('我创建一个新的思维导图', async function (this: BDDWorld) {
  await this.createNewMindMap()
})

When('我点击{string}按钮', async function (this: BDDWorld, buttonText: string) {
  if (buttonText === '添加子节点' || buttonText === '添加节点') {
    await this.clickAddChildNode()
  } else if (buttonText === '保存') {
    await this.clickSaveButton()
  } else if (buttonText === '新建思维导图') {
    // 严格按描述：只点击按钮，不做任何额外操作
    await this.clickNewMindMapButtonOnly()
  }
})

When(
  '我点击{string}思维导图卡片上的删除按钮',
  async function (this: BDDWorld, mindMapName: string) {
    await this.clickDeleteButtonOnMindMapCard(mindMapName)
  }
)

When('我点击确认对话框中的{string}按钮', async function (this: BDDWorld, buttonText: string) {
  if (!this.page) throw new Error('Page not initialized')

  if (buttonText === '确认') {
    await this.clickConfirmDeleteButton()
  } else if (buttonText === '取消') {
    await this.clickCancelDeleteButton()
  }
})

When('我点击对话框外部区域', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')

  // 点击对话框外部区域（页面背景）
  await this.page.click('body', { position: { x: 10, y: 10 } })
  await this.page.waitForTimeout(500)
})

When('我按下ESC键', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')

  await this.page.keyboard.press('Escape')
  await this.page.waitForTimeout(500)
})

When('我鼠标悬停在思维导图卡片上', async function (this: BDDWorld) {
  await this.hoverOnMindMapCard()
})

When('我鼠标移出思维导图卡片', async function (this: BDDWorld) {
  await this.moveMouseAwayFromMindMapCard()
})

When('我点击思维导图卡片内容区域（非删除按钮）', async function (this: BDDWorld) {
  await this.clickMindMapCardContent()
})

When('我点击保存按钮', async function (this: BDDWorld) {
  await this.clickSaveButton()
})

When('我从思维导图列表页面打开该思维导图', async function (this: BDDWorld) {
  await this.openMindMapFromList()
})

When('我双击主节点进入编辑模式', async function (this: BDDWorld) {
  await this.doubleClickMainNode()
})

When('我输入{string}', async function (this: BDDWorld, text: string) {
  await this.inputText(text)
})

When('我点击enter键', async function (this: BDDWorld) {
  await this.pressEnter()
})

When('我刷新页面', async function (this: BDDWorld) {
  await this.refreshPage()
})

When('我点击一个子节点', async function (this: BDDWorld) {
  await this.clickChildNode()
})

When('我点击主节点', async function (this: BDDWorld) {
  await this.clickMainNode()
})

When('我点击{string}思维导图', async function (this: BDDWorld, mindMapName: string) {
  // 在思维导图列表页面点击指定名字的思维导图
  if (!this.page) throw new Error('Page not initialized')

  // 根据思维导图名字点击对应的卡片
  await this.page.click(`text="${mindMapName}"`)

  // 等待跳转到编辑页面
  await this.page.waitForURL('**/mindmaps/**')

  // 提取并跟踪思维导图ID
  await this.extractAndTrackMindMapId()
})

// Then步骤
Then('系统显示删除确认对话框', async function (this: BDDWorld) {
  const dialogVisible = await this.verifyDeleteConfirmDialog()
  expect(dialogVisible).toBe(true)
})

Then('对话框标题为{string}', async function (this: BDDWorld, expectedTitle: string) {
  const titleMatches = await this.verifyDialogTitle(expectedTitle)
  expect(titleMatches).toBe(true)
})

Then('对话框内容包含{string}', async function (this: BDDWorld, expectedContent: string) {
  const contentMatches = await this.verifyDialogContent(expectedContent)
  expect(contentMatches).toBe(true)
})

Then('系统显示删除进度状态{string}', async function (this: BDDWorld, expectedStatus: string) {
  const statusVisible = await this.verifyDeleteProgressStatus(expectedStatus)
  expect(statusVisible).toBe(true)
})

Then('系统发送DELETE请求到{string}', async function (this: BDDWorld, expectedUrl: string) {
  const requestSent = await this.verifyDeleteApiRequest(expectedUrl)
  expect(requestSent).toBe(true)
})

Then(
  '思维导图列表中不再显示名为{string}的卡片',
  async function (this: BDDWorld, mindMapName: string) {
    const cardNotVisible = await this.verifyMindMapCardNotVisible(mindMapName)
    expect(cardNotVisible).toBe(true)
  }
)

Then('{string}思维导图仍然显示在列表中', async function (this: BDDWorld, mindMapName: string) {
  const cardVisible = await this.verifyMindMapCardVisible(mindMapName)
  expect(cardVisible).toBe(true)
})

Then('页面底部统计信息更新为新的数量', async function (this: BDDWorld) {
  const statsUpdated = await this.verifyStatsUpdated()
  expect(statsUpdated).toBe(true)
})

Then('删除确认对话框关闭', async function (this: BDDWorld) {
  const dialogClosed = await this.verifyDeleteDialogClosed()
  expect(dialogClosed).toBe(true)
})

Then('系统显示删除成功提示{string}', async function (this: BDDWorld, expectedMessage: string) {
  const successMessageVisible = await this.verifyDeleteSuccessMessage(expectedMessage)
  expect(successMessageVisible).toBe(true)
})

Then('删除确认对话框仍然存在', async function (this: BDDWorld) {
  const dialogStillVisible = await this.verifyDeleteConfirmDialog()
  expect(dialogStillVisible).toBe(true)
})

Then('删除按钮从不可见变为可见', async function (this: BDDWorld) {
  const deleteButtonVisible = await this.verifyDeleteButtonVisible()
  expect(deleteButtonVisible).toBe(true)
})

Then('删除按钮恢复为不可见状态', async function (this: BDDWorld) {
  const deleteButtonHidden = await this.verifyDeleteButtonHidden()
  expect(deleteButtonHidden).toBe(true)
})

Then('用户导航到思维导图编辑页面', async function (this: BDDWorld) {
  const onEditPage = await this.verifyOnEditPage()
  expect(onEditPage).toBe(true)
})

Then('没有触发删除操作', async function (this: BDDWorld) {
  const noDeleteTriggered = await this.verifyNoDeleteTriggered()
  expect(noDeleteTriggered).toBe(true)
})

Then('系统显示错误提示{string}', async function (this: BDDWorld, expectedErrorMessage: string) {
  const errorMessageVisible = await this.verifyErrorMessage(expectedErrorMessage)
  expect(errorMessageVisible).toBe(true)
})

Then('思维导图列表刷新移除不存在的条目', async function (this: BDDWorld) {
  const listRefreshed = await this.verifyListRefreshedAfterError()
  expect(listRefreshed).toBe(true)
})

Then('我应该自动进入思维导图编辑页面', async function (this: BDDWorld) {
  const isOnEditPage = await this.verifyOnEditPage()
  expect(isOnEditPage).toBe(true)
})

Then('浏览器应该自动进入思维导图编辑页面', async function (this: BDDWorld) {
  const isOnEditPage = await this.verifyOnEditPage()
  expect(isOnEditPage).toBe(true)
})

Then('浏览器应该进入思维导图编辑页面', async function (this: BDDWorld) {
  const isOnEditPage = await this.verifyOnEditPage()
  expect(isOnEditPage).toBe(true)
})

Then('我应该看到一个默认的主节点', async function (this: BDDWorld) {
  const hasDefaultNode = await this.verifyDefaultMainNode()
  expect(hasDefaultNode).toBe(true)
})

Then('当前思维导图应该有一个默认的主节点', async function (this: BDDWorld) {
  const hasDefaultNode = await this.verifyDefaultMainNode()
  expect(hasDefaultNode).toBe(true)
})

Then('主节点应该是选中状态', async function (this: BDDWorld) {
  const isSelected = await this.verifyMainNodeSelected()
  expect(isSelected).toBe(true)
})

Then('当前思维导图的主节点应该是选中状态', async function (this: BDDWorld) {
  const isSelected = await this.verifyMainNodeSelected()
  expect(isSelected).toBe(true)
})

Then('主节点应该显示选中的视觉反馈', async function (this: BDDWorld) {
  const hasVisualFeedback = await this.verifyMainNodeVisualFeedback()
  expect(hasVisualFeedback).toBe(true)
})

Then('主节点应该进入编辑模式', async function (this: BDDWorld) {
  const inEditMode = await this.verifyNodeInEditMode()
  expect(inEditMode).toBe(true)
})

Then('我应该能够正常编辑节点内容', async function (this: BDDWorld) {
  const canEdit = await this.verifyCanEditNodeContent()
  expect(canEdit).toBe(true)
})

Then('主节点应该有一个子节点', async function (this: BDDWorld) {
  const hasChild = await this.verifyMainNodeHasChild()
  expect(hasChild).toBe(true)
})

Then('新子节点应该与主节点有连接线', async function (this: BDDWorld) {
  const hasConnection = await this.verifyNodeConnection()
  expect(hasConnection).toBe(true)
})

Then('主节点应该退出编辑模式', async function (this: BDDWorld) {
  const exitedEditMode = await this.verifyNodeExitEditMode()
  expect(exitedEditMode).toBe(true)
})

Then('主节点的内容应该更新为{string}', async function (this: BDDWorld, expectedContent: string) {
  const contentMatches = await this.verifyNodeContent(expectedContent)
  expect(contentMatches).toBe(true)
})

Then('应该显示保存成功的提示', async function (this: BDDWorld) {
  const hasSaveMessage = await this.verifySaveSuccessMessage()
  expect(hasSaveMessage).toBe(true)
})

Then('页面应该保持在当前思维导图中', async function (this: BDDWorld) {
  const stayOnCurrentMap = await this.verifyStayOnCurrentMindMap()
  expect(stayOnCurrentMap).toBe(true)
})

Then('主节点的内容应该为{string}', async function (this: BDDWorld, expectedContent: string) {
  const contentMatches = await this.verifyNodeContent(expectedContent)
  expect(contentMatches).toBe(true)
})

Then('子节点应该与主节点保持连接', async function (this: BDDWorld) {
  const hasConnection = await this.verifyNodeConnection()
  expect(hasConnection).toBe(true)
})

Then('子节点应该变为选中状态', async function (this: BDDWorld) {
  const isSelected = await this.verifyChildNodeSelected()
  expect(isSelected).toBe(true)
})

Then('主节点应该变为未选中状态', async function (this: BDDWorld) {
  const isNotSelected = await this.verifyMainNodeNotSelected()
  expect(isNotSelected).toBe(true)
})

Then('子节点应该变为未选中状态', async function (this: BDDWorld) {
  const isNotSelected = await this.verifyChildNodeNotSelected()
  expect(isNotSelected).toBe(true)
})

Then('当前思维导图的主节点应该是未选中状态', async function (this: BDDWorld) {
  const isNotSelected = await this.verifyMainNodeNotSelected()
  expect(isNotSelected).toBe(true)
})

Then('子节点应该显示选中的视觉反馈', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')

  // 检查子节点的选中状态视觉反馈
  const childNode = this.page.locator('[data-testid*="rf__node"]').nth(1)
  const visualFeedback = await childNode.locator('.ring-2.ring-primary').count()

  if (visualFeedback > 0) {
    expect(visualFeedback).toBeGreaterThan(0)
    return
  }

  // 也检查ReactFlow的内置选中状态样式
  const reactFlowSelected = await childNode.getAttribute('class')
  expect(reactFlowSelected).toContain('selected')
})
