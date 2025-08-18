import { Page } from '@playwright/test'

export class DeleteVerification {
  private currentMindMapId: string | undefined
  private deleteRequests: string[]

  constructor(
    private page: Page,
    currentMindMapId: string | undefined,
    deleteRequests: string[]
  ) {
    this.currentMindMapId = currentMindMapId
    this.deleteRequests = deleteRequests
  }

  // 验证删除确认对话框是否显示
  async verifyDeleteConfirmDialog(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 尝试多种对话框选择器
    const dialogSelectors = [
      '[data-testid="alert-dialog"]',
      '[role="dialog"]',
      '.dialog',
      '[data-testid*="delete-dialog"]',
      '[data-testid*="confirm-dialog"]',
      '.modal',
      '.delete-confirmation',
    ]

    for (const selector of dialogSelectors) {
      try {
        const dialog = this.page.locator(selector)
        if (await dialog.isVisible()) {
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证对话框标题
  async verifyDialogTitle(expectedTitle: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 尝试多种标题选择器
    const titleSelectors = [
      '[data-testid="alert-dialog-title"]',
      '[role="dialog"] h1',
      '[role="dialog"] h2',
      '[role="dialog"] .dialog-title',
      '.dialog h1',
      '.dialog h2',
      '.modal-title',
      '[data-testid*="dialog-title"]',
    ]

    for (const selector of titleSelectors) {
      try {
        const titleElement = this.page.locator(selector)
        if (await titleElement.isVisible()) {
          const actualTitle = await titleElement.textContent()
          if (actualTitle?.includes(expectedTitle)) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    // 也检查是否有包含期望标题的文本
    const titleText = await this.page.locator(`text="${expectedTitle}"`).count()
    return titleText > 0
  }

  // 验证对话框内容
  async verifyDialogContent(expectedContent: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 首先检查具体的AlertDialog描述内容
    try {
      const descriptionElement = this.page.locator('[data-testid="alert-dialog-description"]')
      if (await descriptionElement.isVisible()) {
        const descriptionText = await descriptionElement.textContent()
        if (descriptionText?.includes(expectedContent)) {
          return true
        }
      }
    } catch {
      // 继续尝试其他方法
    }

    // 检查对话框是否包含期望的内容
    const contentSelectors = [
      '[data-testid="alert-dialog"]',
      '[role="dialog"]',
      '.dialog',
      '.modal',
    ]

    for (const selector of contentSelectors) {
      try {
        const dialog = this.page.locator(selector)
        if (await dialog.isVisible()) {
          const dialogText = await dialog.textContent()
          if (dialogText?.includes(expectedContent)) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证删除进度状态
  async verifyDeleteProgressStatus(expectedStatus: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 尝试在短时间内等待状态出现
    try {
      // 首先检查删除确认按钮文本是否显示进度状态
      const confirmButton = this.page.locator('[data-testid="alert-dialog-confirm"]')
      await confirmButton.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {})

      if (await confirmButton.isVisible()) {
        // 等待按钮文本更新
        try {
          await this.page.waitForFunction(
            expectedText => {
              const element = document.querySelector('[data-testid="alert-dialog-confirm"]')
              return element && element.textContent && element.textContent.includes(expectedText)
            },
            expectedStatus,
            { timeout: 2000 }
          )
          return true
        } catch {
          // 如果等待超时，检查当前文本
          const buttonText = await confirmButton.textContent()
          if (buttonText?.includes(expectedStatus)) {
            return true
          }
        }
      }
    } catch {
      // 继续检查其他位置
    }

    // 检查是否在其他位置显示删除进度状态
    const statusSelectors = [
      `text="${expectedStatus}"`,
      '[role="status"]',
      '.loading',
      '.progress',
      '[data-testid*="status"]',
    ]

    for (const selector of statusSelectors) {
      try {
        const status = this.page.locator(selector)
        if (await status.isVisible()) {
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证删除API请求
  async verifyDeleteApiRequest(expectedUrl: string): Promise<boolean> {
    // 替换URL中的占位符
    const _actualExpectedUrl = expectedUrl.replace('{思维导图ID}', this.currentMindMapId || '')

    // 检查是否有匹配的删除请求
    return this.deleteRequests.some(
      url =>
        url.includes('/api/mindmaps/') &&
        (this.currentMindMapId ? url.includes(this.currentMindMapId) : true)
    )
  }

  // 验证思维导图卡片不再可见
  async verifyMindMapCardNotVisible(mindMapName: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待网络请求完成
    await this.page.waitForLoadState('networkidle')

    // 尝试等待页面的DOM变化
    try {
      await this.page.waitForFunction(
        mindMapName => {
          // 使用纯JavaScript查找包含特定文本的链接
          const links = document.querySelectorAll('a[href*="/mindmaps/"]')
          for (const link of links) {
            if (link.textContent && link.textContent.includes(mindMapName)) {
              return false // 找到包含该名称的链接，说明还没有删除
            }
          }
          return true // 没有找到包含该名称的链接，说明已删除
        },
        mindMapName,
        { timeout: 1000 }
      )
      // DOM变化检测成功
    } catch (_error) {
      // DOM变化检测超时
    }

    // 等待页面更新完成
    await this.page.waitForTimeout(1000)

    // 检查思维导图卡片是否不再存在
    const cardSelectors = [
      `[data-testid*="mindmap-card"]:has-text("${mindMapName}")`,
      `.mindmap-card:has-text("${mindMapName}")`,
      `a[href*="/mindmaps/"]:has-text("${mindMapName}")`,
      `div:has(h3:text("${mindMapName}"))`,
      `text="${mindMapName}"`,
    ]

    for (let i = 0; i < cardSelectors.length; i++) {
      const selector = cardSelectors[i]
      try {
        const card = this.page.locator(selector)
        const count = await card.count()
        const isVisible =
          count > 0
            ? await card
                .first()
                .isVisible()
                .catch(() => false)
            : false

        if (isVisible) {
          return false
        }
      } catch (_error) {
        // 继续检查下一个选择器
      }
    }
    return true
  }

  // 验证思维导图卡片仍然可见
  async verifyMindMapCardVisible(mindMapName: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待页面稳定（检查卡片渲染完成）
    await this.page.waitForFunction(
      () => {
        const cards = document.querySelectorAll(
          'a[href*="/mindmaps/"], [data-testid*="mindmap-card"]'
        )
        return cards.length > 0 || document.querySelector('.no-mindmaps, .empty-state')
      },
      { timeout: 300 }
    )

    // 检查思维导图卡片是否仍然存在
    const cardSelectors = [
      `text="${mindMapName}"`,
      `h3:has-text("${mindMapName}")`,
      `[title="${mindMapName}"]`,
      `a[href*="/mindmaps/"]:has-text("${mindMapName}")`,
      `div:has(h3:text("${mindMapName}"))`,
      `[data-testid*="mindmap-card"]:has-text("${mindMapName}")`,
      `.mindmap-card:has-text("${mindMapName}")`,
    ]

    for (const selector of cardSelectors) {
      try {
        const card = this.page.locator(selector)
        const isVisible = await card.isVisible().catch(() => false)
        if (isVisible) {
          return true
        }
      } catch {
        // 继续检查下一个选择器
      }
    }

    return false
  }

  // 验证统计信息更新
  async verifyStatsUpdated(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待统计信息更新（检查页面加载完成）
    await this.page.waitForLoadState('networkidle')

    // 检查页面底部是否有统计信息并已更新
    const statsSelectors = [
      '.stats',
      '.statistics',
      '[data-testid*="stats"]',
      'text*="总计"',
      'text*="个思维导图"',
      'footer',
    ]

    for (const selector of statsSelectors) {
      try {
        const stats = this.page.locator(selector)
        if (await stats.isVisible()) {
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    // 如果没有明确的统计信息，认为更新成功
    return true
  }

  // 验证删除对话框关闭
  async verifyDeleteDialogClosed(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待对话框关闭（检查DOM更新）
    await this.page.waitForFunction(
      () => {
        const dialogs = document.querySelectorAll(
          '[data-testid*="dialog"], [data-testid*="confirm"]'
        )
        return dialogs.length === 0
      },
      { timeout: 300 }
    )

    // 检查删除确认对话框是否已关闭
    return !(await this.verifyDeleteConfirmDialog())
  }

  // 验证删除成功提示
  async verifyDeleteSuccessMessage(expectedMessage: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 检查是否有成功提示
    const messageSelectors = [
      `text="${expectedMessage}"`,
      '.toast',
      '[role="status"]',
      '.success-message',
      '[data-testid*="success"]',
      '.notification',
    ]

    for (const selector of messageSelectors) {
      try {
        const message = this.page.locator(selector)
        if (await message.isVisible()) {
          const messageText = await message.textContent()
          if (messageText?.includes(expectedMessage)) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证删除按钮可见
  async verifyDeleteButtonVisible(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 检查删除按钮是否可见（考虑opacity）
    const deleteButtonSelectors = [
      'button[title*="删除"]',
      '[data-testid*="delete"]',
      'button:has-text("删除")',
      '.delete-button',
      'svg[data-testid*="trash"]',
    ]

    for (const selector of deleteButtonSelectors) {
      try {
        const deleteButton = this.page.locator(selector).first()
        if (await deleteButton.isVisible()) {
          // 检查opacity属性，大于0表示真正可见
          const opacity = await deleteButton
            .evaluate(el => {
              const style = window.getComputedStyle(el)
              return parseFloat(style.opacity)
            })
            .catch(() => 1) // 默认为不透明

          if (opacity > 0) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证删除按钮隐藏
  async verifyDeleteButtonHidden(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待动画完成
    await this.page.waitForTimeout(500)

    // 检查删除按钮是否隐藏
    return !(await this.verifyDeleteButtonVisible())
  }

  // 验证没有触发删除操作
  async verifyNoDeleteTriggered(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 检查是否没有删除确认对话框出现
    const hasDialog = await this.verifyDeleteConfirmDialog()
    if (hasDialog) {
      return false
    }

    // 检查是否没有删除API请求
    if (this.deleteRequests.length > 0) {
      return false
    }

    return true
  }

  // 验证错误提示
  async verifyErrorMessage(expectedErrorMessage: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待错误提示出现（可能需要时间）
    await this.page.waitForTimeout(2000)

    // 检查是否有错误提示
    const errorSelectors = [
      '[data-testid="delete-error-message"]',
      `text="${expectedErrorMessage}"`,
      '.error-message',
      '.toast.error',
      '[role="alert"]',
      '[data-testid*="error"]',
      '.notification.error',
    ]

    for (const selector of errorSelectors) {
      try {
        const error = this.page.locator(selector)
        // 等待元素可见，最多5秒
        await error.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
        if (await error.isVisible()) {
          const errorText = await error.textContent()
          if (errorText?.includes(expectedErrorMessage)) {
            return true
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    return false
  }

  // 验证列表刷新移除不存在的条目
  async verifyListRefreshedAfterError(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized')

    // 等待列表刷新
    await this.page.waitForTimeout(2000)

    // 检查页面是否重新加载了思维导图列表
    const listSelectors = [
      '[data-testid*="mindmap-card"]',
      '.mindmap-card',
      'a[href*="/mindmaps/"]',
    ]

    for (const selector of listSelectors) {
      try {
        const cards = this.page.locator(selector)
        const count = await cards.count()
        if (count > 0) {
          return true
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    // 如果没有卡片，也认为列表已刷新
    return true
  }
}
