import { Page } from '@playwright/test'

/**
 * 智能等待函数库
 * 提供基于状态的等待机制，替代固定时间延迟
 * 包含详细的日志记录和错误追踪
 */

export interface WaitOptions {
  timeout?: number
  polling?: number
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
}

export class SmartWait {
  constructor(private page: Page) {}

  private log(level: string, message: string, context?: Record<string, unknown>) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level}] ${message}`
    
    if (context) {
      console.log(logMessage, context)
    } else {
      console.log(logMessage)
    }
  }

  /**
   * 等待元素存在且可见
   */
  async waitForElementVisible(
    testId: string, 
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = 5000, logLevel = 'INFO' } = options
    const selector = `[data-testid="${testId}"]`
    const startTime = Date.now()

    this.log(logLevel, `等待元素可见: ${testId}`, { selector, timeout })

    try {
      await this.page.waitForSelector(selector, { 
        state: 'visible', 
        timeout 
      })
      
      const duration = Date.now() - startTime
      this.log(logLevel, `元素已可见: ${testId} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = `等待元素可见超时: ${testId} (${duration}ms)`
      
      this.log('ERROR', errorMessage, {
        selector,
        timeout,
        actualWaitTime: duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      // 添加更多诊断信息
      const elementExists = await this.page.$$(selector)
      this.log('ERROR', `诊断信息`, {
        elementsFound: elementExists.length,
        pageUrl: this.page.url(),
        pageTitle: await this.page.title()
      })
      
      throw new Error(`${errorMessage} - 请检查元素是否存在或页面是否正确加载`)
    }
  }

  /**
   * 等待元素可交互（可见且未被禁用）
   */
  async waitForElementInteractable(
    testId: string, 
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = 5000, logLevel = 'INFO' } = options
    const selector = `[data-testid="${testId}"]`
    const startTime = Date.now()

    this.log(logLevel, `等待元素可交互: ${testId}`, { selector, timeout })

    try {
      // 首先等待元素可见
      await this.waitForElementVisible(testId, { timeout, logLevel: 'DEBUG' })
      
      // 然后等待元素可交互
      await this.page.waitForFunction(
        sel => {
          const element = document.querySelector(sel) as HTMLElement
          return element && 
                 !element.hasAttribute('disabled') && 
                 element.offsetParent !== null &&
                 window.getComputedStyle(element).pointerEvents !== 'none'
        },
        selector,
        { timeout: timeout - (Date.now() - startTime), polling: 100 }
      )
      
      const duration = Date.now() - startTime
      this.log(logLevel, `元素可交互: ${testId} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = `等待元素可交互超时: ${testId} (${duration}ms)`
      
      // 收集诊断信息
      const elementInfo = await this.page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement
        if (!el) return { exists: false }
        
        return {
          exists: true,
          visible: el.offsetParent !== null,
          disabled: el.hasAttribute('disabled'),
          pointerEvents: window.getComputedStyle(el).pointerEvents,
          bounds: el.getBoundingClientRect()
        }
      }, selector)
      
      this.log('ERROR', errorMessage, {
        selector,
        timeout,
        actualWaitTime: duration,
        elementInfo,
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw new Error(`${errorMessage} - 元素状态: ${JSON.stringify(elementInfo)}`)
    }
  }

  /**
   * 等待网络请求完成
   */
  async waitForNetworkIdle(options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000, logLevel = 'INFO' } = options
    const startTime = Date.now()

    this.log(logLevel, `等待网络静默`, { timeout })

    try {
      await this.page.waitForLoadState('networkidle', { timeout })
      
      const duration = Date.now() - startTime
      this.log(logLevel, `网络已静默 (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = `等待网络静默超时 (${duration}ms)`
      
      this.log('ERROR', errorMessage, {
        timeout,
        actualWaitTime: duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw new Error(errorMessage)
    }
  }

  /**
   * 等待页面导航完成
   */
  async waitForNavigation(
    expectedUrl?: string, 
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = 15000, logLevel = 'INFO' } = options
    const startTime = Date.now()

    this.log(logLevel, `等待页面导航`, { expectedUrl, timeout })

    try {
      if (expectedUrl) {
        await this.page.waitForURL(expectedUrl, { timeout })
      } else {
        await this.page.waitForLoadState('domcontentloaded', { timeout })
      }
      
      const duration = Date.now() - startTime
      const currentUrl = this.page.url()
      this.log(logLevel, `页面导航完成 (${duration}ms)`, { currentUrl })
    } catch (error) {
      const duration = Date.now() - startTime
      const currentUrl = this.page.url()
      const errorMessage = `等待页面导航超时 (${duration}ms)`
      
      this.log('ERROR', errorMessage, {
        expectedUrl,
        currentUrl,
        timeout,
        actualWaitTime: duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw new Error(`${errorMessage} - 当前URL: ${currentUrl}`)
    }
  }

  /**
   * 等待元素消失
   */
  async waitForElementHidden(
    testId: string, 
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = 5000, logLevel = 'INFO' } = options
    const selector = `[data-testid="${testId}"]`
    const startTime = Date.now()

    this.log(logLevel, `等待元素消失: ${testId}`, { selector, timeout })

    try {
      await this.page.waitForSelector(selector, { 
        state: 'hidden', 
        timeout 
      })
      
      const duration = Date.now() - startTime
      this.log(logLevel, `元素已消失: ${testId} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = `等待元素消失超时: ${testId} (${duration}ms)`
      
      this.log('ERROR', errorMessage, {
        selector,
        timeout,
        actualWaitTime: duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw new Error(errorMessage)
    }
  }

  /**
   * 等待特定条件为真 - 使用轮询机制而非page.waitForFunction
   */
  async waitForCondition<T>(
    condition: () => Promise<T> | T,
    description: string,
    options: WaitOptions = {}
  ): Promise<T> {
    const { timeout = 5000, polling = 100, logLevel = 'INFO' } = options
    const startTime = Date.now()

    this.log(logLevel, `等待条件: ${description}`, { timeout, polling })

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition()
        if (result) {
          const duration = Date.now() - startTime
          this.log(logLevel, `条件满足: ${description} (${duration}ms)`)
          return result
        }
      } catch (error) {
        // 条件检查失败，继续轮询
        this.log('DEBUG', `条件检查失败: ${description}`, { 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
      
      await this.page.waitForTimeout(polling)
    }

    const duration = Date.now() - startTime
    const errorMessage = `等待条件超时: ${description} (${duration}ms)`
    
    this.log('ERROR', errorMessage, {
      timeout,
      polling,
      actualWaitTime: duration
    })
    
    throw new Error(errorMessage)
  }

  /**
   * 等待思维导图节点数量变化
   */
  async waitForNodeCountChange(
    expectedCount?: number,
    options: WaitOptions = {}
  ): Promise<number> {
    const { timeout = 5000, logLevel = 'INFO' } = options
    const startTime = Date.now()

    this.log(logLevel, `等待节点数量变化`, { expectedCount, timeout })

    try {
      await this.page.waitForFunction(
        (count) => {
          const nodes = document.querySelectorAll(
            '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
          )
          return count !== undefined ? nodes.length === count : nodes.length > 0
        },
        expectedCount,
        { timeout, polling: 200 }
      )
      
      const actualCount = await this.page.evaluate(() => {
        return document.querySelectorAll(
          '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
        ).length
      })
      
      const duration = Date.now() - startTime
      this.log(logLevel, `节点数量变化完成 (${duration}ms)`, { actualCount })
      
      return actualCount
    } catch (error) {
      const duration = Date.now() - startTime
      const actualCount = await this.page.evaluate(() => {
        return document.querySelectorAll(
          '[data-testid="root"], [data-testid*="root-"], [data-testid*="float-"]'
        ).length
      })
      
      const errorMessage = `等待节点数量变化超时 (${duration}ms)`
      
      this.log('ERROR', errorMessage, {
        expectedCount,
        actualCount,
        timeout,
        actualWaitTime: duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw new Error(`${errorMessage} - 实际节点数: ${actualCount}`)
    }
  }
}