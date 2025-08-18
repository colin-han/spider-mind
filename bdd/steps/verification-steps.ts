import { Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { BDDWorld } from '../support/world'

// 统一的编辑页面验证 - 主要版本
Then('我应该进入思维导图编辑页面', async function (this: BDDWorld) {
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

// 统一的主节点选中验证 - 主要版本
Then('主节点应该被选中', async function (this: BDDWorld) {
  await this.verifyNodeSelected('root')
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
  await this.verifyNodeContent('root', expectedContent)
})

// 节点编辑状态验证 - 否定形式
Then('节点{string}应该不处于编辑状态', async function (this: BDDWorld, testId: string) {
  const element = await this.findNodeByTestId(testId)
  if (!element) throw new Error(`找不到节点: ${testId}`)

  const inputElement = await element.$('input')
  expect(inputElement).toBeNull()
})

// 删除确认对话框验证 - 否定形式
Then('不应该显示删除确认对话框', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')

  // 检查删除确认对话框不存在
  const dialog = await this.page.locator('[data-testid="delete-confirm-dialog"]').count()
  expect(dialog).toBe(0)
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
  await this.verifyNodeContent('root', expectedContent)
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
  const childNode = this.page
    .locator('[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]')
    .nth(1)
  const visualFeedback = await childNode.locator('.ring-2.ring-primary').count()

  if (visualFeedback > 0) {
    expect(visualFeedback).toBeGreaterThan(0)
    return
  }

  // 也检查ReactFlow的内置选中状态样式
  const reactFlowSelected = await childNode.getAttribute('class')
  expect(reactFlowSelected).toContain('selected')
})

// 节点状态验证
Then('节点{string}应该存在', async function (this: BDDWorld, testId: string) {
  await this.verifyNodeExists(testId)
})

Then('节点{string}应该不存在', async function (this: BDDWorld, testId: string) {
  await this.verifyNodeNotExists(testId)
})

Then('节点{string}应该被选中', async function (this: BDDWorld, testId: string) {
  await this.verifyNodeSelected(testId)
})

Then('节点{string}应该不被选中', async function (this: BDDWorld, testId: string) {
  await this.verifyNodeNotSelected(testId)
})

Then('节点{string}应该处于编辑状态', async function (this: BDDWorld, testId: string) {
  await this.verifyNodeInEditingState(testId)
})

Then('节点{string}应该退出编辑状态', async function (this: BDDWorld, testId: string) {
  await this.verifyNodeExitEditingState(testId)
})

Then(
  '节点{string}的内容应该是{string}',
  async function (this: BDDWorld, testId: string, expectedContent: string) {
    await this.verifyNodeContent(testId, expectedContent)
  }
)

Then(
  '节点{string}的内容应该不是{string}',
  async function (this: BDDWorld, testId: string, notExpectedContent: string) {
    await this.verifyNodeContentNot(testId, notExpectedContent)
  }
)

// 节点关系验证
Then(
  '节点{string}应该是节点{string}的子节点',
  async function (this: BDDWorld, childTestId: string, parentTestId: string) {
    await this.verifyParentChildRelationship(childTestId, parentTestId)
  }
)

Then(
  '节点{string}应该有{int}个子节点',
  async function (this: BDDWorld, parentTestId: string, expectedCount: number) {
    await this.verifyNodeChildrenCount(parentTestId, expectedCount)
  }
)

// 特殊操作验证
Then('应该显示提示信息{string}', async function (this: BDDWorld, message: string) {
  if (!this.page) throw new Error('Page not initialized')

  // 等待提示信息出现
  await expect(this.page.locator(`text=${message}`)).toBeVisible({ timeout: 300 })
})

Then('不应该创建任何新节点', async function (this: BDDWorld) {
  // 记录当前所有节点的test-id
  const currentNodes = await this.getAllNodeTestIds()

  // 等待一段时间，确保没有新节点创建
  await this.page?.waitForLoadState('domcontentloaded')

  // 再次获取节点列表，应该没有变化
  const afterNodes = await this.getAllNodeTestIds()
  expect(afterNodes).toEqual(currentNodes)
})
