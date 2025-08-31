import { Page } from '@playwright/test'
import { SmartWait } from './smart-wait'

export class DeleteOperations {
  private currentMindMapId: string | undefined
  private deleteRequests: string[]
  private smartWait: SmartWait

  constructor(
    private page: Page,
    currentMindMapId: string | undefined,
    deleteRequests: string[]
  ) {
    this.currentMindMapId = currentMindMapId
    this.deleteRequests = deleteRequests
    this.smartWait = new SmartWait(page)
  }

  // =========================
  // 删除功能相关方法
  // =========================

  // 点击思维导图卡片上的删除按钮
  async clickDeleteButtonOnMindMapCard(mindMapName: string) {
    if (!this.page) throw new Error('Page not initialized')

    // 等待思维导图列表加载完成
    await this.page.waitForFunction(
      () => {
        const cards = document.querySelectorAll(
          '[data-testid*="mindmap-card"], .mindmap-card, a[href*="/mindmaps/"]'
        )
        return cards.length > 0
      },
      { timeout: 3000 }
    )

    // 查找思维导图进行删除操作
    let cardFound = false

    // 如果有currentMindMapId，优先使用ID进行精确匹配
    if (this.currentMindMapId) {
      try {
        const cardByHref = this.page.locator(`a[href="/mindmaps/${this.currentMindMapId}"]`)
        if ((await cardByHref.count()) > 0) {
          // 悬停在卡片上以显示删除按钮
          await cardByHref.hover()
          // 等待删除按钮显示
          await this.smartWait.waitForNodeVisible('delete-button', { timeout: 2000 })

          // 查找删除按钮
          const deleteButton = this.page.locator(
            `a[href="/mindmaps/${this.currentMindMapId}"] button[data-testid="delete-button"]`
          )
          if (await deleteButton.isVisible()) {
            await deleteButton.click()
            cardFound = true
          }
        }
      } catch {
        // 如果ID查找失败，使用名称匹配作为备选
      }
    }

    // 如果通过ID没有找到，使用原有的名称匹配方式
    if (!cardFound) {
      try {
        const card = this.page
          .locator(`[data-testid*="mindmap-card"]:has-text("${mindMapName}")`)
          .first()
        if (await card.isVisible()) {
          // 悬停在卡片上以显示删除按钮
          await card.hover()
          // 等待删除按钮显示
          await this.smartWait.waitForNodeVisible('delete-button', { timeout: 2000 })

          try {
            const deleteButton = card.locator('[data-testid="delete-button"]').first()
            if (await deleteButton.isVisible()) {
              await deleteButton.click()
              cardFound = true
            } else {
              throw new Error(`未能找到名为"${mindMapName}"的思维导图卡片中的删除按钮`)
            }
          } catch {
            throw new Error(`未能找到名为"${mindMapName}"的思维导图卡片中的删除按钮`)
          }
        }
      } catch {
        throw new Error(`未能找到名为"${mindMapName}"的思维导图卡片`)
      }
    }

    // 等待删除确认对话框出现
    await this.smartWait.waitForNodeVisible('alert-dialog', { timeout: 3000 })
  }

