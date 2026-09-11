function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function renderMarkedPdfText(source: string, markedWords: string[]): string {
  const words = [...new Set(markedWords.map((word) => word.toLowerCase()).filter((word) => /^[a-z]+(?:-[a-z]+)?$/.test(word)))].sort((a, b) => b.length - a.length)
  if (!words.length) return escapeHtml(source)
  const expression = new RegExp(`\\b(${words.map(escapeRegExp).join('|')})\\b`, 'gi')
  let output = ''; let cursor = 0
  for (const match of source.matchAll(expression)) {
    const index = match.index ?? 0
    output += escapeHtml(source.slice(cursor, index))
    const surface = match[0]
    output += `<mark class="pdf-manual-highlight" data-word="${surface.toLowerCase()}">${escapeHtml(surface)}</mark>`
    cursor = index + surface.length
  }
  return output + escapeHtml(source.slice(cursor))
}
