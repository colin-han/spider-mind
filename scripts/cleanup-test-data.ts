#!/usr/bin/env tsx

import { Pool } from 'pg'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

// 创建PostgreSQL连接池
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://spider_user:spider_pass@localhost:15432/spider_mind_dev',
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
})

// 测试用户ID常量
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
const AUTOTESTER_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

async function cleanupTestData() {
  const client = await pool.connect()

  try {
    console.log('开始清理测试数据...')

    // 开始事务
    await client.query('BEGIN')

    // 1. 删除测试用户的所有思维导图节点
    console.log('删除思维导图节点...')
    const deleteNodesResult = await client.query(
      `
      DELETE FROM mind_map_nodes 
      WHERE mind_map_id IN (
        SELECT id FROM mind_maps 
        WHERE user_id IN ($1, $2)
      )
    `,
      [TEST_USER_ID, AUTOTESTER_USER_ID]
    )
    console.log(`删除了 ${deleteNodesResult.rowCount} 个节点`)

    // 2. 删除测试用户的所有思维导图
    console.log('删除思维导图...')
    const deleteMapsResult = await client.query(
      `
      DELETE FROM mind_maps 
      WHERE user_id IN ($1, $2)
    `,
      [TEST_USER_ID, AUTOTESTER_USER_ID]
    )
    console.log(`删除了 ${deleteMapsResult.rowCount} 个思维导图`)

    // 3. 删除测试用户记录
    console.log('删除用户记录...')
    const deleteUsersResult = await client.query(
      `
      DELETE FROM users 
      WHERE id IN ($1, $2)
    `,
      [TEST_USER_ID, AUTOTESTER_USER_ID]
    )
    console.log(`删除了 ${deleteUsersResult.rowCount} 个用户记录`)

    // 4. 如果有auth.users表的访问权限，也清理那里的数据（通常Supabase管理）
    // 注意：在本地PostgreSQL中，我们可能没有auth schema
    try {
      const deleteUsersResult = await client.query(
        `
        DELETE FROM auth.users 
        WHERE id IN ($1, $2)
      `,
        [TEST_USER_ID, AUTOTESTER_USER_ID]
      )
      console.log(`删除了 ${deleteUsersResult.rowCount} 个auth用户`)
    } catch (_error) {
      console.log('跳过auth.users清理（schema可能不存在）')
    }

    // 提交事务
    await client.query('COMMIT')
    console.log('测试数据清理完成！')
  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK')
    console.error('清理测试数据失败:', error)
    throw error
  } finally {
    client.release()
  }
}

async function createAutoTesterUser() {
  const client = await pool.connect()

  try {
    console.log('创建autotester测试用户...')

    // 开始事务
    await client.query('BEGIN')

    // 1. 首先尝试创建auth用户（如果auth schema存在）
    try {
      await client.query(
        `
        INSERT INTO auth.users (
          id, email, encrypted_password, email_confirmed_at, 
          created_at, updated_at, raw_app_meta_data, raw_user_meta_data
        ) VALUES (
          $1, $2, crypt('password123', gen_salt('bf')), NOW(),
          NOW(), NOW(), '{"provider":"email"}', '{}'
        )
        ON CONFLICT (id) DO NOTHING
      `,
        [AUTOTESTER_USER_ID, 'autotester@test.com']
      )
      console.log('创建了auth.users记录')
    } catch (_error) {
      console.log('跳过auth.users创建（schema可能不存在或用户已存在）')
      // 如果auth操作失败，回滚并开始新事务
      await client.query('ROLLBACK')
      await client.query('BEGIN')
    }

    // 2. 创建用户记录
    await client.query(
      `
      INSERT INTO users (id, email, full_name, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW()
    `,
      [AUTOTESTER_USER_ID, 'autotester@test.com', 'Auto Tester']
    )
    console.log('创建了users记录')

    // 提交事务
    await client.query('COMMIT')
    console.log('autotester用户创建完成！')
    console.log(`用户ID: ${AUTOTESTER_USER_ID}`)
    console.log('邮箱: autotester@test.com')
    console.log('密码: password123')
  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK')
    console.error('创建autotester用户失败:', error)
    throw error
  } finally {
    client.release()
  }
}

async function cleanupAutoTesterData() {
  const client = await pool.connect()

  try {
    console.log('清理autotester用户的思维导图数据...')

    // 开始事务
    await client.query('BEGIN')

    // 1. 删除autotester的所有思维导图节点
    const deleteNodesResult = await client.query(
      `
      DELETE FROM mind_map_nodes 
      WHERE mind_map_id IN (
        SELECT id FROM mind_maps 
        WHERE user_id = $1
      )
    `,
      [AUTOTESTER_USER_ID]
    )
    console.log(`删除了 ${deleteNodesResult.rowCount} 个节点`)

    // 2. 删除autotester的所有思维导图
    const deleteMapsResult = await client.query(
      `
      DELETE FROM mind_maps 
      WHERE user_id = $1
    `,
      [AUTOTESTER_USER_ID]
    )
    console.log(`删除了 ${deleteMapsResult.rowCount} 个思维导图`)

    // 提交事务
    await client.query('COMMIT')
    console.log('autotester数据清理完成！')
  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK')
    console.error('清理autotester数据失败:', error)
    throw error
  } finally {
    client.release()
  }
}

// 导出函数供其他脚本使用
export { cleanupTestData, createAutoTesterUser, cleanupAutoTesterData, AUTOTESTER_USER_ID }

// 如果直接运行此脚本
if (require.main === module) {
  async function main() {
    try {
      const command = process.argv[2]

      switch (command) {
        case 'cleanup-all':
          await cleanupTestData()
          await createAutoTesterUser()
          break
        case 'cleanup-autotester':
          await cleanupAutoTesterData()
          break
        case 'create-user':
          await createAutoTesterUser()
          break
        default:
          console.log('用法:')
          console.log(
            '  npm run cleanup-test-data cleanup-all    # 清理所有测试数据并创建autotester用户'
          )
          console.log(
            '  npm run cleanup-test-data cleanup-autotester  # 只清理autotester的思维导图'
          )
          console.log('  npm run cleanup-test-data create-user    # 只创建autotester用户')
      }
    } catch (error) {
      console.error('执行失败:', error)
      process.exit(1)
    } finally {
      await pool.end()
    }
  }

  main()
}
