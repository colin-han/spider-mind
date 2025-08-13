# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目架构

Spider Mind 是一个AI辅助思维导图工具，使用Next.js 14 + TypeScript全栈开发。

### 核心技术栈
- **前端**: React 18 + TypeScript + Tailwind CSS + Shadcn/ui + ReactFlow
- **后端**: Next.js 14 App Router + API Routes  
- **数据库**: Supabase (PostgreSQL + pgvector扩展)
- **AI集成**: Claude 3.5 Sonnet + OpenAI Embeddings (text-embedding-3-small)
- **状态管理**: Zustand + ReactFlow内置状态

### 开发命令

项目使用PM2进行统一的服务管理，包括Next.js服务器和PostgreSQL数据库：

```bash
# 🚀 启动完整开发环境 (数据库 + Next.js开发服务器)
node scripts/pm2-manager.js dev

# 🚀 启动生产环境 (数据库 + Next.js生产服务器)  
node scripts/pm2-manager.js prod

# 🛑 停止所有服务
node scripts/pm2-manager.js stop

# 📊 服务状态管理
npm run pm2:status      # 查看所有服务状态
npm run pm2:logs        # 查看服务日志
npm run pm2:monit       # 打开PM2监控面板
npm run pm2:restart     # 重启所有服务
npm run pm2:reload      # 无宕机重载服务

# 🔨 构建和代码检查
npm run build           # 构建生产版本
npm run lint            # ESLint代码检查
npm run format:check    # Prettier格式检查
npm run format:fix      # 自动修复格式问题
```

### 测试命令

```bash
# 🧪 BDD端到端测试 (推荐用于功能验证)
npm run test:bdd        # 运行所有BDD测试
npm run test:bdd:watch  # 监听模式运行BDD测试  
npm run test:bdd:html   # 生成HTML测试报告

# 🔬 单元测试 (Vitest)
npm run test            # 监听模式运行单元测试
npm run test:run        # 单次运行所有单元测试
npm run test:coverage   # 运行测试并生成覆盖率报告
npm run test:ui         # 打开Vitest UI界面
```

**重要说明**：
- 开发和测试时统一使用PM2命令管理服务，确保数据库和应用服务器同步启动
- BDD测试需要完整的开发环境运行，请先执行 `node scripts/pm2-manager.js dev`
- PM2会自动管理日志文件，位于 `./logs/` 目录

### 环境配置

项目依赖以下环境变量（参考 `.env.local.example`）：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI 服务配置
OPENAI_API_KEY=your_openai_api_key  
ANTHROPIC_API_KEY=your_anthropic_api_key

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 核心架构模块

### AI服务架构 (`src/lib/ai.ts`)
- **ClaudeService**: 处理Claude API调用，专门优化思维导图场景
- **OpenAIService**: 处理OpenAI embeddings生成，支持单个和批量处理  
- **AIService**: 综合AI服务，处理思维导图内容向量化和搜索查询

AI请求通过以下API路由处理：
- `/api/ai/mindmap` - 思维导图AI助手功能
- `/api/ai/embeddings` - 向量嵌入生成  
- `/api/search` - 语义搜索功能

### 数据库架构 (`src/lib/database.ts`)
基于Supabase的服务类架构：
- **MindMapService**: 思维导图CRUD操作和向量搜索
- **ProfileService**: 用户配置管理
- **AuthService**: 认证和会话管理

数据库使用pgvector扩展支持向量搜索，主要表结构：
- `profiles` - 用户配置  
- `mind_maps` - 思维导图主表（包含embedding列）
- `mind_map_nodes` - 节点详细表（支持节点级向量搜索）

### 思维导图组件架构 (`src/components/mind-map/`)
基于ReactFlow构建的思维导图编辑器：
- **MindMap**: 主容器组件，管理nodes/edges状态和AI集成
- **MindMapNode**: 自定义节点组件，支持双击编辑和多连接点
- **MindMapToolbar**: 工具栏，包含基本操作和AI助手入口
- **AIAssistant** (`src/components/ai/`): AI助手面板，支持节点扩展、智能建议、结构分析

## 重要开发注意事项

### AI功能集成
- AI服务调用都在服务端进行，前端通过API路由调用
- Claude用于内容生成和分析，OpenAI用于向量嵌入
- AI建议以JSON格式返回，包含type、title、description、content等字段

### 思维导图节点管理
- 节点使用UUID作为统一ID，同时用作ReactFlow节点ID和数据库主键
- 节点数据存储在ReactFlow的`data`属性中，包含`content`和`isEditing`
- 节点编辑通过自定义事件(`nodeContentUpdate`)在组件间通信
- 支持树形结构：`parent_node_id`建立父子关系，`sort_order`控制同级排序，`node_level`表示层级
- 为自动布局算法提供完整的结构化数据支持

### 数据库向量搜索
- 使用pgvector的余弦相似度搜索(`<=>`)
- 默认相似度阈值0.78，可通过参数调整  
- 搜索函数：`search_mind_maps_by_similarity()` 和 `search_nodes_by_similarity()`

### 类型安全
- 严格的TypeScript配置，禁用`any`类型
- Supabase类型定义在`src/lib/supabase.ts`中维护
- AI相关接口定义在`src/lib/ai.ts`顶部

### 构建注意事项
- 使用占位符避免构建时环境变量缺失报错
- API路由需要适当的错误处理防止构建失败
- ReactFlow需要客户端渲染，组件顶部需要`'use client'`

### 数据库迁移
数据库schema位于`supabase/migrations/001_initial_schema.sql`，包含：
- 完整的表结构定义
- pgvector索引优化
- 行级安全策略(RLS)
- 自动更新触发器
- 向量搜索函数

## 开发原则

### 核心原则
1. **需求驱动开发**: 在没有收到明确需求之前，不要猜测、过度设计或引入不必要的功能
2. **MVP优先**: 在MVP0实现之前，不需要记录数据库migration，专注核心功能实现
3. **简洁架构**: 在确保架构清晰明确的前提下，尽可能避免引入过度设计导致代码复杂化

### 实施指导
- 优先实现用户明确要求的功能
- 避免提前优化和过度抽象
- 保持代码简洁可读，架构清晰
- 重构时考虑实际需求而非理论完美
- 所有的BDD测试都应该是E2E的，不要使用Mock
- 如果要在单元测试或BDD测试中使用mock技术，需要获得明确的授权后在使用

### 开发流程指导
- **环境启动**: 始终使用 `node scripts/pm2-manager.js dev` 启动完整开发环境
- **功能开发**: 代码修改后，PM2会自动热重载，无需手动重启
- **功能测试**: 使用 `npm run test:bdd` 进行端到端验证  
- **代码质量**: 提交前运行 `npm run lint` 和 `npm run format:check`
- **服务监控**: 使用 `npm run pm2:monit` 监控服务性能和资源使用
- **日志调试**: 使用 `npm run pm2:logs` 查看实时日志，或查看 `./logs/` 目录下的日志文件
- 不要为了让程序临时运行或测试能够通过，而创建回退机制，从而为同一个事情创建两套实现。
- 禁止调整数据库超时设置
- 修改数据库链接配置无法修复任何问题，禁止通过这种方式规避问题