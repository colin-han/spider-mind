import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/test/e2e',
  /* 并行运行测试 */
  fullyParallel: true,
  /* 失败时停止其他测试 */
  forbidOnly: !!process.env.CI,
  /* CI环境下重试失败的测试 */
  retries: process.env.CI ? 2 : 0,
  /* 选择worker数量 */
  workers: process.env.CI ? 1 : undefined,
  /* 报告器配置 */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],
  /* 共享设置 */
  use: {
    /* 基础URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* 在失败时收集跟踪信息 */
    trace: 'on-first-retry',

    /* 截图配置 */
    screenshot: 'only-on-failure',

    /* 录制视频 */
    video: 'retain-on-failure',

    /* 全局超时 */
    actionTimeout: 10000,
    navigationTimeout: 30000,

    /* 忽略HTTPS错误 */
    ignoreHTTPSErrors: true,

    /* 浏览器上下文配置 */
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',

    /* 额外HTTP头 */
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  },

  /* 配置项目以在多个浏览器上运行测试 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 移动端浏览器测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* 微软Edge测试 */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /* Google Chrome测试 */
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* 测试前启动开发服务器 */
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* 全局设置和拆除 */
  globalSetup: './src/test/e2e/global-setup.ts',
  globalTeardown: './src/test/e2e/global-teardown.ts',

  /* 测试超时 */
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  /* 输出目录 */
  outputDir: 'test-results/e2e-artifacts',
})
