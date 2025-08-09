#!/usr/bin/env node

/**
 * 清理数据库中测试数据的脚本
 */

const { Client } = require('pg')
const { config } = require('dotenv')

// 加载环境变量
config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ 缺少DATABASE_URL环境变量')
  console.error('请确保 .env.local 文件中包含 DATABASE_URL')
  process.exit(1)
}

const client = new Client({
  connectionString: databaseUrl,
})

async function cleanTestData() {
  console.log('🧹 开始清理数据库中的测试数据...\n')

  try {
    await client.connect()
    console.log('✅ 数据库连接成功\n')

    // 首先查询要删除的数据
    console.log('📋 查询要删除的数据:')

    const mindMapsResult = await client.query(`
      SELECT id, title, created_at FROM mind_maps 
      WHERE title LIKE '%新思维导图%'
      OR title LIKE '%Test%' 
      OR title LIKE '%测试%'
      OR title LIKE '%BDD%'
      OR title LIKE '%cucumber%'
      OR title LIKE '%E2E%'
      ORDER BY created_at DESC
    `)

    const testMaps = mindMapsResult.rows

    if (testMaps.length === 0) {
      console.log('✅ 未发现需要清理的测试数据')
      return
    }

    console.log(`发现 ${testMaps.length} 条疑似测试数据:`)
    testMaps.forEach((map, index) => {
      const createdAt = new Date(map.created_at).toLocaleString('zh-CN')
      console.log(`   ${index + 1}. "${map.title}" (${map.id}) - ${createdAt}`)
    })

    // 统计关联的节点数量
    const nodeCountResult = await client.query(
      `
      SELECT COUNT(*) FROM mind_map_nodes 
      WHERE mind_map_id IN (${testMaps.map((_, i) => `$${i + 1}`).join(', ')})
    `,
      testMaps.map(map => map.id)
    )

    const nodeCount = parseInt(nodeCountResult.rows[0].count)
    console.log(`\n关联节点数量: ${nodeCount} 条`)

    // 确认删除
    console.log('\n⚠️  即将删除以上数据，这个操作不可逆！')
    console.log('如果您确定要继续，请在5秒内按 Ctrl+C 取消，否则将自动执行删除操作...')

    // 等待5秒
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('\n🗑️  开始删除数据...')

    // 开始事务
    await client.query('BEGIN')

    try {
      // 先删除相关节点
      if (nodeCount > 0) {
        const deleteNodesResult = await client.query(
          `
          DELETE FROM mind_map_nodes 
          WHERE mind_map_id IN (${testMaps.map((_, i) => `$${i + 1}`).join(', ')})
        `,
          testMaps.map(map => map.id)
        )

        console.log(`✅ 删除了 ${deleteNodesResult.rowCount} 个节点`)
      }

      // 再删除思维导图
      const deleteMapsResult = await client.query(
        `
        DELETE FROM mind_maps 
        WHERE id IN (${testMaps.map((_, i) => `$${i + 1}`).join(', ')})
      `,
        testMaps.map(map => map.id)
      )

      console.log(`✅ 删除了 ${deleteMapsResult.rowCount} 个思维导图`)

      // 提交事务
      await client.query('COMMIT')
      console.log('✅ 数据删除成功！')
    } catch (error) {
      // 回滚事务
      await client.query('ROLLBACK')
      console.error('❌ 删除过程中发生错误，已回滚所有更改:', error.message)
      throw error
    }

    // 验证删除结果
    const remainingMapsResult = await client.query('SELECT COUNT(*) FROM mind_maps')
    const remainingNodesResult = await client.query('SELECT COUNT(*) FROM mind_map_nodes')

    console.log('\n📊 删除后的数据库状态:')
    console.log(`   mind_maps 表剩余记录数: ${remainingMapsResult.rows[0].count}`)
    console.log(`   mind_map_nodes 表剩余记录数: ${remainingNodesResult.rows[0].count}`)
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error.message)
  } finally {
    await client.end()
  }
}

// 运行清理
cleanTestData()
