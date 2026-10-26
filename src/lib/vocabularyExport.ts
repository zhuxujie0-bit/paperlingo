// 生词本导出：CSV（Excel / Numbers）与 Anki 兼容 TSV。
// 全部在浏览器里生成 Blob 下载，不上传任何数据、不需要任何服务端。
import type { VocabularyCard } from './vocabulary'

// 表格软件会把以 = + - @ 开头的单元格当公式执行（CSV 注入）。
// 词典释义里确实可能出现 "-" 开头的内容，所以统一加前缀单引号钝化。
function defuseFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

function csvCell(value: string): string {
  const safe = defuseFormula(value ?? '')
  return `"${safe.replaceAll('"', '""')}"`
}

// Anki 导入按 Tab 切列、按换行切卡片，字段里出现这两者会错位 → 替换成空格。
function tsvCell(value: string): string {
  return defuseFormula(value ?? '').replace(/[\t\r\n]+/g, ' ').trim()
}

export const CSV_HEADER = ['word', 'lemma', 'part_of_speech', 'ipa_uk', 'ipa_us', 'translation', 'english', 'sentence', 'saved_at']

function fields(card: VocabularyCard): string[] {
  return [card.lemma, card.lemma, card.partOfSpeech, card.ipaUk, card.ipaUs, card.translation, card.english, card.sentence, card.savedAt]
}

export function toCsv(cards: VocabularyCard[]): string {
  // BOM 让 Excel 以 UTF-8 打开，否则中文释义是乱码。
  return '﻿' + [CSV_HEADER, ...cards.map(fields)].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

// Anki「基本」卡片模板：正面 = 单词，背面 = 释义 + 例句，第三列作为标签。
export function toAnkiTsv(cards: VocabularyCard[]): string {
  return cards
    .map((card) => {
      const back = [card.partOfSpeech, card.translation, card.ipaUs, card.sentence].map(tsvCell).filter(Boolean).join(' | ')
      return [tsvCell(card.lemma), back, 'paperlingo'].join('\t')
    })
    .join('\n')
}

export function exportFileName(kind: 'csv' | 'anki', now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return kind === 'csv' ? `paperlingo-vocabulary-${stamp}.csv` : `paperlingo-anki-${stamp}.tsv`
}

export function downloadTextFile(fileName: string, mimeType: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Safari 需要等一帧再回收，否则下载会被取消。
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
