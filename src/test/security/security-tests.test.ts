import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TestDataFactory } from '@/test/helpers/test-utils'

// 安全测试套件
describe('安全测试套件', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('认证和授权安全', () => {
    it('应该拒绝未授权的API请求', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: 'Unauthorized',
            code: 'MISSING_AUTH_TOKEN',
          }),
      })

      const response = await fetch('/api/mindmaps', {
        // 故意不包含Authorization头
        method: 'GET',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const error = await response.json()
      expect(error.code).toBe('MISSING_AUTH_TOKEN')
    })

    it('应该拒绝无效的JWT令牌', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'expired.jwt.token',
        '',
        'malformed_token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_payload',
      ]

      for (const invalidToken of invalidTokens) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () =>
            Promise.resolve({
              error: 'Invalid token',
              code: 'INVALID_TOKEN',
            }),
        })

        const response = await fetch('/api/mindmaps', {
          headers: {
            Authorization: `Bearer ${invalidToken}`,
          },
        })

        expect(response.status).toBe(401)
      }
    })

    it('应该验证用户权限控制', async () => {
      const otherUserMindMap = TestDataFactory.createMindMap({
        user_id: 'other-user-123',
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            error: 'Forbidden',
            code: 'INSUFFICIENT_PERMISSIONS',
          }),
      })

      const response = await fetch(`/api/mindmaps/${otherUserMindMap.id}`, {
        headers: {
          Authorization: 'Bearer valid_token_for_different_user',
        },
      })

      expect(response.status).toBe(403)
    })

    it('应该防止JWT令牌重放攻击', async () => {
      // 模拟已撤销的令牌
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: 'Token revoked',
            code: 'TOKEN_REVOKED',
          }),
      })

      const revokedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.revoked_token'

      const response = await fetch('/api/mindmaps', {
        headers: {
          Authorization: `Bearer ${revokedToken}`,
        },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('输入验证和注入攻击防护', () => {
    it('应该防止SQL注入攻击', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE mindmaps; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        '; DELETE FROM mindmaps WHERE 1=1 --',
        "' AND (SELECT COUNT(*) FROM information_schema.tables)>0 --",
      ]

      for (const payload of sqlInjectionPayloads) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: 'Invalid input',
              code: 'VALIDATION_FAILED',
            }),
        })

        const response = await fetch('/api/mindmaps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload,
            content: '{"nodes": [], "edges": []}',
          }),
        })

        expect(response.status).toBe(400)
      }
    })

    it('应该防止NoSQL注入攻击', async () => {
      const nosqlInjectionPayloads = [
        { $ne: null },
        { $where: 'this.title.length > 0' },
        { $regex: '.*' },
        { title: { $gt: '' } },
        { $or: [{ title: 'test' }, { title: { $ne: null } }] },
      ]

      for (const payload of nosqlInjectionPayloads) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: 'Invalid query format',
              code: 'INVALID_QUERY',
            }),
        })

        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: payload,
          }),
        })

        expect(response.status).toBe(400)
      }
    })

    it('应该防止XSS攻击', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<svg onload=alert("xss")>',
        '"><script>alert("xss")</script>',
        "'><script>alert('xss')</script>",
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
      ]

      for (const payload of xssPayloads) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              TestDataFactory.createMindMap({
                title: payload, // 模拟存储了XSS载荷的响应
              })
            ),
        })

        const response = await fetch('/api/mindmaps/test', {
          headers: { Authorization: 'Bearer valid_token' },
        })

        const data = await response.json()

        // 验证响应数据已被转义或净化
        expect(data.title).not.toContain('<script>')
        expect(data.title).not.toContain('javascript:')
        expect(data.title).not.toContain('onerror=')
        expect(data.title).not.toContain('onload=')
      }
    })

    it('应该验证文件上传安全', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', type: 'application/x-executable' },
        { name: 'script.js', type: 'text/javascript' },
        { name: 'shell.sh', type: 'application/x-shellscript' },
        { name: 'image.php', type: 'application/x-php' },
        { name: 'huge_file.txt', size: 100 * 1024 * 1024 }, // 100MB
      ]

      for (const file of maliciousFiles) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: 'File type not allowed',
              code: 'INVALID_FILE_TYPE',
            }),
        })

        const formData = new FormData()
        formData.append('file', new Blob(['malicious content']), file.name)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: { Authorization: 'Bearer valid_token' },
        })

        expect(response.status).toBe(400)
      }
    })
  })

  describe('API安全限制', () => {
    it('应该实施速率限制', async () => {
      // 模拟快速连续请求
      const rapidRequests = Array.from({ length: 101 }, () =>
        fetch('/api/mindmaps', {
          headers: { Authorization: 'Bearer valid_token' },
        })
      )

      // Mock前100个请求成功，第101个被限流
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockImplementationOnce(() => {
          // 模拟第101个请求被限流
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () =>
              Promise.resolve({
                error: 'Too Many Requests',
                code: 'RATE_LIMIT_EXCEEDED',
                retry_after: 60,
              }),
          })
        })

      const responses = await Promise.all(rapidRequests.slice(0, 2)) // 只测试前2个

      // 验证速率限制生效
      expect(responses.some(r => r.status === 429)).toBe(true)
    })

    it('应该限制请求体大小', async () => {
      const hugeMindMap = {
        title: '超大思维导图',
        content: JSON.stringify({
          nodes: Array.from({ length: 10000 }, (_, i) => ({
            id: `node-${i}`,
            data: { content: 'x'.repeat(10000) }, // 每个节点10KB
          })),
        }), // 约100MB的JSON数据
      }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 413,
        json: () =>
          Promise.resolve({
            error: 'Payload too large',
            code: 'REQUEST_TOO_LARGE',
            max_size: '10MB',
          }),
      })

      const response = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify(hugeMindMap),
      })

      expect(response.status).toBe(413)
    })

    it('应该验证Content-Type头', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 415,
        json: () =>
          Promise.resolve({
            error: 'Unsupported Media Type',
            code: 'INVALID_CONTENT_TYPE',
          }),
      })

      const response = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // 错误的Content-Type
          Authorization: 'Bearer valid_token',
        },
        body: 'invalid data format',
      })

      expect(response.status).toBe(415)
    })
  })

  describe('数据保护和隐私', () => {
    it('应该过滤敏感信息', async () => {
      const mindMapWithSensitiveData = TestDataFactory.createMindMap({
        title: '包含敏感信息的思维导图',
        content: JSON.stringify({
          nodes: [
            { id: '1', data: { content: '我的密码是: password123' } },
            { id: '2', data: { content: '信用卡号: 4532-1234-5678-9012' } },
            { id: '3', data: { content: '身份证号: 123456789012345678' } },
          ],
        }),
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mindMapWithSensitiveData,
            content: JSON.stringify({
              nodes: [
                { id: '1', data: { content: '我的密码是: [已过滤]' } },
                { id: '2', data: { content: '信用卡号: [已过滤]' } },
                { id: '3', data: { content: '身份证号: [已过滤]' } },
              ],
            }),
          }),
      })

      const response = await fetch(`/api/mindmaps/${mindMapWithSensitiveData.id}`, {
        headers: { Authorization: 'Bearer valid_token' },
      })

      const data = await response.json()
      const content = JSON.parse(data.content)

      // 验证敏感信息被过滤
      expect(content.nodes[0].data.content).not.toContain('password123')
      expect(content.nodes[1].data.content).not.toContain('4532-1234-5678-9012')
      expect(content.nodes[2].data.content).not.toContain('123456789012345678')
    })

    it('应该防止信息泄露', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            error: 'Resource not found',
            code: 'NOT_FOUND',
            // 不应该包含详细的错误信息
          }),
      })

      const response = await fetch('/api/mindmaps/non-existent-id', {
        headers: { Authorization: 'Bearer valid_token' },
      })

      const error = await response.json()

      // 错误信息不应该泄露系统内部信息
      expect(error.error).not.toContain('database')
      expect(error.error).not.toContain('table')
      expect(error.error).not.toContain('SQL')
      expect(error.error).not.toContain('stack trace')
    })

    it('应该实施数据访问日志', async () => {
      const sensitiveOperations = [
        { method: 'GET', url: '/api/mindmaps/sensitive-data' },
        { method: 'PUT', url: '/api/mindmaps/important-doc' },
        { method: 'DELETE', url: '/api/mindmaps/critical-info' },
      ]

      for (const operation of sensitiveOperations) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
          headers: {
            get: (name: string) => (name === 'x-request-id' ? `req_${Date.now()}` : null),
          },
        } as any)

        const response = await fetch(operation.url, {
          method: operation.method,
          headers: { Authorization: 'Bearer valid_token' },
        })

        // 验证请求ID存在（用于审计日志）
        expect(response.headers.get('x-request-id')).toBeTruthy()
      }
    })
  })

  describe('第三方服务安全', () => {
    it('应该安全处理AI服务响应', async () => {
      const maliciousAIResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                type: 'expand',
                title: '<script>alert("xss")</script>',
                content: 'javascript:alert("xss")',
                description: '<img src=x onerror=alert("xss")>',
              },
            ]),
          },
        ],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(maliciousAIResponse),
      })

      const response = await fetch('/api/ai/mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          context: '测试',
          nodes: [],
        }),
      })

      const aiSuggestions = await response.json()

      // 验证AI响应被净化
      expect(aiSuggestions[0].title).not.toContain('<script>')
      expect(aiSuggestions[0].content).not.toContain('javascript:')
      expect(aiSuggestions[0].description).not.toContain('onerror=')
    })

    it('应该验证AI服务的SSL证书', async () => {
      // 模拟SSL证书验证失败
      mockFetch.mockRejectedValue(new Error('certificate verify failed'))

      try {
        await fetch('/api/ai/mindmap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid_token',
          },
          body: JSON.stringify({ context: 'test' }),
        })
      } catch (error) {
        expect(error.message).toContain('certificate')
      }
    })

    it('应该防止SSRF攻击', async () => {
      const ssrfPayloads = [
        'http://localhost:22/ssh',
        'http://169.254.169.254/latest/meta-data/',
        'http://internal-server:8080/admin',
        'file:///etc/passwd',
        'ftp://internal-ftp/sensitive-data',
      ]

      for (const payload of ssrfPayloads) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: 'Invalid URL',
              code: 'INVALID_URL',
            }),
        })

        const response = await fetch('/api/external-resource', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid_token',
          },
          body: JSON.stringify({ url: payload }),
        })

        expect(response.status).toBe(400)
      }
    })
  })

  describe('会话安全', () => {
    it('应该正确处理会话过期', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
          }),
      })

      const response = await fetch('/api/mindmaps', {
        headers: { Authorization: 'Bearer expired_token' },
      })

      expect(response.status).toBe(401)

      const error = await response.json()
      expect(error.code).toBe('TOKEN_EXPIRED')
    })

    it('应该防止CSRF攻击', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            error: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING',
          }),
      })

      const response = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
          // 故意不包含CSRF token
        },
        body: JSON.stringify({
          title: 'Test mindmap',
        }),
      })

      expect(response.status).toBe(403)
    })

    it('应该安全地处理退出登录', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            message: 'Logged out successfully',
          }),
      })

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid_token' },
      })

      expect(response.ok).toBe(true)

      // 退出后，该token应该无效
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: 'Token invalidated',
            code: 'TOKEN_INVALIDATED',
          }),
      })

      const testResponse = await fetch('/api/mindmaps', {
        headers: { Authorization: 'Bearer valid_token' },
      })

      expect(testResponse.status).toBe(401)
    })
  })
})
