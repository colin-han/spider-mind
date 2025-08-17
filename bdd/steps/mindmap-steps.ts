import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { BDDWorld } from '../support/world'

// Given步骤
Given('我是一个已登录的用户', async function (this: BDDWorld) {
  await this.loginAsTestUser()
})

// 兼容性：将旧表述映射到新的统一表述
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
    await this.page.evaluate(async mindMapId => {
      const response = await fetch(`/api/mindmaps/${mindMapId}`, {
        method: 'DELETE',
      })
      return response.ok
    }, this.currentMindMapId)

    // 思维导图已删除
  } catch {
    // 删除过程中发生错误
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

When('我点击{string}按钮', { timeout: 20000 }, async function (this: BDDWorld, buttonText: string) {
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

// 统一的按键处理 - 支持多种按键名称格式
When('我按下{string}键', async function (this: BDDWorld, keyName: string) {
  if (!this.page) throw new Error('Page not initialized')

  // 按键名称映射表
  const keyMap: { [key: string]: string } = {
    ESC: 'Escape',
    Esc: 'Escape',
    esc: 'Escape',
    Escape: 'Escape',
    Enter: 'Enter',
    enter: 'Enter',
    Tab: 'Tab',
    tab: 'Tab',
    Delete: 'Delete',
    delete: 'Delete',
    F2: 'F2',
    f2: 'F2',
  }

  const actualKey = keyMap[keyName] || keyName
  await this.page.keyboard.press(actualKey)
  await this.page.waitForTimeout(500)
})

// 兼容性：保留原有的特定按键步骤
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

// 统一的编辑页面验证 - 主要版本
Then('我应该进入思维导图编辑页面', async function (this: BDDWorld) {
  const isOnEditPage = await this.verifyOnEditPage()
  expect(isOnEditPage).toBe(true)
})

// 兼容性：将不同表述映射到统一步骤
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

// 统一的主节点选中验证 - 主要版本
Then('主节点应该被选中', async function (this: BDDWorld) {
  await this.verifyNodeSelected('root')
})

// 兼容性：将旧表述映射到新的统一表述
Then('主节点应该是选中状态', async function (this: BDDWorld) {
  await this.verifyNodeSelected('root')
})

Then('当前思维导图的主节点应该是选中状态', async function (this: BDDWorld) {
  // 直接验证根节点的选中状态
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

// =========================
// Test-ID 稳定性测试专用步骤
// =========================

When('我修改主节点内容为{string}', async function (this: BDDWorld, newContent: string) {
  await this.editNodeContent('root', newContent)
})

When(
  '我为{string}节点创建多个子节点{string}',
  async function (this: BDDWorld, parentTestId: string, childrenJson: string) {
    // 解析子节点数组
    const childrenNames: string[] = JSON.parse(childrenJson)

    // 使用BDDWorld方法创建多个子节点
    await this.createMultipleChildNodes(parentTestId, childrenNames)
  }
)

When(
  '我为{string}节点创建以下子节点：',
  async function (this: BDDWorld, parentTestId: string, dataTable) {
    // 从DataTable获取子节点名称列表
    const rows = dataTable.raw()
    const childrenNames: string[] = rows.map((row: string[]) => row[0])

    // 使用BDDWorld方法创建多个子节点
    await this.createMultipleChildNodes(parentTestId, childrenNames)
  }
)

When('我删除节点{string}', async function (this: BDDWorld, testId: string) {
  // 记录删除前的所有节点
  const beforeNodes = await this.page!.evaluate(() => {
    const nodes = document.querySelectorAll(
      '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
    )
    return Array.from(nodes).map(node => ({
      testId: node.getAttribute('data-testid'),
      content: node.textContent?.trim(),
    }))
  })
  console.log('删除前的节点:', beforeNodes)

  // 选中要删除的节点
  await this.selectNodeByTestId(testId)
  await this.page!.waitForTimeout(500)

  // 验证节点是否被选中
  const isSelected = await this.page!.evaluate(testId => {
    const node = document.querySelector(`[data-testid="${testId}"]`)
    return node?.getAttribute('data-node-selected') === 'true'
  }, testId)
  console.log(`节点 ${testId} 是否被选中: ${isSelected}`)

  // 确保思维导图容器获得焦点
  await this.page!.click('.react-flow')
  await this.page!.waitForTimeout(200)

  // 方法1: 尝试使用Delete键删除节点
  console.log(`按下Delete键删除节点: ${testId}`)
  await this.page!.keyboard.press('Delete')

  await this.page!.waitForTimeout(1000)

  // 检查是否有确认对话框出现
  const hasDialog = await this.page!.locator(
    '[data-testid*="confirm"], [data-testid*="dialog"]'
  ).count()

  // 如果Delete键没有效果，尝试工具栏删除按钮
  if (hasDialog === 0) {
    console.log(`Delete键无效，尝试工具栏删除按钮`)
    const deleteButtonExists = await this.page!.locator('[data-testid="delete-button"]').count()
    if (deleteButtonExists > 0) {
      await this.page!.click('[data-testid="delete-button"]')
      await this.page!.waitForTimeout(500)
    } else {
      console.log(`工具栏删除按钮不存在，尝试其他删除按钮`)
      // 寻找其他可能的删除按钮
      const deleteSelectors = [
        'button:has-text("删除")',
        'button:has-text("Delete")',
        '[title*="删除"]',
        '[aria-label*="删除"]',
      ]

      for (const selector of deleteSelectors) {
        const buttonExists = await this.page!.locator(selector).count()
        if (buttonExists > 0) {
          console.log(`找到删除按钮: ${selector}`)
          await this.page!.click(selector)
          break
        }
      }
    }
  }

  // 等待一下看是否有确认对话框
  await this.page!.waitForTimeout(1000)

  // 检查是否有删除确认对话框
  const hasConfirmDialog = await this.page!.locator(
    '[data-testid*="confirm"], [data-testid*="dialog"]'
  ).count()
  console.log(`最终是否有确认对话框: ${hasConfirmDialog > 0}`)

  if (hasConfirmDialog > 0) {
    // 尝试点击确认按钮
    const confirmSelectors = [
      '[data-testid="alert-dialog-confirm"]',
      'button:has-text("确认")',
      'button:has-text("删除")',
      'button:has-text("Delete")',
    ]

    let confirmClicked = false
    for (const selector of confirmSelectors) {
      try {
        const button = this.page!.locator(selector)
        if (await button.isVisible()) {
          console.log(`点击确认按钮: ${selector}`)
          await button.click()
          confirmClicked = true
          break
        }
      } catch (_e) {
        // 继续尝试下一个选择器
      }
    }
    console.log(`确认按钮是否被点击: ${confirmClicked}`)
  }

  await this.page!.waitForTimeout(2000) // 增加等待时间

  // 记录删除后的所有节点
  const afterNodes = await this.page!.evaluate(() => {
    const nodes = document.querySelectorAll(
      '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
    )
    return Array.from(nodes).map(node => ({
      testId: node.getAttribute('data-testid'),
      content: node.textContent?.trim(),
    }))
  })
  console.log('删除后的节点:', afterNodes)

  console.log(`节点 ${testId} 删除完成`)
})

// ===========================
// 键盘快捷键相关步骤定义
// ===========================

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

// 已修正拼写错误，此步骤已删除

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

// =========================
// 基于Test-ID的统一节点操作步骤
// =========================

// 基础节点操作
When('我选中节点{string}', async function (this: BDDWorld, testId: string) {
  await this.selectNodeByTestId(testId)
})

When('我双击节点{string}', async function (this: BDDWorld, testId: string) {
  await this.doubleClickNode(testId)
})

When('我为节点{string}添加子节点', async function (this: BDDWorld, parentTestId: string) {
  // 先选中目标节点
  await this.selectNodeByTestId(parentTestId)

  if (!this.page) throw new Error('Page not initialized')

  // 等待一下确保节点选中状态生效
  await this.page.waitForTimeout(500)

  // 检查添加节点按钮是否存在
  const buttonExists = await this.page.locator('[data-testid="add-node-button"]').count()
  if (buttonExists === 0) {
    throw new Error('找不到添加节点按钮')
  }

  // 点击添加节点按钮
  await this.page.click('[data-testid="add-node-button"]')

  // 等待一下让页面处理
  await this.page.waitForTimeout(1000)

  // 检查是否已经创建了子节点
  const finalNodeTestIds = await this.page.evaluate(() => {
    const nodes = document.querySelectorAll(
      '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
    )
    return Array.from(nodes)
      .map(node => node.getAttribute('data-testid'))
      .filter(id => id)
  })

  // 查找新创建的子节点
  const expectedChildTestId = `${parentTestId}-0`
  const hasChildNode = finalNodeTestIds.includes(expectedChildTestId)

  if (hasChildNode) {
    return // 直接返回，不需要等待
  } else {
    // 等待新子节点出现
    await this.waitForNewChildNode(parentTestId)
  }
})

// 快捷键操作
When('我按下Tab键', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.keyboard.press('Tab')
})

When('我按下Enter键', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.keyboard.press('Enter')
  await this.page.waitForTimeout(1000) // 等待节点创建完成
})

When('我按下Delete键', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.keyboard.press('Delete')
})

When('我按下F2键', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.keyboard.press('F2')
})

When('我按下Escape键', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.keyboard.press('Escape')
})

