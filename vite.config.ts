import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Lists every file in a folder as paths like "assets/index-abc123.js".
function listFiles(folder: string, prefix = ''): string[] {
  return readdirSync(join(folder, prefix), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      return entry.isDirectory() ? listFiles(folder, path) : [path]
    },
  )
}

// The service worker keeps a copy of the whole built app so it can open
// without internet. The version changes whenever any built file changes,
// which makes browsers replace the old copy with the new one.
function buildServiceWorker(version: string, urls: string[]): string {
  return `// Generated at build time. Do not edit.
const VERSION = ${JSON.stringify(version)}
const CACHE = 'my-little-world-' + VERSION
const FONT_CACHE = 'my-little-world-fonts'
const PRECACHE = ${JSON.stringify(urls)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('my-little-world-') &&
                key !== CACHE &&
                key !== FONT_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function fontResponse(request) {
  const cache = await caches.open(FONT_CACHE)
  const cached = await cache.match(request, { ignoreVary: true })
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(fontResponse(request))
    return
  }

  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Always try the network first so a new version is picked up,
    // and fall back to the saved copy when there is no internet.
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html', { ignoreVary: true }),
      ),
    )
    return
  }

  event.respondWith(
    caches
      .match(request, { ignoreVary: true })
      .then((cached) => cached || fetch(request)),
  )
})
`
}

function serviceWorkerPlugin(): Plugin {
  let outDir = ''

  return {
    name: 'my-little-world-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const files = listFiles(outDir).filter((file) => file !== 'sw.js')
      const hash = createHash('sha256')

      for (const file of files) {
        hash.update(file)
        hash.update(readFileSync(join(outDir, file)))
      }

      const version = hash.digest('hex').slice(0, 12)
      const urls = ['/', ...files.map((file) => `/${file}`)]

      writeFileSync(join(outDir, 'sw.js'), buildServiceWorker(version, urls))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
})
