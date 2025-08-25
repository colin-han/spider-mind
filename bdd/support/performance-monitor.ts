/**
 * 性能监控工具
 * 用于追踪和分析测试执行性能
 */

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

interface ScenarioMetrics {
  scenarioName: string
  totalDuration: number
  steps: PerformanceMetric[]
  slowestStep?: PerformanceMetric
  networkRequests?: number
  errors?: string[]
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private scenarioMetrics: ScenarioMetrics[] = []
  private currentScenario: string | undefined

  /**
   * 开始计时一个操作
   */
  startTimer(operationName: string, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name: operationName,
      startTime: Date.now(),
      metadata
    }
    
    this.metrics.set(operationName, metric)
    console.log(`[PERF] ⏱️ Started: ${operationName}`)
  }

  /**
   * 结束计时一个操作
   */
  endTimer(operationName: string, metadata?: Record<string, unknown>): number {
    const metric = this.metrics.get(operationName)
    if (!metric) {
      console.warn(`[PERF] ⚠️ Timer not found: ${operationName}`)
      return 0
    }

    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.metadata = { ...metric.metadata, ...metadata }

    // 标记慢速操作
    const isSlowOperation = metric.duration > 3000
    const logLevel = isSlowOperation ? '🐌' : '✅'
    
    console.log(
      `[PERF] ${logLevel} Completed: ${operationName} (${metric.duration}ms)${
        isSlowOperation ? ' - SLOW OPERATION!' : ''
      }`
    )

    if (isSlowOperation) {
      console.warn(`[PERF] 🚨 Operation "${operationName}" took ${metric.duration}ms (>3s threshold)`)
    }

    return metric.duration
  }

  /**
   * 开始场景性能监控
   */
  startScenario(scenarioName: string): void {
    this.currentScenario = scenarioName
    this.startTimer(`scenario:${scenarioName}`, { type: 'scenario' })
    console.log(`[PERF] 🎬 Starting scenario: ${scenarioName}`)
  }

  /**
   * 结束场景性能监控
   */
  endScenario(): ScenarioMetrics | undefined {
    if (!this.currentScenario) return undefined

    const scenarioTimerName = `scenario:${this.currentScenario}`
    const totalDuration = this.endTimer(scenarioTimerName)

    // 收集场景中的所有步骤
    const steps = Array.from(this.metrics.values()).filter(
      metric => metric.name !== scenarioTimerName && 
               metric.duration !== undefined &&
               metric.startTime >= (this.metrics.get(scenarioTimerName)?.startTime || 0)
    )

    // 找到最慢的步骤
    const slowestStep = steps.reduce((slowest, current) => {
      return (current.duration || 0) > (slowest?.duration || 0) ? current : slowest
    }, undefined as PerformanceMetric | undefined)

    const scenarioMetrics: ScenarioMetrics = {
      scenarioName: this.currentScenario,
      totalDuration,
      steps,
      slowestStep,
      networkRequests: this.countNetworkRequests(steps),
      errors: this.collectErrors(steps)
    }

    this.scenarioMetrics.push(scenarioMetrics)
    this.logScenarioSummary(scenarioMetrics)

    // 清理当前场景的指标
    this.cleanupScenarioMetrics(scenarioTimerName)
    this.currentScenario = undefined

    return scenarioMetrics
  }

  /**
   * 记录自定义指标
   */
  recordMetric(name: string, value: number, unit: string = 'ms', metadata?: Record<string, unknown>): void {
    console.log(`[PERF] 📊 Metric: ${name} = ${value}${unit}`)
    
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: value,
      metadata: { unit, type: 'custom', ...metadata }
    }
    
    this.metrics.set(`custom:${name}:${Date.now()}`, metric)
  }

  /**
   * 获取所有场景的性能摘要
   */
  getPerformanceSummary(): {
    totalScenarios: number
    averageDuration: number
    totalDuration: number
    slowestScenario?: ScenarioMetrics
    fastestScenario?: ScenarioMetrics
    performanceIssues: string[]
  } {
    if (this.scenarioMetrics.length === 0) {
      return {
        totalScenarios: 0,
        averageDuration: 0,
        totalDuration: 0,
        performanceIssues: ['No scenarios measured']
      }
    }

    const totalDuration = this.scenarioMetrics.reduce((sum, s) => sum + s.totalDuration, 0)
    const averageDuration = totalDuration / this.scenarioMetrics.length

    const slowestScenario = this.scenarioMetrics.reduce((slowest, current) => 
      current.totalDuration > slowest.totalDuration ? current : slowest
    )

    const fastestScenario = this.scenarioMetrics.reduce((fastest, current) => 
      current.totalDuration < fastest.totalDuration ? current : fastest
    )

    const performanceIssues = this.identifyPerformanceIssues()

    return {
      totalScenarios: this.scenarioMetrics.length,
      averageDuration,
      totalDuration,
      slowestScenario,
      fastestScenario,
      performanceIssues
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const summary = this.getPerformanceSummary()
    
    const report = [
      '=' .repeat(60),
      '🚀 E2E Performance Report',
      '=' .repeat(60),
      `📈 总场景数: ${summary.totalScenarios}`,
      `⏱️ 总耗时: ${(summary.totalDuration / 1000).toFixed(2)}s`,
      `📊 平均耗时: ${(summary.averageDuration / 1000).toFixed(2)}s/scenario`,
      `🏃‍♂️ 预估改进后时间: ${((summary.totalDuration * 0.5) / 1000).toFixed(2)}s (50% improvement target)`,
      '',
      '🐌 最慢场景:',
      `  ${summary.slowestScenario?.scenarioName}: ${(summary.slowestScenario?.totalDuration || 0) / 1000}s`,
      `  └─ 最慢步骤: ${summary.slowestScenario?.slowestStep?.name} (${summary.slowestScenario?.slowestStep?.duration}ms)`,
      '',
      '⚡ 最快场景:',
      `  ${summary.fastestScenario?.scenarioName}: ${(summary.fastestScenario?.totalDuration || 0) / 1000}s`,
      '',
      '⚠️ 性能问题:',
      ...summary.performanceIssues.map(issue => `  • ${issue}`),
      '=' .repeat(60)
    ]

    return report.join('\n')
  }

  private countNetworkRequests(steps: PerformanceMetric[]): number {
    return steps.filter(step => step.metadata?.type === 'network').length
  }

  private collectErrors(steps: PerformanceMetric[]): string[] {
    return steps
      .filter(step => step.metadata?.error)
      .map(step => `${step.name}: ${step.metadata?.error}`)
  }

  private logScenarioSummary(metrics: ScenarioMetrics): void {
    console.log(`\n[PERF] 🎯 Scenario Summary: ${metrics.scenarioName}`)
    console.log(`[PERF]   📏 Total: ${metrics.totalDuration}ms`)
    console.log(`[PERF]   📊 Steps: ${metrics.steps.length}`)
    if (metrics.slowestStep) {
      console.log(`[PERF]   🐌 Slowest: ${metrics.slowestStep.name} (${metrics.slowestStep.duration}ms)`)
    }
    if (metrics.errors && metrics.errors.length > 0) {
      console.log(`[PERF]   ❌ Errors: ${metrics.errors.length}`)
    }
    console.log('')
  }

  private cleanupScenarioMetrics(scenarioTimerName: string): void {
    // 保留场景级别的指标，清理临时指标
    const keysToDelete = Array.from(this.metrics.keys()).filter(
      key => key !== scenarioTimerName && !key.startsWith('custom:')
    )
    
    keysToDelete.forEach(key => this.metrics.delete(key))
  }

  private identifyPerformanceIssues(): string[] {
    const issues: string[] = []
    
    // 检查慢速场景
    const slowScenarios = this.scenarioMetrics.filter(s => s.totalDuration > 10000)
    if (slowScenarios.length > 0) {
      issues.push(`${slowScenarios.length} scenarios taking >10s`)
    }

    // 检查平均时间
    const avgDuration = this.scenarioMetrics.reduce((sum, s) => sum + s.totalDuration, 0) / this.scenarioMetrics.length
    if (avgDuration > 5000) {
      issues.push(`Average scenario duration is ${(avgDuration / 1000).toFixed(1)}s (target: <5s)`)
    }

    // 检查变异性
    const durations = this.scenarioMetrics.map(s => s.totalDuration)
    const min = Math.min(...durations)
    const max = Math.max(...durations)
    const variance = max - min
    
    if (variance > 15000) {
      issues.push(`High duration variance: ${(variance / 1000).toFixed(1)}s between fastest and slowest`)
    }

    return issues.length > 0 ? issues : ['No significant performance issues detected']
  }
}

// 全局实例
export const performanceMonitor = new PerformanceMonitor()