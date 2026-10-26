// 键盘快捷键：纯函数解析，便于单测；App.tsx 只负责把动作接到已有逻辑上。
export type ShortcutAction = 'prevPage' | 'nextPage' | 'speakUk' | 'speakUs' | 'underline' | 'save' | 'exportCsv'

export type ShortcutEvent = {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  target?: unknown
}

const KEY_MAP: Record<string, ShortcutAction> = {
  arrowleft: 'prevPage',
  pageup: 'prevPage',
  arrowright: 'nextPage',
  pagedown: 'nextPage',
  k: 'speakUk',
  p: 'speakUs',
  u: 'underline',
  s: 'save',
  e: 'exportCsv',
}

// 用户正在输入框里打字时，所有单键快捷键都必须让路。
export function isTypingTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false
  const node = target as { tagName?: unknown; isContentEditable?: unknown }
  if (node.isContentEditable === true) return true
  const tag = typeof node.tagName === 'string' ? node.tagName.toUpperCase() : ''
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function resolveShortcut(event: ShortcutEvent): ShortcutAction | null {
  // 带修饰键的组合留给浏览器自己（Cmd+S 保存网页、Ctrl+P 打印等）。
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null
  if (isTypingTarget(event.target)) return null
  return KEY_MAP[event.key.toLowerCase()] ?? null
}
