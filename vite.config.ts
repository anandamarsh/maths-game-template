import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Read .env.local and populate process.env for use by the dev API middleware */
function loadEnvLocal() {
  try {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/)
      if (m) process.env[m[1]] ??= m[2].trim().replace(/^['"]|['"]$/g, '')
    }
  } catch { /* no .env.local — skip */ }
}

/**
 * Vite dev plugin that serves /api/send-report locally (mirrors api/send-report.ts).
 * In production, Vercel handles the same route via its serverless function.
 */
function localApiPlugin() {
  return {
    name: 'local-api-send-report',
    configureServer(server: { middlewares: { use: (path: string, fn: (req: any, res: any, next: () => void) => void) => void } }) {
      loadEnvLocal()

      server.middlewares.use('/api/send-report', (req, res, _next) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }

        let raw = ''
        req.on('data', (chunk: Buffer) => { raw += chunk.toString() })
        req.on('end', async () => {
          try {
            const payload: Record<string, string | number> = JSON.parse(raw)
            const apiKey = process.env.RESEND_API_KEY
            const from   = process.env.EMAIL_FROM

            if (!apiKey || !from) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Email service is not configured (missing RESEND_API_KEY / EMAIL_FROM in .env.local).' }))
              return
            }

            const email    = String(payload.email ?? '').trim()
            const pdfB64   = String(payload.pdfBase64 ?? '').trim()

            if (!email || !pdfB64) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Missing email or PDF.' }))
              return
            }

            const senderName = String(payload.senderName || 'SeeMaths')
            const gameName   = String(payload.gameName   || 'Game')
            const score      = `${payload.correctCount ?? 0}/${payload.totalQuestions ?? 0}`
            const accuracy   = `${payload.accuracy ?? 0}%`
            const date       = String(payload.sessionDate  || '')
            const time       = String(payload.sessionTime  || '')
            const duration   = String(payload.durationText || '')
            const stageLabel = String(payload.stageLabel   || '')
            const code       = String(payload.curriculumCode || '')
            const desc       = String(payload.curriculumDescription || '')
            const siteUrl    = String(payload.siteUrl || 'https://www.seemaths.com')
            const fileName   = String(payload.reportFileName || 'report.pdf')

            const html = `
              <p>Hi there,</p>
              <p>A player completed <strong>${gameName}</strong> at ${time} on ${date} for ${duration}.</p>
              <p>Score: <strong>${score}</strong> &nbsp;|&nbsp; Accuracy: <strong>${accuracy}</strong></p>
              <p>Curriculum: <strong>${stageLabel}</strong> — ${code}: ${desc}</p>
              <p>Regards,<br/>${senderName}<br/><a href="${siteUrl}">${siteUrl}</a></p>
            `

            const r = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: `${senderName} <${from}>`,
                to: [email],
                subject: `${gameName} Report — ${date}`,
                html,
                attachments: [{ filename: fileName, content: pdfB64 }],
              }),
            })

            if (!r.ok) {
              const err = await r.text()
              console.error('[API /api/send-report] Resend error:', err)
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Report email could not be sent.' }))
              return
            }

            console.log(`[API /api/send-report] ✅ Sent to ${email}`)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (err) {
            console.error('[API /api/send-report] Error:', err)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
      })
    },
  }
}

export default defineConfig(() => ({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    localApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'external-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
  server: {
    port: 4003,
    strictPort: true,
  },
}))
