import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/auth-context'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// 测试组件，用于访问认证上下文
function TestComponent() {
  const { user, isLoading, isAuthenticated, signIn, signOut } = useAuth()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">
        {isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={() => signIn('dev@test.com', 'password')} data-testid="signin">
        Sign In
      </button>
      <button onClick={signOut} data-testid="signout">
        Sign Out
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('应该初始化为未认证状态', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // 初始加载状态
    expect(screen.getByTestId('loading')).toHaveTextContent('loading')

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
  })

  it('应该从localStorage恢复用户状态', async () => {
    const testUser = {
      id: '123',
      email: 'test@example.com',
      full_name: '测试用户',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    localStorageMock.getItem.mockReturnValue(JSON.stringify(testUser))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
  })

  it('应该处理localStorage中损坏的数据', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-json')

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('spider-mind-user')
  })

  it('应该支持用户登录', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // 点击登录按钮
    fireEvent.click(screen.getByTestId('signin'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    expect(screen.getByTestId('user')).toHaveTextContent('dev@test.com')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'spider-mind-user',
      expect.stringContaining('dev@test.com')
    )
  })

  it('应该拒绝错误的登录凭据', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const TestComponentWithBadCredentials = () => {
      const { signIn } = useAuth()
      return (
        <button onClick={() => signIn('wrong@email.com', 'wrongpassword')} data-testid="bad-signin">
          Bad Sign In
        </button>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
        <TestComponentWithBadCredentials />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // 尝试使用错误凭据登录
    fireEvent.click(screen.getByTestId('bad-signin'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    })

    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('应该支持用户登出', async () => {
    const testUser = {
      id: '123',
      email: 'test@example.com',
      full_name: '测试用户',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    localStorageMock.getItem.mockReturnValue(JSON.stringify(testUser))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    // 点击登出按钮
    fireEvent.click(screen.getByTestId('signout'))

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('spider-mind-user')
  })

  it('应该在没有AuthProvider时抛出错误', () => {
    // 禁用控制台错误，避免测试输出中的错误信息
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})
