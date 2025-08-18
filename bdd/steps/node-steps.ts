import { When } from '@cucumber/cucumber'
import { BDDWorld } from '../support/world'

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
  // 选中要删除的节点
  await this.selectNodeByTestId(testId)

  console.log(`按下Delete键删除节点: ${testId}`)
  await this.page!.keyboard.press('Delete')

  // 等待确认对话框出现或操作完成（统一超时设置）
  await this.page!.waitForFunction(
    () => {
      const dialogs = document.querySelectorAll('[data-testid="alert-dialog-confirm"]')
      return dialogs.length > 0 || true // 无论如何继续检查
    },
    { timeout: 1000 }
  )

  try {
    const button = this.page!.locator('[data-testid="alert-dialog-confirm"]')
    if (await button.isVisible()) {
      console.log(`点击确认按钮: [data-testid="alert-dialog-confirm"]`)
      await button.click()
    }
  } catch (_e) {
    throw new Error('未能找到确认删除按钮')
  }

  console.log(`节点 ${testId} 删除完成`)
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

  // 等待节点选中状态生效（统一超时设置）
  await this.page.waitForFunction(
    parentTestId => {
      const node = document.querySelector(`[data-testid="${parentTestId}"]`)
      return node && node.getAttribute('data-node-selected') === 'true'
    },
    parentTestId,
    { timeout: 1000 }
  )

  // 检查添加节点按钮是否存在
  const buttonExists = await this.page.locator('[data-testid="add-node-button"]').count()
  if (buttonExists === 0) {
    throw new Error('找不到添加节点按钮')
  }

  // 点击添加节点按钮
  await this.page.click('[data-testid="add-node-button"]')

  // 等待页面处理和节点创建（统一超时设置）
  await this.page.waitForFunction(
    () => {
      const nodes = document.querySelectorAll('[data-testid*="root-"]')
      return nodes.length > 0
    },
    { timeout: 1000 }
  )

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

// 空白区域操作
When('我点击思维导图的空白区域取消所有节点选中', async function (this: BDDWorld) {
  await this.clickBlankArea()
})

// 创建测试思维导图步骤
When('我创建一个新的思维导图如下：', async function (this: BDDWorld, docString: string) {
  await this.createMindMapFromTreeStructure(docString)
})

When(
  '我修改节点{string}的内容为{string}',
  async function (this: BDDWorld, testId: string, newContent: string) {
    await this.editNodeContent(testId, newContent)
  }
)
