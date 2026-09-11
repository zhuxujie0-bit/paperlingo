import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 相对路径：GitHub Pages 子路径和本地打开都能用
  server: { host: '0.0.0.0', proxy: { '/api': 'http://127.0.0.1:8791' } },
})
