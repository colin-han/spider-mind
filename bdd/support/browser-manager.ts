import { BrowserContext, Page, Browser } from '@playwright/test'
import { chromium } from '@playwright/test'

export class BrowserManager {
  public browser: Browser | undefined
  public context: BrowserContext | undefined
  public page: Page | undefined
  private deleteRequests: string[] = []

  async setupBrowser() {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: 100,
    })
    this.context = await this.browser.newContext()
    this.page = await this.context.newPage()

    // 设置较长的超时时间
    this.page.setDefaultTimeout(30000)

    // 监听网络请求，用于验证删除API调用
    this.page.on('request', request => {
      if (request.method() === 'DELETE' && request.url().includes('/api/mindmaps/')) {
        this.deleteRequests.push(request.url())
      }
    })
  }

  async cleanup() {
    if (this.page) {
      await this.page.close()
    }
    if (this.context) {
      await this.context.close()
    }
    if (this.browser) {
      await this.browser.close()
    }
  }

  getDeleteRequests(): string[] {
    return this.deleteRequests
  }

  clearDeleteRequests(): void {
    this.deleteRequests = []
  }

  async captureScreenshotOnFailure(scenario: { result?: { status: string } }) {
    if (scenario.result?.status === 'FAILED' && this.page) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      await this.page.screenshot({
        path: `test-results/failure-${timestamp}.png`,
        fullPage: true,
      })
    }
  }
}
