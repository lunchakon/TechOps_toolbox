import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/** Dev only: serve ./config at /config like the production container does. */
function serveConfigDir(): Plugin {
  return {
    name: 'serve-config-dir',
    configureServer(server) {
      server.middlewares.use('/config', (req, res, next) => {
        const name = path.basename((req.url ?? '').split('?')[0])
        const file = path.resolve(__dirname, 'config', name)
        if (!name.endsWith('.json') || !fs.existsSync(file)) return next()
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(fs.readFileSync(file))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveConfigDir()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
