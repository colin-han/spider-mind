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
  const startTime = Date.now()
  console.log(`[STEP] 开始为节点"${parentTestId}"添加子节点`)

  try {
    // 使用优化后的addChildNode方法，直接添加子节点并返回新节点test-id
    const newChildTestId = await this.addChildNode(parentTestId)

    const duration = Date.now() - startTime
    console.log(`[STEP] 成功完成步骤"用户为节点添加子节点" (${duration}ms)`, {
      parentTestId,
      newChildTestId,
      stepDuration: duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[STEP] 步骤"用户为节点添加子节点"失败 (${duration}ms)`, {
      parentTestId,
      stepDuration: duration,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
})

When('用户删除节点{string}', async function (this: BDDWorld, testId: string) {
  // 使用deleteNode方法，选中节点并确认删除
  await this.deleteNode(testId)
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
