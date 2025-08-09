#!/usr/bin/env node

/**
 * 检查数据库中测试数据残留的脚本
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

async function checkTestData() {
  console.log('🔍 检查数据库中的测试数据残留...\n')

  try {
    await client.connect()
    console.log('✅ 数据库连接成功\n')

    // 检查 mind_maps 表
    console.log('📊 检查 mind_maps 表:')
    const mindMapsResult = await client.query(`
      SELECT * FROM mind_maps 
      ORDER BY updated_at DESC 
      LIMIT 20
    `)
    const mindMaps = mindMapsResult.rows

    // 获取总记录数
    const mindMapsCountResult = await client.query('SELECT COUNT(*) FROM mind_maps')
    const mindMapsCount = parseInt(mindMapsCountResult.rows[0].count)

    console.log(`   总记录数: ${mindMapsCount}`)

    if (mindMaps.length > 0) {
      console.log('\n   最新的几条记录:')
      mindMaps.slice(0, 5).forEach((map, index) => {
        const createdAt = new Date(map.created_at).toLocaleString('zh-CN')
        const updatedAt = new Date(map.updated_at).toLocaleString('zh-CN')
        console.log(`   ${index + 1}. ID: ${map.id}`)
        console.log(`      标题: ${map.title}`)
        console.log(`      用户ID: ${map.user_id}`)
        console.log(`      创建时间: ${createdAt}`)
        console.log(`      更新时间: ${updatedAt}`)
        console.log(`      是否公开: ${map.is_public}`)
        console.log()
      })

      // 检查是否有测试相关的数据
      const testMaps = mindMaps.filter(
        map =>
          map.title?.includes('Test') ||
          map.title?.includes('测试') ||
          map.title?.includes('BDD') ||
          map.title?.includes('cucumber') ||
          map.title?.includes('E2E')
      )

      if (testMaps.length > 0) {
        console.log(`⚠️  发现 ${testMaps.length} 条疑似测试数据:`)
        testMaps.forEach((map, index) => {
          console.log(`   ${index + 1}. "${map.title}" (${map.id})`)
        })
      } else {
        console.log('✅ 未发现明显的测试数据')
      }
    } else {
      console.log('   表为空')
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // 检查 mind_map_nodes 表
    console.log('📊 检查 mind_map_nodes 表:')
    const nodesResult = await client.query(`
      SELECT * FROM mind_map_nodes 
      ORDER BY created_at DESC 
      LIMIT 20
    `)
    const nodes = nodesResult.rows

    // 获取总记录数
    const nodesCountResult = await client.query('SELECT COUNT(*) FROM mind_map_nodes')
    const nodesCount = parseInt(nodesCountResult.rows[0].count)

    console.log(`   总记录数: ${nodesCount}`)

    if (nodes.length > 0) {
      console.log('\n   最新的几条记录:')
      nodes.slice(0, 5).forEach((node, index) => {
        const createdAt = new Date(node.created_at).toLocaleString('zh-CN')
        const updatedAt = new Date(node.updated_at).toLocaleString('zh-CN')
        console.log(`   ${index + 1}. ID: ${node.id}`)
        console.log(`      思维导图ID: ${node.mind_map_id}`)
        console.log(
          `      内容: ${node.content?.substring(0, 50)}${node.content?.length > 50 ? '...' : ''}`
        )
        console.log(`      父节点ID: ${node.parent_node_id || 'null'}`)
        console.log(`      层级: ${node.node_level}`)
        console.log(`      排序: ${node.sort_order}`)
        console.log(`      类型: ${node.node_type}`)
        console.log(`      创建时间: ${createdAt}`)
        console.log(`      更新时间: ${updatedAt}`)
        console.log()
      })

      // 检查是否有测试相关的节点内容
      const testNodes = nodes.filter(
        node =>
          node.content?.includes('Test') ||
          node.content?.includes('测试') ||
          node.content?.includes('BDD') ||
          node.content?.includes('cucumber') ||
          node.content?.includes('E2E')
      )

      if (testNodes.length > 0) {
        console.log(`⚠️  发现 ${testNodes.length} 条疑似测试节点:`)
        testNodes.forEach((node, index) => {
          console.log(`   ${index + 1}. "${node.content}" (${node.id})`)
        })
      } else {
        console.log('✅ 未发现明显的测试节点')
      }
    } else {
      console.log('   表为空')
    }

    // 获取数据库统计信息
    console.log('\n' + '='.repeat(60) + '\n')
    console.log('📈 数据库统计信息:')
    console.log(`   mind_maps 表总记录数: ${mindMapsCount}`)
    console.log(`   mind_map_nodes 表总记录数: ${nodesCount}`)

    // 检查今天创建的数据
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const todayMapsResult = await client.query('SELECT * FROM mind_maps WHERE created_at >= $1', [
      todayISO,
    ])
    const todayMaps = todayMapsResult.rows

    const todayNodesResult = await client.query(
      'SELECT * FROM mind_map_nodes WHERE created_at >= $1',
      [todayISO]
    )
    const todayNodes = todayNodesResult.rows

    console.log(`\n📅 今天创建的数据:`)
    console.log(`   思维导图: ${todayMaps.length} 条`)
    console.log(`   节点: ${todayNodes.length} 条`)

    if (todayMaps.length > 0) {
      console.log('\n   今天的思维导图:')
      todayMaps.forEach((map, index) => {
        console.log(
          `   ${index + 1}. "${map.title}" (${map.id}) - ${new Date(map.created_at).toLocaleTimeString('zh-CN')}`
        )
      })
    }
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message)
    console.error('详细错误信息:', error)
  } finally {
    await client.end()
  }
}

// 运行检查
checkTestData()
