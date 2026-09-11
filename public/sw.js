// Ella 学习小屋 Service Worker：让网页离线可开、词典分块离线可查。
// 策略：
// - 页面导航（HTML）走"网络优先，离线回退缓存"——保证新版本能及时生效；
// - 静态资源与词典分块走"缓存优先，网络回写"——查过一次即永久离线可用。
const CACHE_NAME = 'ella-paperlingo-v2'

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

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached
    return fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
      }
      return response
    })
  })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // 翻译等第三方请求不拦截

  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    // 页面：网络优先，保证更新生效；离线时回退到缓存首页
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      }).catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    )
    return
  }

  event.respondWith(cacheFirst(request))
})
