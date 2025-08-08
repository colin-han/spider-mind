#!/usr/bin/env node

const { Pool } = require('pg');
const path = require('path');

// 从环境变量读取数据库配置
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('🔗 测试数据库连接...');
    
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 测试查询用户表
    const userResult = await client.query('SELECT * FROM users LIMIT 1');
    console.log('📊 用户表查询结果:', userResult.rows[0]);
    
    // 测试查询思维导图表
    const mindMapResult = await client.query('SELECT * FROM mind_maps LIMIT 1');
    console.log('📊 思维导图表查询结果:', mindMapResult.rows[0]);
    
    // 测试插入新的思维导图
    const insertResult = await client.query(`
      INSERT INTO mind_maps (title, user_id, content) 
      VALUES ($1, $2, $3) 
      RETURNING id, title, created_at
    `, [
      '数据库连接测试导图', 
      '11111111-1111-1111-1111-111111111111',
      JSON.stringify({
        nodes: [
          { id: 'node1', data: { content: '根节点' }, position: { x: 0, y: 0 } }
        ],
        edges: []
      })
    ]);
    
    console.log('✅ 成功插入测试思维导图:', insertResult.rows[0]);
    
    // 查询刚插入的数据
    const selectResult = await client.query('SELECT COUNT(*) as total FROM mind_maps');
    console.log('📈 思维导图总数:', selectResult.rows[0].total);
    
    client.release();
    console.log('🎉 数据库功能测试完成!');
    
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  testConnection();
}

module.exports = { testConnection };