#!/usr/bin/env node
/**
 * 生成综合测试报告脚本
 * 用于CI/CD流程中聚合各种测试结果
 */

const fs = require('fs').promises
const path = require('path')
const xml2js = require('xml2js')

class TestReportGenerator {
  constructor(reportDir) {
    this.reportDir = reportDir
    this.summary = {
      unit: { passed: 0, failed: 0, skipped: 0, total: 0 },
      integration: { passed: 0, failed: 0, skipped: 0, total: 0 },
      e2e: { passed: 0, failed: 0, skipped: 0, total: 0 },
      security: { passed: 0, failed: 0, skipped: 0, total: 0 },
      performance: { passed: 0, failed: 0, skipped: 0, total: 0 },
      coverage: 0,
      overall_status: 'unknown',
      timestamp: new Date().toISOString(),
      report_url: '',
    }
  }

  async generateReport() {
    console.log('🔄 开始生成综合测试报告...')

    try {
      // 1. 读取所有测试结果文件
      const files = await this.getReportFiles()
      console.log(`📁 找到 ${files.length} 个报告文件`)

      // 2. 解析各种格式的测试结果
      await this.parseTestResults(files)

      // 3. 计算覆盖率
      await this.calculateCoverage()

      // 4. 生成HTML报告
      await this.generateHTMLReport()

      // 5. 生成JSON摘要
      await this.generateJSONSummary()

      // 6. 确定总体状态
      this.determineOverallStatus()

      console.log('✅ 测试报告生成完成')
      console.log(`📊 总体状态: ${this.summary.overall_status}`)
      console.log(`📈 代码覆盖率: ${this.summary.coverage}%`)
    } catch (error) {
      console.error('❌ 生成测试报告时出错:', error)
      process.exit(1)
    }
  }

