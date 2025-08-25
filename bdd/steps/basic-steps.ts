import { Given, When } from '@cucumber/cucumber'
import { BDDWorld } from '../support/world'

When('等待{int}秒', { timeout: 60 * 1000 }, async function (this: BDDWorld, seconds: number) {
  await this.page?.waitForTimeout(seconds * 1000)
})

// Given步骤
Given('用户已经登录', async function (this: BDDWorld) {
  await this.setupTestAuth()
})

Given('用户在思维导图管理页面', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')

  // 确保在思维导图管理页面
  await this.page.goto(`${this.baseUrl}/mindmaps`)
  await this.page.waitForLoadState('networkidle')
})

Given('用户已经创建了一个包含主节点的思维导图', async function (this: BDDWorld) {
  await this.createMindMapWithMainNode()
})

Given(
  '用户已经创建了一个仅包含主节点的思维导图，名字叫：{string}',
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

Given('用户已经打开了一个思维导图', async function (this: BDDWorld) {
  await this.openExistingMindMap()
})

Given('用户已经打开了一个包含子节点的思维导图', async function (this: BDDWorld) {
  await this.openMindMapWithChildNodes()
})

// When步骤
When('用户点击{string}按钮', async function (this: BDDWorld, buttonText: string) {
  if (buttonText === '添加子节点' || buttonText === '添加节点') {
    await this.clickAddChildNode()
  } else if (buttonText === '保存') {
    await this.clickSaveButton()
  } else if (buttonText === '新建思维导图') {
    // 严格按描述：只点击按钮，不做任何额外操作
    await this.clickNewMindMapButtonOnly()
  }
})

// 统一的按键处理 - 支持多种按键名称格式
When('用户按下{string}键', async function (this: BDDWorld, keyName: string) {
  if (!this.page) throw new Error('Page not initialized')

  // 按键名称映射表 - 支持多种命名格式
  const keyMap: { [key: string]: string } = {
    // Escape相关
    ESC: 'Escape',
    Esc: 'Escape',
    esc: 'Escape',
    Escape: 'Escape',
    // Enter相关
    Enter: 'Enter',
    enter: 'Enter',
    ENTER: 'Enter',
    // Tab相关
    Tab: 'Tab',
    tab: 'Tab',
    TAB: 'Tab',
    // Delete相关
    Delete: 'Delete',
    delete: 'Delete',
    DELETE: 'Delete',
    // 功能键
    F2: 'F2',
    f2: 'F2',
    // 方向键
    上: 'ArrowUp',
    下: 'ArrowDown',
    左: 'ArrowLeft',
    右: 'ArrowRight',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
  }

  const actualKey = keyMap[keyName] || keyName
  await this.page.keyboard.press(actualKey)

  // 统一的超时设置：等待按键操作生效
  await this.page.waitForLoadState('domcontentloaded', { timeout: 1000 })
})

When('用户点击对话框外部区域', async function (this: BDDWorld) {
  if (!this.page) throw new Error('Page not initialized')

  // 点击对话框外部区域（页面背景）
  await this.page.click('body', { position: { x: 10, y: 10 } })
})

When('用户点击保存按钮', async function (this: BDDWorld) {
  await this.clickSaveButton()
})

When('用户从思维导图列表页面打开该思维导图', async function (this: BDDWorld) {
  await this.openMindMapFromList()
})

When('用户双击主节点进入编辑模式', async function (this: BDDWorld) {
  // 使用新的基于test-id的统一操作
  await this.doubleClickMainNode()
})

When('用户输入{string}', async function (this: BDDWorld, text: string) {
  await this.inputText(text)
})

When('用户点击enter键', async function (this: BDDWorld) {
  // 使用统一的按键处理
  if (!this.page) throw new Error('Page not initialized')
  await this.page.keyboard.press('Enter')
  await this.page.waitForLoadState('domcontentloaded', { timeout: 1000 })
})

When('用户刷新页面', async function (this: BDDWorld) {
  await this.refreshPage()
})

When('用户点击一个子节点', async function (this: BDDWorld) {
  await this.clickChildNode()
})

When('用户点击主节点', async function (this: BDDWorld) {
  // 使用新的基于test-id的统一操作
  await this.clickMainNode()
})

When('用户点击{string}思维导图', async function (this: BDDWorld, mindMapName: string) {
  // 在思维导图列表页面点击指定名字的思维导图
  if (!this.page) throw new Error('Page not initialized')

  // 根据思维导图名字点击对应的卡片
  await this.page.click(`text="${mindMapName}"`)

  // 等待跳转到编辑页面
  await this.page.waitForURL('**/mindmaps/**')

  // 提取并跟踪思维导图ID
  await this.extractAndTrackMindMapId()
})
