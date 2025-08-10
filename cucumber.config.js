/**
 * Cucumber.js BDD测试配置
 * 行为驱动开发(BDD)测试框架设置
 */

module.exports = {
  default: {
    // 功能文件位置
    features: ['bdd/features/**/*.feature'],

    // TypeScript支持
    requireModule: ['ts-node/register'],

    // 步骤定义和支持文件位置
    require: ['bdd/steps/**/*.ts', 'bdd/support/**/*.ts'],

    // 格式化器
    format: ['progress'],

    // 重试失败的场景
    retry: 1,

    // 超时设置
    timeout: 60000,

    // 世界参数
    worldParameters: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    },

    // 格式选项
    formatOptions: {
      snippetInterface: 'async-await',
    },
  },
}
