import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

// Mock Next.js navigation
const mockReplace = vi.fn()
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}))

// Mock Auth Context
const mockSignIn = vi.fn()
const mockAuth = {
  signIn: mockSignIn,
  isAuthenticated: false,
  isLoading: false,
  user: null,
  signOut: vi.fn(),
}

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.isAuthenticated = false
    mockAuth.isLoading = false
  })

  it('应该渲染登录表单', () => {
    render(<LoginPage />)

    expect(screen.getByText('Spider Mind')).toBeInTheDocument()
    expect(screen.getByText('登录到你的思维导图工作空间')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入您的邮箱')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入您的密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('应该显示开发环境测试账户信息', () => {
    render(<LoginPage />)

    expect(screen.getByText('开发环境测试账户')).toBeInTheDocument()
    expect(screen.getByText('邮箱: dev@test.com')).toBeInTheDocument()
    expect(screen.getByText('密码: password')).toBeInTheDocument()
  })

  it('应该在已认证时重定向到首页', () => {
    mockAuth.isAuthenticated = true

    render(<LoginPage />)

    expect(mockReplace).toHaveBeenCalledWith('/mindmaps')
  })

  it('应该显示加载状态', () => {
    mockAuth.isLoading = true

    render(<LoginPage />)

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('应该验证表单输入', async () => {
    render(<LoginPage />)

    const loginButton = screen.getByRole('button', { name: '登录' })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('请填写邮箱和密码')).toBeInTheDocument()
    })

    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('应该处理成功登录', async () => {
    mockSignIn.mockResolvedValue(true)

    render(<LoginPage />)

    // 填写表单
    fireEvent.change(screen.getByPlaceholderText('输入您的邮箱'), {
      target: { value: 'dev@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('输入您的密码'), {
      target: { value: 'password' },
    })

    // 提交表单
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('dev@test.com', 'password')
    })

    expect(mockPush).toHaveBeenCalledWith('/mindmaps')
  })

  it('应该处理登录失败', async () => {
    mockSignIn.mockResolvedValue(false)

    render(<LoginPage />)

    // 填写表单
    fireEvent.change(screen.getByPlaceholderText('输入您的邮箱'), {
      target: { value: 'wrong@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('输入您的密码'), {
      target: { value: 'wrongpassword' },
    })

    // 提交表单
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(screen.getByText('邮箱或密码错误')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('应该处理登录异常', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'))

    render(<LoginPage />)

    // 填写表单
    fireEvent.change(screen.getByPlaceholderText('输入您的邮箱'), {
      target: { value: 'dev@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('输入您的密码'), {
      target: { value: 'password' },
    })

    // 提交表单
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(screen.getByText('登录失败，请重试')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('应该在提交时禁用表单', async () => {
    mockSignIn.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(true), 100))
    )

    render(<LoginPage />)

    // 填写表单
    fireEvent.change(screen.getByPlaceholderText('输入您的邮箱'), {
      target: { value: 'dev@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('输入您的密码'), {
      target: { value: 'password' },
    })

    // 提交表单
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    // 检查按钮是否显示加载状态
    expect(screen.getByRole('button', { name: '登录中...' })).toBeInTheDocument()

    // 检查输入框是否被禁用
    expect(screen.getByPlaceholderText('输入您的邮箱')).toBeDisabled()
    expect(screen.getByPlaceholderText('输入您的密码')).toBeDisabled()

    // 等待登录完成
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/mindmaps')
    })
  })
})
