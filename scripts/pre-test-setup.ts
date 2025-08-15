#!/usr/bin/env tsx

import { cleanupAutoTesterData, createAutoTesterUser } from './cleanup-test-data'

/**
 * 测试前的设置脚本
 * 1. 确保autotester用户存在
 * 2. 清理autotester用户的所有思维导图数据
 */
async function preTestSetup() {
  try {
    console.log('🧪 开始测试前设置...')

    // 1. 创建或更新autotester用户
    console.log('1. 确保autotester用户存在...')
    await createAutoTesterUser()

    // 2. 清理autotester的思维导图数据
    console.log('2. 清理autotester用户的思维导图数据...')
    await cleanupAutoTesterData()

    console.log('✅ 测试前设置完成！')
  } catch (error) {
    console.error('❌ 测试前设置失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  preTestSetup()
}

export { preTestSetup }
