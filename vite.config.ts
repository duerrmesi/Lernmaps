import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
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
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
        })
        req.on('end', () => {
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
