/**
 * Cucumber.js BDD测试配置
 * 行为驱动开发(BDD)测试框架设置
 */

module.exports = {
  default: {
    // 功能文件位置
    features: ['src/test/bdd/features/**/*.feature'],

    // 步骤定义和支持文件位置
    require: ['src/test/bdd/steps/**/*.ts', 'src/test/bdd/support/**/*.ts'],

    // TypeScript支持
    requireModule: ['ts-node/register'],

    // 格式化器
    format: [
      'progress-bar',
      'json:test-results/cucumber-report.json',
      'html:test-results/cucumber-report.html',
    ],

    // 并行执行
    parallel: 2,

    // 重试失败的场景
    retry: 1,

    // 标签过滤
    tags: process.env.CUCUMBER_TAGS || 'not @skip',

    // 超时设置
    timeout: 60000,

    // 世界参数
    worldParameters: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      browser: process.env.BROWSER || 'chromium',
      headless: process.env.HEADLESS !== 'false',
    },

    // 发布选项
    publish: process.env.CUCUMBER_PUBLISH === 'true',

    // 格式选项
    formatOptions: {
      snippetInterface: 'async-await',
    },
  },
}
