/**
 * Cucumber.js BDD测试配置
 * 行为驱动开发(BDD)测试框架设置
 */

module.exports = {
  default: {
    // 功能文件位置
    features: ['**/*.feature'],

    // TypeScript支持
    requireModule: ['ts-node/register'],

    // 步骤定义和支持文件位置
    require: ['bdd/steps/**/*.ts', 'bdd/support/**/*.ts'],

    // 格式化器 - 添加更详细的报告
    format: [
      'progress-bar',
      'html:test-results/cucumber-report.html',
      'json:test-results/cucumber-report.json',
    ],

    // 启用并行执行 - 降低并发数以提高稳定性
    parallel: 2,

    // 重试失败的场景
    retry: 2,

    // 优化超时设置 - 从60秒降至30秒
    timeout: 60000,

    // 世界参数
    worldParameters: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    },

    // 格式选项
    formatOptions: {
      snippetInterface: 'async-await',
    },

    // 发布模式 - 启用详细输出
    publishQuiet: true,
  },
}
