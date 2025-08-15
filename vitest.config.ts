import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    retry: 2,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        '.next/',
        'coverage/',
        '**/*.stories.*',
        '**/types/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // 测试文件匹配模式
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'src/test/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules/', 'dist/', '.next/', '**/*.e2e.{test,spec}.{js,ts,jsx,tsx}'],
    // 测试环境变量
    env: {
      NODE_ENV: 'test',
      VITEST: 'true',
    },
    // 并行测试配置
    maxConcurrency: 5,
    // 报告器配置
    outputFile: {
      json: './test-results/test-results.json',
      junit: './test-results/junit.xml',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
