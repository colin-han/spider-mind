import { Page } from '@playwright/test'

export class AuthNavigation {
  constructor(
    private page: Page,
    private baseUrl: string
  ) {}

  // 登录相关方法
  async loginAsTestUser() {
    if (!this.page) throw new Error('Page not initialized')

    await this.page.goto(`${this.baseUrl}/login`)
    await this.page.waitForLoadState('networkidle')

    await this.page.waitForSelector('input[id="email"]', { timeout: 10000 })

    // 填写autotester测试用户信息
    await this.page.fill('input[id="email"]', 'autotester@test.com')
    await this.page.fill('input[id="password"]', 'password123')

    // 点击登录按钮
    await this.page.click('button:has-text("登录")')

    // 等待重定向到思维导图列表页面
    await this.page.waitForURL('**/mindmaps', { timeout: 10000 })
  }

  async verifyOnEditPage() {
    if (!this.page) throw new Error('Page not initialized')
    return this.page.url().includes('/mindmaps/') && !this.page.url().endsWith('/mindmaps')
  }

  async verifyOnListPage() {
    if (!this.page) throw new Error('Page not initialized')
    return this.page.url().endsWith('/mindmaps')
  }

  async refreshPage() {
    if (!this.page) throw new Error('Page not initialized')

    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
  }
}
