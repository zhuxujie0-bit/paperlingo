import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

// 旧浏览器兼容补丁：PDF 引擎（pdf.js v5）需要的新 API，旧版浏览器没有会导致页面崩溃
if (typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== 'function') {
  ;(Promise as unknown as { withResolvers: <T>() => { promise: Promise<T>; resolve: (v: T) => void; reject: (e?: unknown) => void } }).withResolvers = function <T>() {
    let resolve!: (v: T) => void
    let reject!: (e?: unknown) => void
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }
}
// URL.parse / URL.canParse（Chrome 126+）：pdf.js 内部解析资源地址要用
if (typeof (URL as unknown as { parse?: unknown }).parse !== 'function') {
  ;(URL as unknown as { parse: (url: string, base?: string) => URL | null }).parse = (url: string, base?: string) => {
    try { return new URL(url, base) } catch { return null }
  }
}
if (typeof (URL as unknown as { canParse?: unknown }).canParse !== 'function') {
  ;(URL as unknown as { canParse: (url: string, base?: string) => boolean }).canParse = (url: string, base?: string) => {
    try { new URL(url, base); return true } catch { return false }
  }
}
// AbortSignal.timeout（Chrome 103+）：翻译请求的超时控制要用
if (typeof AbortSignal.timeout !== 'function') {
  ;(AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = (ms: number) => {
    const controller = new AbortController()
    window.setTimeout(() => controller.abort(), ms)
    return controller.signal
  }
}

// 非渲染阶段的错误（如文件解析失败）也显示成可见横幅，而不是悄悄白屏
function showGlobalError(message: string) {
  let banner = document.getElementById('global-error-banner')
  if (!banner) {
    banner = document.createElement('div')
    banner.id = 'global-error-banner'
    banner.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#d93766;color:#fff;padding:12px 16px;border-radius:12px;font:14px/1.6 sans-serif;word-break:break-all;'
    document.body.appendChild(banner)
  }
  banner.textContent = `出错啦，把这段话发给开发者：${message}`
}
window.addEventListener('unhandledrejection', (event) => {
  showGlobalError(String(event.reason?.message || event.reason || '未知异步错误'))
})

// 注册 Service Worker，让网页可"添加到主屏幕"并离线使用（生产环境才注册）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
