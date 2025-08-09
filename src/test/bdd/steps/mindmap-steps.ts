import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { BDDWorld } from '../support/world'

// Given步骤
Given('我是一个已登录的用户', async function (this: BDDWorld) {
  await this.loginAsTestUser()
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
  }
})

When('我点击保存按钮', async function (this: BDDWorld) {
  await this.clickSaveButton()
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

// Then步骤
Then('我应该自动进入思维导图编辑页面', async function (this: BDDWorld) {
  const isOnEditPage = await this.verifyOnEditPage()
  expect(isOnEditPage).toBe(true)
})

Then('我应该看到一个默认的主节点', async function (this: BDDWorld) {
  const hasDefaultNode = await this.verifyDefaultMainNode()
  expect(hasDefaultNode).toBe(true)
})

Then('主节点应该是选中状态', async function (this: BDDWorld) {
  const isSelected = await this.verifyMainNodeSelected()
  expect(isSelected).toBe(true)
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
