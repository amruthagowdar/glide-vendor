import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import http from 'http'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'maps-unshortener',
      configureServer(server) {
        server.middlewares.use('/api/unshorten', (req, res) => {
          const urlObj = new URL(req.url || '', 'http://localhost')
          const targetUrl = urlObj.searchParams.get('url')
          if (!targetUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing url parameter' }))
            return
          }

          const client = targetUrl.startsWith('https') ? https : http
          const reqUpstream = client.get(
            targetUrl,
            { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
            (upstreamRes) => {
              const redirectUrl = upstreamRes.headers.location || ''
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify({ redirectUrl }))
            }
          )

          reqUpstream.on('error', (err) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          })
        })
      },
    },
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
