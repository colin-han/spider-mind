import { Page } from '@playwright/test'

export class TestAuthHelper {
  constructor(
    private page: Page,
    private baseUrl: string
  ) {}

  async setupTestAuth(userEmail: string = 'autotester@test.com'): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    console.log(`[TEST AUTH HELPER] Starting auth for user: ${userEmail}`)

    // 构造带有测试认证参数的URL
    const testUrl = `${this.baseUrl}/mindmaps?test_auth=${encodeURIComponent(userEmail)}&test_token=test-auth-secret-2025`
    console.log(`[TEST AUTH HELPER] Navigating to: ${testUrl}`)

    // 直接导航到目标页面，认证逻辑会在AuthProvider中自动处理
    await this.page.goto(testUrl)
    await this.page.waitForLoadState('domcontentloaded')

    console.log('[TEST AUTH HELPER] Page loaded, waiting for auth completion')

    // 等待用户状态加载完成，增加重试机制
    let authCompleted = false
    let retryCount = 0
    const maxRetries = 3

    while (!authCompleted && retryCount < maxRetries) {
      try {
        await this.page.waitForFunction(
          () => {
            const user = localStorage.getItem('spider-mind-user')
            console.log('[TEST AUTH] Checking localStorage, user:', user ? 'found' : 'not found')
            return user !== null
          },
          { timeout: 5000 }
        )
        authCompleted = true
        console.log('[TEST AUTH HELPER] Auth completed successfully')
      } catch (error) {
        retryCount++
        console.log(`[TEST AUTH HELPER] Auth attempt ${retryCount} failed, retrying...`)
        if (retryCount >= maxRetries) {
          throw new Error(`Authentication failed after ${maxRetries} attempts: ${error}`)
        }
        // 短暂等待后重试
        await this.page.waitForTimeout(1000)
      }
    }

    // 验证已经在思维导图列表页面
    try {
      await this.page.waitForURL('**/mindmaps', { timeout: 5000 })
      console.log('[TEST AUTH HELPER] Successfully navigated to mindmaps page')
    } catch (error) {
      const currentUrl = this.page.url()
      throw new Error(`Failed to reach mindmaps page, current URL: ${currentUrl}, error: ${error}`)
    }
  }

  async verifyAuthState(): Promise<boolean> {
    if (!this.page) return false

    try {
      const userExists = await this.page.evaluate(() => {
        return localStorage.getItem('spider-mind-user') !== null
      })

      const onCorrectPage = this.page.url().includes('/mindmaps')

      return userExists && onCorrectPage
    } catch {
      return false
    }
  }
}
