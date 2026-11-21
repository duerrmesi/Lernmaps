import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function localFileStoragePlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data')
  const dataFile = path.resolve(dataDir, 'learnmap_data.json')
  const backupDir = path.resolve(dataDir, 'backups')
  let lastBackupTime = 0

  const handleMiddleware = (middlewares: any) => {
    middlewares.use('/api/storage', (req: any, res: any, next: any) => {
      // Sicherheitsprüfung: CSRF / Cross-Origin Protection
      // Verhindert, dass fremde Websites im Browser über localhost auf die Speicher-API zugreifen
      const origin = req.headers['origin'] || req.headers['referer']
      if (origin) {
        try {
          const originUrl = new URL(origin)
          const isLocal =
            originUrl.hostname === 'localhost' ||
            originUrl.hostname === '127.0.0.1' ||
            originUrl.hostname === '::1'
          if (!isLocal && originUrl.host !== req.headers['host']) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: false, error: 'Forbidden: Cross-origin request rejected' }))
            return
          }
        } catch {
          res.statusCode = 403
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ success: false, error: 'Forbidden: Malformed origin' }))
          return
        }
      }

      // Endpoint: /api/storage/info
      if (req.method === 'GET' && (req.url === '/info' || req.url === '/info/')) {
        const exists = fs.existsSync(dataFile)
        const stats = exists ? fs.statSync(dataFile) : null
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.statusCode = 200
        res.end(
          JSON.stringify({
            success: true,
            path: dataFile,
            exists,
            size: stats ? stats.size : 0,
            lastModified: stats ? stats.mtimeMs : null,
          })
        )
        return
      }

      // Endpoint: GET /api/storage
      if (req.method === 'GET' && (req.url === '' || req.url === '/' || req.url.startsWith('/?'))) {
        try {
          if (fs.existsSync(dataFile)) {
            const raw = fs.readFileSync(dataFile, 'utf-8')
            const parsed = JSON.parse(raw)
            const stats = fs.statSync(dataFile)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                success: true,
                data: parsed,
                path: dataFile,
                lastModified: stats.mtimeMs,
                size: stats.size,
              })
            )
            return
          } else {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.statusCode = 200
            res.end(JSON.stringify({ success: false, data: null, path: dataFile }))
            return
          }
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.statusCode = 500
          res.end(JSON.stringify({ success: false, error: err.message }))
          return
        }
      }

      // Endpoint: POST /api/storage
      if (req.method === 'POST' && (req.url === '' || req.url === '/')) {
        let body = ''
        let bodySize = 0
        const MAX_BODY_SIZE = 50 * 1024 * 1024 // 50 MB Limit zum Schutz vor Memory-Exhaustion (DoS)
        let tooLarge = false

        req.on('data', (chunk: Buffer) => {
          bodySize += chunk.length
          if (bodySize > MAX_BODY_SIZE) {
            tooLarge = true
            req.destroy()
            res.statusCode = 413
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: false, error: 'Payload too large (max 50 MB)' }))
            return
          }
          body += chunk.toString()
        })
        req.on('end', () => {
          if (tooLarge) return
          try {
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true })
            }

            // Validate that body is JSON
            const parsed = JSON.parse(body)
            const formatted = JSON.stringify(parsed, null, 2)

            // Check if existing content is already identical to avoid unnecessary disk writes
            if (fs.existsSync(dataFile)) {
              const currentRaw = fs.readFileSync(dataFile, 'utf-8')
              if (currentRaw === formatted) {
                const stats = fs.statSync(dataFile)
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.statusCode = 200
                res.end(
                  JSON.stringify({
                    success: true,
                    path: dataFile,
                    timestamp: Date.now(),
                    lastModified: stats.mtimeMs,
                    size: stats.size,
                    unchanged: true,
                  })
                )
                return
              }
            }

            // Atomic write to avoid file corruption
            const tempFile = path.resolve(dataDir, `learnmap_data.${Date.now()}.tmp`)
            fs.writeFileSync(tempFile, formatted, 'utf-8')
            fs.renameSync(tempFile, dataFile)

            // Maintain rotating backups (at most once every 5 minutes, keep up to 5 backups)
            const now = Date.now()
            if (now - lastBackupTime > 300000) {
              lastBackupTime = now
              try {
                if (!fs.existsSync(backupDir)) {
                  fs.mkdirSync(backupDir, { recursive: true })
                }
                const backupFiles = fs
                  .readdirSync(backupDir)
                  .filter((f) => f.startsWith('learnmap_backup_') && f.endsWith('.json'))
                  .sort()

                if (backupFiles.length >= 5) {
                  fs.unlinkSync(path.resolve(backupDir, backupFiles[0]))
                }
                const backupPath = path.resolve(backupDir, `learnmap_backup_${now}.json`)
                fs.writeFileSync(backupPath, formatted, 'utf-8')
              } catch {
                // Ignore backup folder error
              }
            }

            const stats = fs.statSync(dataFile)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                success: true,
                path: dataFile,
                timestamp: Date.now(),
                lastModified: stats.mtimeMs,
                size: stats.size,
              })
            )
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
          }
        })
        return
      }

      next()
    })

    // High-definition Neural TTS Proxy Endpoint
    middlewares.use('/api/tts', (req: any, res: any, next: any) => {
      if (req.method !== 'GET') return next()

      try {
        const parsedUrl = new URL(req.url, 'http://localhost')
        const q = parsedUrl.searchParams.get('q') || ''
        const lang = (parsedUrl.searchParams.get('lang') || 'en').split('-')[0].toLowerCase()

        if (!q.trim()) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Missing query param q' }))
          return
        }

        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=${lang}&client=tw-ob`
        const options = {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: '*/*',
          },
        }

        https
          .get(ttsUrl, options, (googleRes) => {
            if (googleRes.statusCode !== 200) {
              res.statusCode = googleRes.statusCode || 500
              res.end()
              return
            }

            res.setHeader('Content-Type', 'audio/mpeg')
            res.setHeader('Cache-Control', 'public, max-age=86400')
            googleRes.pipe(res)
          })
          .on('error', (err) => {
            console.warn('TTS proxy error:', err)
            res.statusCode = 502
            res.end()
          })
      } catch {
        next()
      }
    })
  }

  return {
    name: 'learnmap-local-storage-plugin',
    configureServer(server) {
      handleMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      handleMiddleware(server.middlewares)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    watch: {
      ignored: [
        '**/data/**',
        '**/backups/**',
        '**/learnmap_data*',
        '**/*.tmp*',
        /[\\/]data[\\/]/,
        /[\\/]backups[\\/]/,
        /learnmap_data/,
      ],
    },
  },
  plugins: [react(), localFileStoragePlugin()],
})
