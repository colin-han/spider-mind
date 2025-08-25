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
    })
    
    // 创建上下文时启用trace记录
    this.context = await this.browser.newContext({
      // 启用失败时的trace记录
      recordVideo: process.env.CI ? undefined : { dir: 'test-results/videos' },
    })
    
    // 启动trace记录
    await this.context.tracing.start({ 
      screenshots: true, 
      snapshots: true,
      sources: true 
    })
    
    this.page = await this.context.newPage()

    // 优化超时设置 - 分级超时策略
    this.page.setDefaultTimeout(15000) // 进一步优化到15s
    
    // 针对并行执行优化页面配置
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    })
    
    // 加速页面加载
    await this.page.route('**/*', (route) => {
      const request = route.request()
      // 阻止不必要的资源加载以加速测试
      if (request.resourceType() === 'image' && !request.url().includes('icon')) {
        route.abort()
      } else {
        route.continue()
      }
    })

    // 监听网络请求，用于验证删除API调用
    this.page.on('request', request => {
      if (request.method() === 'DELETE' && request.url().includes('/api/mindmaps/')) {
        this.deleteRequests.push(request.url())
      }
    })
  }

  async cleanup() {
    try {
      // 异步清理，不阻塞测试完成
      const cleanupPromises = []
      
      // 停止并保存trace（如果正在记录）
      if (this.context) {
        try {
          const tracingStopPromise = this.context.tracing.stop().catch(() => {
            // Trace可能已经停止或context已关闭，忽略错误
          })
          cleanupPromises.push(tracingStopPromise)
        } catch (_error) {
          // Trace可能已经停止，忽略错误
        }
      }
      
      if (this.page) {
        cleanupPromises.push(this.page.close().catch(() => {}))
      }
      if (this.context) {
        cleanupPromises.push(this.context.close().catch(() => {}))
      }
      if (this.browser) {
        cleanupPromises.push(this.browser.close().catch(() => {}))
      }

      // 并行执行所有清理操作，设置较短超时
      await Promise.all(cleanupPromises.map(p => 
        Promise.race([p, new Promise(resolve => setTimeout(resolve, 2000))])
      ))
    } catch (error) {
      console.error('[CLEANUP] Error during cleanup:', error)
    }
  }

  async saveTraceOnFailure(scenarioName: string) {
    if (this.context) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const tracePath = `test-results/trace-${scenarioName}-${timestamp}.zip`
      
      try {
        await this.context.tracing.stop({ path: tracePath })
        console.log(`[TRACE] Trace saved to: ${tracePath}`)
        
        // 重新启动trace记录为下一个测试准备
        await this.context.tracing.start({ 
          screenshots: true, 
          snapshots: true,
          sources: true 
        })
      } catch (error) {
        console.error(`[TRACE] Failed to save trace: ${error}`)
      }
    }
  }

  getDeleteRequests(): string[] {
    return this.deleteRequests
  }

  clearDeleteRequests(): void {
    this.deleteRequests = []
  }

  async captureScreenshotOnFailure(scenario: { 
    result?: { status: string },
    pickle?: { name: string }
  }) {
    if (scenario.result?.status === 'FAILED') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const scenarioName = scenario.pickle?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'unknown'
      
      // 保存截图
      if (this.page) {
        try {
          await this.page.screenshot({
            path: `test-results/failure-${scenarioName}-${timestamp}.png`,
            fullPage: true,
          })
          console.log(`[SCREENSHOT] Screenshot saved for failed scenario: ${scenarioName}`)
        } catch (error) {
          console.error(`[SCREENSHOT] Failed to save screenshot: ${error}`)
        }
      }
      
      // 保存trace文件
      await this.saveTraceOnFailure(scenarioName)
      
      // 收集浏览器控制台日志
      if (this.page) {
        try {
          const logs = await this.page.evaluate(() => {
            return (window as unknown as { __testLogs?: string[] }).__testLogs || []
          })
          console.log(`[CONSOLE LOGS] Logs for failed scenario ${scenarioName}:`, logs)
        } catch (error) {
          console.error(`[CONSOLE LOGS] Failed to collect logs: ${error}`)
        }
      }
    }
  }
}
