import { When } from '@cucumber/cucumber'
import { BDDWorld } from '../support/world'

// =========================
// Test-ID 稳定性测试专用步骤
// =========================

When('用户修改主节点内容为{string}', async function (this: BDDWorld, newContent: string) {
  await this.editNodeContent('root', newContent)
})

When(
  '用户为{string}节点创建多个子节点{string}',
  async function (this: BDDWorld, parentTestId: string, childrenJson: string) {
    // 解析子节点数组
    const childrenNames: string[] = JSON.parse(childrenJson)

    // 使用BDDWorld方法创建多个子节点
    await this.createMultipleChildNodes(parentTestId, childrenNames)
  }
)

When(
  '用户为{string}节点创建以下子节点：',
  async function (this: BDDWorld, parentTestId: string, dataTable) {
    // 从DataTable获取子节点名称列表
    const rows = dataTable.raw()
    const childrenNames: string[] = rows.map((row: string[]) => row[0])

    // 使用BDDWorld方法创建多个子节点
    await this.createMultipleChildNodes(parentTestId, childrenNames)
  }
)

When('用户删除节点{string}', async function (this: BDDWorld, testId: string) {
  // 选中要删除的节点
  await this.selectNodeByTestId(testId)

  await this.page!.keyboard.press('Delete')

  // 等待确认对话框出现
  try {
    await this.page!.waitForSelector('[data-testid="alert-dialog-confirm"]', { timeout: 5000 })
  } catch (_error) {
    // 可能是根节点保护，检查是否有保护提示
    const protectionMessage = await this.page!.locator('text="根节点不能被删除"').count()
    if (protectionMessage > 0) {
      throw new Error('试图删除受保护的根节点')
    }
    throw new Error('删除确认对话框未出现')
  }

  // 点击确认删除按钮
  const button = this.page!.locator('[data-testid="alert-dialog-confirm"]')
  await button.click()

  // 等待对话框消失
  await this.page!.waitForSelector('[data-testid="alert-dialog-confirm"]', {
    state: 'detached',
    timeout: 3000,
  })
})

// =========================
// 基于Test-ID的统一节点操作步骤
// =========================

// 基础节点操作
When('用户选中节点{string}', async function (this: BDDWorld, testId: string) {
  await this.selectNodeByTestId(testId)
})

When('用户双击节点{string}', async function (this: BDDWorld, testId: string) {
  await this.doubleClickNode(testId)
})

When('用户为节点{string}添加子节点', async function (this: BDDWorld, parentTestId: string) {
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
When('用户点击思维导图的空白区域取消所有节点选中', async function (this: BDDWorld) {
  await this.clickBlankArea()
})

// 创建测试思维导图步骤
When('用户创建一个新的思维导图如下：', async function (this: BDDWorld, docString: string) {
  await this.createMindMapFromTreeStructure(docString)
})

When(
  '用户修改节点{string}的内容为{string}',
  async function (this: BDDWorld, testId: string, newContent: string) {
    await this.editNodeContent(testId, newContent)
  }
)
