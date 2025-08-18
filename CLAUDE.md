# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 规范 **非常重要**
- 禁止通过延长timeout时间来掩盖代码问题（包括在测试代码中也禁止使用timeout来掩盖代码问题）
- 禁止在业务代码中通过模拟dom事件来驱动业务逻辑 （此时应该抽取公共函数）
- 在测试代码中不要使用冗余的查找逻辑，尽量使用test-id查找节点。如果目标节点确实没有test-id的，可以需改业务代码添加test-id。

# 技术栈
- **前端**: Next.js 15 + React 19 + TypeScript
- **UI**: Radix UI + TailwindCSS 4
- **思维导图**: ReactFlow (@xyflow/react)
- **数据库**: PostgreSQL + pgvector (向量搜索)
- **状态管理**: Zustand
- **包管理器**: yarn (重要：必须使用yarn而不是npm)

# 开发命令
```bash
# 开发环境
yarn pm2:dev                    # 启动开发服务器

# 数据库
yarn db:up                  # 启动Docker数据库
yarn db:down                # 停止数据库
yarn db:migrate             # 运行数据库迁移
yarn db:test                # 测试数据库连接

# 测试
yarn test:bdd               # 运行BDD测试 (Cucumber)
yarn test:bdd:watch         # 监视模式运行BDD测试
yarn test:all               # 运行所有测试
yarn cleanup-test-data      # 清理测试数据

# 代码质量
yarn lint                   # Next.js lint
yarn lint:check             # ESLint检查
yarn lint:fix               # ESLint修复
yarn format:check           # Prettier格式检查
yarn format:fix             # Prettier格式修复
yarn type-check             # TypeScript类型检查

# 构建
yarn build                  # 构建生产版本

# PM2进程管理
yarn pm2:dev               # PM2开发模式
yarn pm2:prod              # PM2生产模式
yarn pm2:stop              # 停止PM2进程
yarn pm2:logs              # 查看PM2日志
```

# 核心架构

## 思维导图组件
- **核心组件**: `src/components/mind-map/mind-map.tsx` - 基于ReactFlow的主要思维导图编辑器
- **数据结构**: 支持无限层级的树形结构，每个节点有唯一的test-id用于测试稳定性
- **布局算法**: 自动计算节点位置，支持拖拽和缩放

## 数据库设计
- **主表**: `mind_maps` - 存储思维导图基本信息和向量嵌入
- **节点表**: `mind_map_nodes` - 存储细粒度节点内容，支持父子关系和向量搜索
- **向量搜索**: 使用pgvector扩展，支持语义搜索和相似度匹配
- **RLS策略**: 完整的行级安全控制，确保数据访问权限

## API路由
- `/api/mindmaps/[id]/full` - 获取完整思维导图数据
- 遵循Next.js 15的App Router模式

# TypeScript规范
- **严格模式**: `noImplicitAny: true`，禁止使用`any`类型
- **类型声明**: 尽量使用明确的类型声明，避免`unknown`
- **路径别名**: 使用`@/*`指向`./src/*`

# 测试策略

## BDD测试 (Cucumber)
- **配置**: `cucumber.config.js` + `tsconfig.bdd.json`
- **特性文件**: `bdd/features/**/*.feature`
- **步骤定义**: `bdd/steps/**/*.ts`
- **关键特性**: Test-ID稳定性验证，确保重构不破坏测试

## Test-ID生成规律
项目使用独特的test-id生成机制确保测试稳定性：
- Root节点: `root`
- Float节点: `float-{index}`（独立排序）
- Child节点: `{parent-test-id}-{index}`（按自己在父节点的子节点集合中的顺序）
- 该test-id仅表示节点的存在位置，不和节点对应，删除或重新排列节点后test-id会变化。

## 测试环境设置
运行测试前需要：
1. 启动数据库: `yarn db:up`
2. 运行预测试设置: `yarn pre-test-setup`
3. 清理测试数据: `yarn cleanup-test-data`

# 开发规范
- **总是用中文和用户交互**
- **提交前检查**: 运行`yarn lint`、`yarn type-check`和相关测试
- **代码生成**: 生成的总结性markdown放在`.claude-summary`目录
- **Cucumber关键字**: 使用英文 `Given`、`When`、`Then`
- **提交信息**: 尽量精简内容

# 重要文件路径
- 思维导图核心: `src/components/mind-map/mind-map.tsx`
- 数据库层: `src/lib/database-postgres.ts`
- 认证上下文: `src/contexts/auth-context.tsx`
- 数据库迁移: `database/migrations/001_initial_schema.sql`
- BDD步骤定义: `bdd/steps/mindmap-steps.ts`
- 测试世界: `bdd/support/world.ts`