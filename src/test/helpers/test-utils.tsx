import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

// Mock数据生成器
export class TestDataFactory {
  static createUser(overrides: Record<string, unknown> = {}) {
    return {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    }
  }

  static createMindMap(overrides: Record<string, unknown> = {}) {
    return {
      id: 'mindmap-123',
      title: '测试思维导图',
      content:
        '{"nodes":[{"id":"1","type":"default","position":{"x":250,"y":5},"data":{"content":"中心主题"}}],"edges":[]}',
      user_id: '123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    }
  }

  static createMindMapNode(overrides: Record<string, unknown> = {}) {
    return {
      id: 'node-123',
      content: '节点内容',
      mind_map_id: 'mindmap-123',
      parent_node_id: null,
      node_level: 0,
      sort_order: 0,
      position_x: 250,
      position_y: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    }
  }
}

// 自定义渲染器，包含Provider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authenticated?: boolean
  user?: Record<string, unknown> | null
}

export function renderWithProviders(ui: React.ReactElement, options: CustomRenderOptions = {}) {
  const { authenticated = false, user = null, ...renderOptions } = options

  // Mock AuthContext的值
  const mockAuthContextValue = {
    user: authenticated ? user || TestDataFactory.createUser() : null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    // 临时mock AuthProvider
    const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
      return <div data-testid="mock-auth-provider">{children}</div>
    }

    return <MockAuthProvider>{children}</MockAuthProvider>
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockAuthContextValue,
  }
}

// Mock函数工厂
export class MockFactory {
  static createSupabaseClient() {
    return {
      auth: {
        getSession: vi.fn(() =>
          Promise.resolve({
            data: { session: null },
            error: null,
          })
        ),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn().mockReturnThis(),
      })),
    }
  }

  static createMockRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      pathname: '/test',
      query: {},
      asPath: '/test',
    }
  }

  static createAIServiceMock() {
    return {
      generateMindMapSuggestions: vi.fn(() =>
        Promise.resolve([
          { type: 'node', title: 'AI建议1', content: 'AI生成的内容1' },
          { type: 'node', title: 'AI建议2', content: 'AI生成的内容2' },
        ])
      ),
      analyzeMindMapStructure: vi.fn(() =>
        Promise.resolve({
          nodeCount: 5,
          depth: 3,
          suggestions: ['建议1', '建议2'],
        })
      ),
      generateEmbeddings: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
    }
  }
}

// 测试断言辅助函数
export class TestAssertions {
  static async waitForLoadingToFinish() {
    // const { waitForElementToBeRemoved } = await import('@testing-library/react')
    const loadingElements = document.querySelectorAll('[data-testid*="loading"]')
    if (loadingElements.length > 0) {
      await waitForLoadingToFinish()
    }
  }

  static expectElementToHaveContent(element: HTMLElement, content: string) {
    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent(content)
  }

  static expectFormToBeValid(form: HTMLFormElement) {
    expect(form).toBeInTheDocument()
    expect(form.checkValidity()).toBe(true)
  }
}

// 性能测试辅助函数
export class PerformanceTestUtils {
  static async measureRenderTime(renderFn: () => Promise<unknown>) {
    const startTime = performance.now()
    await renderFn()
    const endTime = performance.now()
    return endTime - startTime
  }

  static async measureAsyncOperation<T>(operation: () => Promise<T>): Promise<{
    result: T
    duration: number
  }> {
    const startTime = performance.now()
    const result = await operation()
    const endTime = performance.now()

    return {
      result,
      duration: endTime - startTime,
    }
  }
}

// E2E测试辅助函数（为Playwright准备）
export class E2ETestHelpers {
  static getTestId(id: string) {
    return `[data-testid="${id}"]`
  }

  static createTestUser() {
    return {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123456!',
      username: `testuser${Date.now()}`,
      fullName: 'Test User',
    }
  }

  static async waitForNetworkIdle(page: import('@playwright/test').Page, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout })
  }
}

// 错误边界测试组件
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Something went wrong.</div>
    }

    return this.props.children
  }
}

// 导出所有工具
export * from '@testing-library/react'
export * from '@testing-library/jest-dom'
export { default as userEvent } from '@testing-library/user-event'