  // 点击确认删除按钮
  async clickConfirmDeleteButton() {
    if (!this.page) throw new Error('Page not initialized')

    // 清除之前的删除请求记录
    this.deleteRequests.length = 0

    // 尝试多种确认按钮选择器
    const confirmSelectors = [
      '[data-testid="alert-dialog-confirm"]',
      'button:has-text("确认")',
      'button:has-text("删除")',
      'button:has-text("Delete")',
      'button:has-text("确定")',
      '[data-testid*="confirm"]',
      '[role="dialog"] button[variant="destructive"]',
      '.dialog button:has-text("确认")',
      'button[type="submit"]:has-text("确认")',
    ]

    let clicked = false
    for (const selector of confirmSelectors) {
      try {
        const button = this.page.locator(selector).first()
        if (await button.isVisible()) {
          await button.click()
          clicked = true
          break
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!clicked) {
      throw new Error('未能找到确认删除按钮')
    }

    // 等待删除操作开始（简单等待一下让操作生效）
    await this.page.waitForLoadState('domcontentloaded', { timeout: 1000 })
  }

  // 点击取消删除按钮
  async clickCancelDeleteButton() {
    if (!this.page) throw new Error('Page not initialized')

    // 尝试多种取消按钮选择器
    const cancelSelectors = [
      '[data-testid="alert-dialog-cancel"]',
      'button:has-text("取消")',
      'button:has-text("Cancel")',
      '[data-testid*="cancel"]',
      '[role="dialog"] button:not([variant="destructive"])',
      '.dialog button:has-text("取消")',
      'button[type="button"]:has-text("取消")',
    ]

    let clicked = false
    for (const selector of cancelSelectors) {
      try {
        const button = this.page.locator(selector).first()
        if (await button.isVisible()) {
          await button.click()
          clicked = true
          break
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!clicked) {
      throw new Error('未能找到取消删除按钮')
    }

    // 等待取消操作完成（对话框消失）
    await this.smartWait.waitForCondition(
      async () => {
        const dialogs = await this.page.$$('[data-testid*="dialog"], [data-testid*="confirm"]')
        return dialogs.length === 0
      },
      '取消删除对话框消失',
      { timeout: 2000 }
    )
  }

  // 悬停在思维导图卡片上
  async hoverOnMindMapCard() {
    if (!this.page) throw new Error('Page not initialized')

    // 找到第一个思维导图卡片并悬停（需要hover在group容器上才能触发group-hover效果）
    const cardSelectors = ['[data-testid*="mindmap-card-"]', '.spm-mindmap-card', '.group']

    for (const selector of cardSelectors) {
      try {
        const card = this.page.locator(selector).first()
        if (await card.isVisible()) {
          await card.hover()
          // 等待悬停效果生效（删除按钮出现）
          await this.smartWait.waitForCondition(
            async () => {
              const deleteButton = this.page.locator('[data-testid="delete-button"]')
              if ((await deleteButton.count()) === 0) return false

              // 检查opacity属性，因为按钮是通过group-hover:opacity-100显示的
              const opacity = await deleteButton
                .first()
                .evaluate(el => window.getComputedStyle(el).opacity)
              return opacity === '1'
            },
            '悬停效果生效（删除按钮出现）',
            { timeout: 2000, logLevel: 'DEBUG' }
          )
          return
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    throw new Error('未找到可悬停的思维导图卡片')
  }

  // 鼠标移出思维导图卡片
  async moveMouseAwayFromMindMapCard() {
    if (!this.page) throw new Error('Page not initialized')

    // 将鼠标移动到页面的一个空白区域
    await this.page.mouse.move(50, 50)

    // 等待删除按钮隐藏（检查opacity属性而不是visibility）
    await this.smartWait.waitForCondition(
      async () => {
        const deleteButton = this.page.locator('[data-testid="delete-button"]')
        if ((await deleteButton.count()) === 0) return true

        // 检查opacity属性，因为按钮是通过opacity-0隐藏的
        const opacity = await deleteButton
          .first()
          .evaluate(el => window.getComputedStyle(el).opacity)
        return opacity === '0'
      },
      '删除按钮隐藏',
      { timeout: 2000, logLevel: 'DEBUG' }
    )
  }

  // 点击思维导图卡片内容区域（非删除按钮）
  async clickMindMapCardContent() {
    if (!this.page) throw new Error('Page not initialized')

    // 找到思维导图卡片并点击其内容区域
    const cardSelectors = '.spm-mindmap-card'

    try {
      const cardContent = this.page.locator(cardSelectors).first()
      if (await cardContent.isVisible()) {
        await cardContent.click()
        await this.smartWait.waitForNavigation('**/mindmaps/**', { timeout: 10000 })
      }
    } catch {
      throw new Error('未找到可点击的思维导图卡片内容区域')
    }
  }
}
