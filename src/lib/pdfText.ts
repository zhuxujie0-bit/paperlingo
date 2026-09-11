export type PdfTextItem = { str: string; x: number; y: number; width: number }

export function joinPdfTextItems(items: PdfTextItem[]): string {
  return items.reduce((text, item, index) => {
    if (index === 0) return item.str
    const previous = items[index - 1]
    const gap = item.x - (previous.x + previous.width)
    const sameLine = Math.abs(item.y - previous.y) < 2
    const isFragment = /^[A-Za-z]+$/.test(previous.str) && /^[A-Za-z]+$/.test(item.str)
    return text + (sameLine && isFragment && gap >= -1 && gap < 1 ? '' : ' ') + item.str
  }, '')
}
