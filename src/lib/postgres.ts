import { Pool } from 'pg'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

// 创建PostgreSQL连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://spider_user:spider_pass@localhost:15432/spider_mind_dev',
  max: 10, // 减少最大连接数，避免耗尽连接
  idleTimeoutMillis: 10000, // 减少空闲超时时间
  connectionTimeoutMillis: 3000, // 连接超时时间
})

// 监听连接池错误事件
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})

// 数据库连接测试
export async function testConnection() {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    return { success: true, time: result.rows[0].now }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 执行查询的辅助函数
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const queryId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  const startTime = Date.now()
  
  console.log(`[${queryId}] Query started: ${text} | Params: ${JSON.stringify(params)}`)
  console.log(`[${queryId}] Pool stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`)
  
  let client
  try {
    const connectStart = Date.now()
    client = await pool.connect()
    const connectTime = Date.now() - connectStart
    console.log(`[${queryId}] Pool connection acquired in ${connectTime}ms`)
    
    if (connectTime > 500) {
      console.warn(`[${queryId}] WARNING: Connection acquisition took ${connectTime}ms - potential pool exhaustion`)
    }
    
    
    const queryStart = Date.now()
    const result = await client.query(text, params)
    const queryTime = Date.now() - queryStart
    
    console.log(`[${queryId}] Query executed in ${queryTime}ms, returned ${result.rows.length} rows`)
    
    if (queryTime > 1000) {
      console.warn(`[${queryId}] WARNING: Query took ${queryTime}ms - potential performance issue`)
    }
    
    return result.rows
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[${queryId}] Query failed after ${totalTime}ms:`, error)
    console.error(`[${queryId}] Pool stats on error - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`)
    throw error
  } finally {
    if (client) {
      client.release()
      const totalTime = Date.now() - startTime
      console.log(`[${queryId}] Connection released, total operation time: ${totalTime}ms`)
    }
  }
}

// 执行单行查询
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows.length > 0 ? rows[0] : null
}

// 执行事务
export async function transaction<T>(callback: (query: typeof query) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const txQuery = async <U = any>(text: string, params?: any[]): Promise<U[]> => {
      const result = await client.query(text, params)
      return result.rows
    }
    const result = await callback(txQuery)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export { pool }