  async getReportFiles() {
    const files = []

    try {
      const entries = await fs.readdir(this.reportDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(this.reportDir, entry.name)
          const ext = path.extname(entry.name)

          if (ext === '.xml' || ext === '.json') {
            files.push({
              path: filePath,
              name: entry.name,
              type: ext === '.xml' ? 'junit' : 'json',
            })
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ 读取报告目录时出错:', error.message)
    }

    return files
  }

  async parseTestResults(files) {
    for (const file of files) {
      console.log(`📄 解析文件: ${file.name}`)

      try {
        const content = await fs.readFile(file.path, 'utf8')

        if (file.type === 'junit') {
          await this.parseJUnitXML(content, file.name)
        } else if (file.type === 'json') {
          await this.parseJSON(content, file.name)
        }
      } catch (error) {
        console.warn(`⚠️ 解析文件 ${file.name} 时出错:`, error.message)
      }
    }
  }

  async parseJUnitXML(xmlContent, fileName) {
    const parser = new xml2js.Parser()
    const result = await parser.parseStringPromise(xmlContent)

    let testType = 'unit' // 默认类型

    // 根据文件名推断测试类型
    if (fileName.includes('integration')) {
      testType = 'integration'
    } else if (fileName.includes('e2e')) {
      testType = 'e2e'
    } else if (fileName.includes('security')) {
      testType = 'security'
    } else if (fileName.includes('performance')) {
      testType = 'performance'
    }

    // 解析JUnit格式
    if (result.testsuites) {
      const testsuites = Array.isArray(result.testsuites.testsuite)
        ? result.testsuites.testsuite
        : [result.testsuites.testsuite]

      for (const testsuite of testsuites) {
        if (testsuite && testsuite.$) {
          const attrs = testsuite.$
          this.summary[testType].total += parseInt(attrs.tests || 0)
          this.summary[testType].failed +=
            parseInt(attrs.failures || 0) + parseInt(attrs.errors || 0)
          this.summary[testType].skipped += parseInt(attrs.skipped || 0)
          this.summary[testType].passed =
            this.summary[testType].total -
            this.summary[testType].failed -
            this.summary[testType].skipped
        }
      }
    }
  }

  async parseJSON(jsonContent, fileName) {
    try {
      const data = JSON.parse(jsonContent)

      // 根据JSON结构推断测试类型和结果
      if (data.numTotalTests !== undefined) {
        // Jest格式
        let testType = 'unit'
        if (fileName.includes('integration')) testType = 'integration'
        else if (fileName.includes('e2e')) testType = 'e2e'

        this.summary[testType].total += data.numTotalTests || 0
        this.summary[testType].passed += data.numPassedTests || 0
        this.summary[testType].failed += data.numFailedTests || 0
        this.summary[testType].skipped += data.numPendingTests || 0
      } else if (data.stats) {
        // Mocha格式
        const stats = data.stats
        let testType = 'unit'

        this.summary[testType].total += stats.tests || 0
        this.summary[testType].passed += stats.passes || 0
        this.summary[testType].failed += stats.failures || 0
        this.summary[testType].skipped += stats.pending || 0
      } else if (data.coverage) {
        // 覆盖率数据
        this.summary.coverage = Math.round(data.coverage.total || 0)
      }
    } catch (error) {
      console.warn(`⚠️ 解析JSON文件 ${fileName} 时出错:`, error.message)
    }
  }

  async calculateCoverage() {
    try {
      // 尝试从istanbul/nyc覆盖率文件中读取
      const coverageFiles = [
        path.join(this.reportDir, '../coverage/coverage-summary.json'),
        path.join(this.reportDir, 'coverage-summary.json'),
      ]

      for (const coverageFile of coverageFiles) {
        try {
          const content = await fs.readFile(coverageFile, 'utf8')
          const coverageData = JSON.parse(content)

          if (coverageData.total) {
            const total = coverageData.total
            const linesCoverage = total.lines ? total.lines.pct : 0
            const branchesCoverage = total.branches ? total.branches.pct : 0
            const functionsCoverage = total.functions ? total.functions.pct : 0
            const statementsCoverage = total.statements ? total.statements.pct : 0

            // 计算平均覆盖率
            this.summary.coverage = Math.round(
              (linesCoverage + branchesCoverage + functionsCoverage + statementsCoverage) / 4
            )
            break
          }
        } catch (error) {
          // 忽略文件不存在的错误
          continue
        }
      }
    } catch (error) {
      console.warn('⚠️ 计算覆盖率时出错:', error.message)
    }
  }

  async generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spider Mind - 测试报告</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
            margin-left: 10px;
        }
        .status-passed { background-color: #28a745; }
        .status-failed { background-color: #dc3545; }
        .status-warning { background-color: #ffc107; color: #212529; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .metric-title {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .chart-container {
            margin: 40px 0;
            text-align: center;
        }
        .chart-wrapper {
            max-width: 400px;
            margin: 0 auto;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .details-table th,
        .details-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .details-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .pass-rate {
            color: #28a745;
            font-weight: bold;
        }
        .fail-rate {
            color: #dc3545;
            font-weight: bold;
        }
        .skip-rate {
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Spider Mind 测试报告</h1>
            <p>生成时间: ${new Date(this.summary.timestamp).toLocaleString('zh-CN')}</p>
            <span class="status-badge ${this.getStatusClass()}">${this.summary.overall_status.toUpperCase()}</span>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">代码覆盖率</div>
                <div class="metric-value">${this.summary.coverage}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">总测试数</div>
                <div class="metric-value">${this.getTotalTests()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">通过率</div>
                <div class="metric-value">${this.getPassRate()}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">失败数</div>
                <div class="metric-value">${this.getTotalFailed()}</div>
            </div>
        </div>

        <div class="chart-container">
            <h3>测试结果分布</h3>
            <div class="chart-wrapper">
                <canvas id="testResultsChart"></canvas>
            </div>
        </div>

        <h3>详细测试结果</h3>
        <table class="details-table">
            <thead>
                <tr>
                    <th>测试类型</th>
                    <th>总计</th>
                    <th>通过</th>
                    <th>失败</th>
                    <th>跳过</th>
                    <th>通过率</th>
                </tr>
            </thead>
            <tbody>
                ${this.generateTableRows()}
            </tbody>
        </table>
    </div>

    <script>
        // 生成测试结果饼图
        const ctx = document.getElementById('testResultsChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['通过', '失败', '跳过'],
                datasets: [{
                    data: [${this.getTotalPassed()}, ${this.getTotalFailed()}, ${this.getTotalSkipped()}],
                    backgroundColor: ['#28a745', '#dc3545', '#6c757d']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    </script>
</body>
</html>
    `

    await fs.writeFile(path.join(this.reportDir, 'test-report.html'), html)
    console.log('📄 HTML报告已生成: test-report.html')
  }

  async generateJSONSummary() {
    await fs.writeFile(
      path.join(this.reportDir, 'summary.json'),
      JSON.stringify(this.summary, null, 2)
    )
    console.log('📊 JSON摘要已生成: summary.json')
  }

  determineOverallStatus() {
    const totalFailed = this.getTotalFailed()
    const totalTests = this.getTotalTests()

    if (totalTests === 0) {
      this.summary.overall_status = 'no_tests'
    } else if (totalFailed === 0) {
      this.summary.overall_status = 'passed'
    } else if (totalFailed / totalTests > 0.1) {
      // 失败率超过10%
      this.summary.overall_status = 'failed'
    } else {
      this.summary.overall_status = 'warning'
    }
  }

  // 辅助方法
  getTotalTests() {
    return Object.values(this.summary)
      .filter(item => typeof item === 'object' && item.total !== undefined)
      .reduce((sum, item) => sum + item.total, 0)
  }

  getTotalPassed() {
    return Object.values(this.summary)
      .filter(item => typeof item === 'object' && item.passed !== undefined)
      .reduce((sum, item) => sum + item.passed, 0)
  }

  getTotalFailed() {
    return Object.values(this.summary)
      .filter(item => typeof item === 'object' && item.failed !== undefined)
      .reduce((sum, item) => sum + item.failed, 0)
  }

  getTotalSkipped() {
    return Object.values(this.summary)
      .filter(item => typeof item === 'object' && item.skipped !== undefined)
      .reduce((sum, item) => sum + item.skipped, 0)
  }

  getPassRate() {
    const total = this.getTotalTests()
    const passed = this.getTotalPassed()
    return total > 0 ? Math.round((passed / total) * 100) : 0
  }

  getStatusClass() {
    switch (this.summary.overall_status) {
      case 'passed':
        return 'status-passed'
      case 'failed':
        return 'status-failed'
      case 'warning':
        return 'status-warning'
      default:
        return 'status-warning'
    }
  }

  generateTableRows() {
    const testTypes = ['unit', 'integration', 'e2e', 'security', 'performance']
    const typeNames = {
      unit: '单元测试',
      integration: '集成测试',
      e2e: '端到端测试',
      security: '安全测试',
      performance: '性能测试',
    }

    return testTypes
      .map(type => {
        const data = this.summary[type]
        const passRate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0

        return `
        <tr>
          <td>${typeNames[type]}</td>
          <td>${data.total}</td>
          <td class="pass-rate">${data.passed}</td>
          <td class="fail-rate">${data.failed}</td>
          <td class="skip-rate">${data.skipped}</td>
          <td class="${passRate >= 90 ? 'pass-rate' : passRate >= 70 ? 'skip-rate' : 'fail-rate'}">
            ${passRate}%
          </td>
        </tr>
      `
      })
      .join('')
  }
}

// 脚本入口
async function main() {
  const reportDir = process.argv[2] || './test-results'

  if (!reportDir) {
    console.error('❌ 请提供报告目录路径')
    console.error('用法: node generate-test-report.js <report-directory>')
    process.exit(1)
  }

  const generator = new TestReportGenerator(reportDir)
  await generator.generateReport()
}

// 运行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
}

module.exports = TestReportGenerator
