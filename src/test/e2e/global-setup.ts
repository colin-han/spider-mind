import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(_config: FullConfig) {
  console.log('🚀 E2E测试全局设置开始')

  const { baseURL } = _config.projects[0].use

  // 启动浏览器进行预热和基础检查
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // 等待应用启动
    console.log(`等待应用启动: ${baseURL}`)
    await page.goto(baseURL!)

    // 等待页面完全加载
    await page.waitForLoadState('networkidle')

    // 检查应用是否正常响应
    const title = await page.title()
    console.log(`应用标题: ${title}`)

    // 创建测试数据
    await setupTestData(page)

    console.log('✅ E2E测试全局设置完成')
  } catch (error) {
    console.error('❌ E2E测试全局设置失败:', error)
    throw error
  } finally {
    await browser.close()
  }
}

async function setupTestData(page: import('@playwright/test').Page) {
  // 创建测试用户（如果需要）
  const testUser = {
    email: 'e2etest@example.com',
    password: 'E2ETest123!',
    username: 'e2etestuser',
    fullName: 'E2E Test User',
  }

  // 这里可以通过API调用创建测试数据
  // 或者直接在数据库中插入测试数据
  console.log('设置测试用户:', testUser.email)

  // 示例：通过页面注册测试用户（如果有注册功能）
  // await page.goto('/register')
  // await page.fill('[data-testid="email-input"]', testUser.email)
  // await page.fill('[data-testid="password-input"]', testUser.password)
  // await page.click('[data-testid="register-button"]')
}

export default globalSetup
