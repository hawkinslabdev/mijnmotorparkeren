import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'
import path from 'path'

export default defineConfig({
  integrations: [
    react(),
  ],
  adapter: node({
    mode: 'standalone',
  }),
  output: 'server',
  vite: {
    resolve: {
      alias: {
        '@': path.resolve('./src'),
        '@components': path.resolve('./src/components'),
        '@hooks': path.resolve('./src/hooks'),
        '@stores': path.resolve('./src/stores'),
        '@utils': path.resolve('./src/utils'),
        '@types': path.resolve('./src/types'),
      },
    },
  },
})
