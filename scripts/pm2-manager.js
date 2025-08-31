#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

// 确保日志目录存在
const logsDir = path.join(__dirname, '..', 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

/**
 * 执行shell命令并返回Promise
 */
function execAsync(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { ...options, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
      }
    })
  })
}

/**
 * 检查Docker是否运行
 */
async function checkDocker() {
  try {
    await execAsync('docker info')
    return true
  } catch (error) {
    console.error('❌ Docker未运行，请先启动Docker')
    return false
  }
}

/**
 * 检查PM2是否安装
 */
async function checkPM2() {
  try {
    await execAsync('pm2 -v')
    return true
  } catch (error) {
    console.error('❌ PM2未安装，请运行: npm install -g pm2')
    return false
  }
}

/**
 * 检查数据库连接状态
 */
async function checkDatabase() {
  try {
    const { stdout } = await execAsync('docker compose ps postgres --format json')
    if (!stdout) return false

    const containers = JSON.parse(`[${stdout.replace(/}\s*{/g, '},{')}]`)
    const dbContainer = containers.find(c => c.Service === 'postgres')

    if (!dbContainer || dbContainer.State !== 'running') {
      return false
    }

    // 检查健康状态
    if (dbContainer.Health && dbContainer.Health !== 'healthy') {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * 启动数据库服务
 */
async function startDatabase() {
  console.log('🚀 启动PostgreSQL数据库...')
  try {
    await execAsync('docker compose up -d postgres adminer')

    // 等待数据库启动完成
    console.log('⏳ 等待数据库启动完成...')
    let retries = 30
    while (retries > 0) {
      if (await checkDatabase()) {
        console.log('✅ 数据库启动成功')

        // 运行数据库迁移
        console.log('🔄 执行数据库迁移...')
        try {
          await execAsync('npm run db:migrate')
          console.log('✅ 数据库迁移完成')
        } catch (error) {
          console.warn('⚠️  数据库迁移失败，可能需要手动执行:', error.message)
        }

        return true
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      retries--
    }

    console.error('❌ 数据库启动超时')
    return false
  } catch (error) {
    console.error('❌ 数据库启动失败:', error.message)
    return false
  }
}

/**
 * 启动开发环境
 */
async function startDev() {
  console.log('🚀 启动开发环境...')

  // 检查依赖
  if (!(await checkDocker())) return
  if (!(await checkPM2())) return

  // 启动数据库
  if (!(await startDatabase())) {
    console.error('❌ 数据库启动失败，无法继续')
    return
  }

  try {
    // 停止可能存在的进程
    await execAsync('pm2 stop spider-mind-dev').catch(() => {})
    await execAsync('pm2 delete spider-mind-dev').catch(() => {})

    // 启动开发服务器
    await execAsync('pm2 start ecosystem.config.js --only spider-mind-dev')
    console.log('✅ 开发环境启动成功')
    console.log('📊 查看状态: npm run pm2:status')
    console.log('📝 查看日志: npm run pm2:logs')
    console.log('🌐 应用地址: http://localhost:3000')
  } catch (error) {
    console.error('❌ 开发环境启动失败:', error.message)
  }
}

/**
 * 停止所有服务
 */
async function stopAll() {
  console.log('🛑 停止所有服务...')

  try {
    // 停止PM2进程
    await execAsync('pm2 stop all').catch(() => {})
    await execAsync('pm2 delete all').catch(() => {})

    // 停止Docker容器
    await execAsync('docker compose down').catch(() => {})

    console.log('✅ 所有服务已停止')
  } catch (error) {
    console.error('❌ 停止服务时出错:', error.message)
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
Spider Mind PM2 服务管理器

使用方法:
  node scripts/pm2-manager.js <command>

命令:
  dev     启动开发环境 (包含数据库 + Next.js开发服务器)
  stop    停止所有服务

其他PM2命令:
  npm run pm2:status   查看服务状态
  npm run pm2:logs     查看日志
  npm run pm2:monit    监控面板
  npm run pm2:restart  重启服务
  npm run pm2:reload   无宕机重载服务
`)
}

// 主函数
async function main() {
  const command = process.argv[2]

  switch (command) {
    case 'dev':
      await startDev()
      break
    case 'prod':
      await startProd()
      break
    case 'stop':
      await stopAll()
      break
    default:
      showHelp()
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error.message)
    process.exit(1)
  })
}

module.exports = {
  startDev,
  stopAll,
  checkDocker,
  checkPM2,
}
