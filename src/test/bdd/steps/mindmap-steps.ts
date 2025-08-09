import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { BDDWorld } from '../support/world'

// Given步骤
Given('我是一个已登录的用户', async function (this: BDDWorld) {
  await this.loginAsTestUser()
})

Given('我已经创建了一个包含主节点的思维导图', async function (this: BDDWorld) {
  await this.createMindMapWithMainNode()
})

Given(
  '我已经创建了一个仅包含主节点的思维导图，名字叫：{string};',
  async function (this: BDDWorld, mindMapName: string) {
    await this.createMindMapWithMainNode(mindMapName)
  }
)

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
