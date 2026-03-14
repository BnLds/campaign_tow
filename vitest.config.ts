import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_campaign_tow',
    },
    coverage: {
      include: ['src/lib/**'],
    },
  },
})
