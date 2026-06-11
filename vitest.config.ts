import { defineConfig } from 'vitest/config'
import path from 'path'

// Pin a non-UTC timezone so the timezone-safety regression tests (DTE,
// getTodayDateString) actually bite on UTC runners like GitHub CI.
process.env.TZ = 'Europe/Brussels'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // jsdom so React component/hook tests can render; pure-logic tests run here too.
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
