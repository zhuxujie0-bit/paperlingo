// 阅读进度记忆：同一份 PDF 再次打开时回到上次读的那一页。
// 用 localStorage，键由文件名 + 字节数构成（同名不同版本的论文不会串页）。
const PREFIX = 'paperlingo-reading-progress:v1'

export function progressKey(fileName: string, fileSize: number): string {
  return `${PREFIX}:${fileName}:${fileSize}`
}

// 存下来的页码可能过期（文件被换成了页数更少的版本）或被人手改坏，所以读的时候一律夹紧。
export function clampPage(raw: unknown, totalPages: number): number {
  if (totalPages < 1) return 1
  const page = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.min(Math.floor(page), totalPages)
}

export function readProgress(key: string, totalPages: number): number {
  try {
    return clampPage(localStorage.getItem(key), totalPages)
  } catch {
    return 1
  }
}

export function saveProgress(key: string, page: number): void {
  try {
    localStorage.setItem(key, String(page))
  } catch { /* 隐身模式下 localStorage 可能不可写，记不住进度不该让阅读中断 */ }
}