When('我按下{string}方向键', async function (this: BDDWorld, direction: string) {
  if (!this.page) throw new Error('Page not initialized')

  const keyMap: { [key: string]: string } = {
    上: 'ArrowUp',
    下: 'ArrowDown',
    左: 'ArrowLeft',
    右: 'ArrowRight',
  }

  const key = keyMap[direction]
  if (!key) throw new Error(`不支持的方向键: ${direction}`)

  await this.page.keyboard.press(key)
})

// 内容输入操作（与第160行的步骤重复，已删除）

// 空白区域操作
When('我点击思维导图的空白区域取消所有节点选中', async function (this: BDDWorld) {
  await this.clickBlankArea()
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
  await expect(this.page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 })
})

Then('不应该创建任何新节点', async function (this: BDDWorld) {
  // 记录当前所有节点的test-id
  const currentNodes = await this.getAllNodeTestIds()

  // 等待一段时间，确保没有新节点创建
  await this.page?.waitForTimeout(1000)

  // 再次获取节点列表，应该没有变化
  const afterNodes = await this.getAllNodeTestIds()
  expect(afterNodes).toEqual(currentNodes)
})

// 兼容性Steps：将旧的术语映射到新的test-id系统

When('我双击主节点进入编辑模式', async function (this: BDDWorld) {
  await this.doubleClickNode('root')
})

When('我点击主节点', async function (this: BDDWorld) {
  await this.selectNodeByTestId('root')
})

Then('主节点应该进入编辑模式', async function (this: BDDWorld) {
  await this.verifyNodeInEditingState('root')
})

Then('主节点应该退出编辑模式', async function (this: BDDWorld) {
  // 验证根节点不在编辑状态
  const element = await this.findNodeByTestId('root')
  if (!element) throw new Error('找不到根节点')

  const inputElement = await element.$('input')
  expect(inputElement).toBeNull()
})

Then('主节点的内容应该更新为{string}', async function (this: BDDWorld, expectedContent: string) {
  await this.verifyNodeContent('root', expectedContent)
})

// =========================
// Test-ID 稳定性测试补充步骤
// =========================

When(
  '我修改节点{string}的内容为{string}',
  async function (this: BDDWorld, testId: string, newContent: string) {
    await this.editNodeContent(testId, newContent)
  }
)
