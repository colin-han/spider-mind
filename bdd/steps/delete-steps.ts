import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { BDDWorld } from '../support/world'

// When步骤 - 删除操作
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

When('我鼠标悬停在思维导图卡片上', async function (this: BDDWorld) {
  await this.hoverOnMindMapCard()
})

When('我鼠标移出思维导图卡片', async function (this: BDDWorld) {
  await this.moveMouseAwayFromMindMapCard()
})

When('我点击思维导图卡片内容区域（非删除按钮）', async function (this: BDDWorld) {
  await this.clickMindMapCardContent()
})

// Then步骤 - 删除验证
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
