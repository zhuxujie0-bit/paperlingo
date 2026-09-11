// Ella 学习小屋 Service Worker：让网页离线可开、词典分块离线可查。
// 策略：同源 GET 请求走"缓存优先，网络兜底并回写缓存"。词典分块查过一次即永久离线可用。
const CACHE_NAME = 'ella-paperlingo-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest'])).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // 翻译等第三方请求不拦截

  event.respondWith(
    caches.match(request, { ignoreSearch: url.pathname.includes('/dict/') }).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      }).catch(() => {
        // 离线且未缓存：页面导航回退到缓存的首页
        if (request.mode === 'navigate') return caches.match('./index.html')
        return Response.error()
      })
    })
  )
})
