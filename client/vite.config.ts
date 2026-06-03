import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Test config is spread as `any` so tsc doesn't require vitest types during
// the production build (vitest is a devDependency and is present at test time).
const vitestConfig = {
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/services/**', 'src/utils/**', 'src/components/**'],
      exclude: ['src/test/**', 'node_modules/**'],
    },
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  ...vitestConfig,
})
