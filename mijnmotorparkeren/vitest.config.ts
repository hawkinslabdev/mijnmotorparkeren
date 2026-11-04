import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Playwright specs run separately.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
