module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 自定义规则
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复bug
        'docs', // 文档更新
        'style', // 格式化、缺少分号等，不改变代码逻辑
        'refactor', // 重构代码（既不修复bug也不添加功能）
        'perf', // 性能优化
        'test', // 添加测试或更正现有测试
        'chore', // 构建过程或辅助工具的变动
        'ci', // CI相关变更
        'build', // 构建系统或外部依赖项的更改
        'revert', // 回滚之前的提交
      ],
    ],
    'subject-max-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
  },
}
