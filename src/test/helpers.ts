import { vi } from 'vitest'
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// 测试数据工厂
export class TestDataFactory {
  static createMindMap(overrides: Partial<any> = {}) {
    return {
      id: 'test-map-1',
      title: '测试思维导图',
      description: '这是一个测试用的思维导图',
      content: JSON.stringify({
        nodes: [
          {
            id: 'node-1',
            type: 'mindMapNode',
            position: { x: 100, y: 100 },
            data: { content: '中心主题' },
          },
        ],
        edges: [],
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'test-user-1',
      is_public: false,
      ...overrides,
    }
  }

  static createNode(overrides: Partial<any> = {}) {
    return {
      id: `node-${Date.now()}`,
      type: 'mindMapNode',
      position: { x: 100, y: 100 },
      data: {
        content: '测试节点',
        isEditing: false,
      },
      ...overrides,
    }
  }

  static createEdge(sourceId: string, targetId: string, overrides: Partial<any> = {}) {
    return {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      ...overrides,
    }
  }

  static createUser(overrides: Partial<any> = {}) {
    return {
      id: 'test-user-1',
      email: 'test@example.com',
      full_name: '测试用户',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    }
  }
}

// Mock Supabase服务
export class MockSupabaseService {
  static mockMindMapService() {
    return {
      getMindMaps: vi.fn(() => Promise.resolve([TestDataFactory.createMindMap()])),
      getMindMapById: vi.fn((id: string) => Promise.resolve(TestDataFactory.createMindMap({ id }))),
      createMindMap: vi.fn((data: any) => Promise.resolve(TestDataFactory.createMindMap(data))),
      updateMindMap: vi.fn((id: string, data: any) =>
        Promise.resolve(TestDataFactory.createMindMap({ id, ...data }))
      ),
      deleteMindMap: vi.fn(() => Promise.resolve(true)),
      searchMindMaps: vi.fn(() => Promise.resolve([])),
    }
  }

  static mockAuthService() {
    return {
      getCurrentUser: vi.fn(() => Promise.resolve(TestDataFactory.createUser())),
      signIn: vi.fn(() => Promise.resolve({ user: TestDataFactory.createUser() })),
      signOut: vi.fn(() => Promise.resolve()),
      signUp: vi.fn(() => Promise.resolve({ user: TestDataFactory.createUser() })),
    }
  }
}

// AI服务Mock
export class MockAIService {
  static mockClaude() {
    return {
      generateSuggestions: vi.fn(() =>
        Promise.resolve([
          {
            type: 'expand',
            title: '添加子主题',
            description: '为当前节点添加相关子主题',
            content: '子主题1\n子主题2\n子主题3',
          },
        ])
      ),
      analyzeStructure: vi.fn(() =>
        Promise.resolve({
          analysis: '思维导图结构良好',
          suggestions: ['添加更多细节', '完善逻辑关系'],
        })
      ),
    }
  }

  static mockOpenAI() {
    return {
      generateEmbeddings: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
      batchGenerateEmbeddings: vi.fn(() =>
        Promise.resolve([
          [0.1, 0.2],
          [0.3, 0.4],
        ])
      ),
    }
  }
}

// 自定义渲染器（支持providers）
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return children // 如果有全局providers，在这里包装
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// 等待异步操作完成
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// 模拟用户交互
export const mockUserInteraction = {
  click: (element: HTMLElement) => {
    element.click()
    return waitForAsync()
  },

  doubleClick: (element: HTMLElement) => {
    const event = new MouseEvent('dblclick', { bubbles: true })
    element.dispatchEvent(event)
    return waitForAsync()
  },

  type: (element: HTMLInputElement, text: string) => {
    element.focus()
    element.value = text
    const event = new Event('input', { bubbles: true })
    element.dispatchEvent(event)
    return waitForAsync()
  },
}

// 测试工具导出
export { customRender as render }
export * from '@testing-library/react'
