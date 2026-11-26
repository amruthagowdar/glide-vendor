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

          function follow(currentUrl: string, depth = 0) {
            if (depth > 4) {
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify({ redirectUrl: currentUrl }))
              return
            }

            try {
              const parsed = new URL(currentUrl)
              const client = parsed.protocol === 'https:' ? https : http
              const reqUpstream = client.get(
                currentUrl,
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                  },
                  timeout: 3500,
                },
                (upstreamRes) => {
                  const loc = upstreamRes.headers.location
                  if (loc && [301, 302, 303, 307, 308].includes(upstreamRes.statusCode || 0)) {
                    const nextUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).href
                    follow(nextUrl, depth + 1)
                  } else {
                    res.setHeader('Content-Type', 'application/json')
                    res.setHeader('Access-Control-Allow-Origin', '*')
                    res.end(JSON.stringify({ redirectUrl: currentUrl }))
                  }
                }
              )

              reqUpstream.on('timeout', () => {
                reqUpstream.destroy()
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.end(JSON.stringify({ redirectUrl: currentUrl }))
              })

              reqUpstream.on('error', () => {
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.end(JSON.stringify({ redirectUrl: currentUrl }))
              })
            } catch {
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify({ redirectUrl: currentUrl }))
            }
          }

          follow(targetUrl)
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
