import { NextRequest, NextResponse } from 'next/server'

interface TestUser {
  id: string
  email: string
  full_name: string
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest) {
  // 仅在开发/测试环境启用
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test auth disabled in production' }, { status: 404 })
  }

  console.log('[TEST AUTH] API called, NODE_ENV:', process.env.NODE_ENV)

  const { searchParams } = new URL(request.url)
  const userEmail = searchParams.get('user')
  const token = searchParams.get('token')

  // 验证安全令牌（简单的开发环境验证）
  if (token !== 'test-auth-secret-2025') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // 支持的测试用户
  const testUsers: Record<string, TestUser> = {
    'dev@test.com': {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'dev@test.com',
      full_name: '开发测试用户',
      created_at: '2025-01-09T01:00:00.000Z',
      updated_at: '2025-01-09T01:00:00.000Z',
    },
    'autotester@test.com': {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      email: 'autotester@test.com',
      full_name: 'Auto Tester',
      created_at: '2025-01-15T00:00:00.000Z',
      updated_at: '2025-01-15T00:00:00.000Z',
    },
  }

  const user = testUsers[userEmail || 'autotester@test.com']
  if (!user) {
    return NextResponse.json({ error: 'Test user not found' }, { status: 404 })
  }

  // 返回用户信息用于测试环境直接设置
  return NextResponse.json({
    success: true,
    user,
    message: 'Test authentication successful'
  })
}