import { describe, expect, it } from 'vitest'
import type { VocabularyCard } from './vocabulary'
import { CSV_HEADER, exportFileName, toAnkiTsv, toCsv } from './vocabularyExport'

function card(overrides: Partial<VocabularyCard> = {}): VocabularyCard {
  return {
    id: 'id-1',
    lemma: 'framework',
    partOfSpeech: 'n.',
    translation: '框架；方法体系',
    ipaUk: '/ˈfreɪmwɜːk/',
    ipaUs: '/ˈfreɪmwɜːrk/',
    english: 'a basic structure or system',
    sentence: 'The proposed framework improves accuracy.',
    savedAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  }
}

describe('生词本导出', () => {
  it('CSV 带 UTF-8 BOM 和表头，中文释义与例句能对上列', () => {
    const csv = toCsv([card()])
    const lines = csv.split('\r\n')

    expect(csv.startsWith('﻿')).toBe(true)
    expect(lines[0]).toBe('﻿' + CSV_HEADER.map((name) => `"${name}"`).join(','))
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('"框架；方法体系"')
    expect(lines[1]).toContain('"The proposed framework improves accuracy."')
  })

  it('CSV 转义：字段里的逗号、双引号和换行不会撑破列结构', () => {
    const csv = toCsv([card({ translation: '含,逗号', english: 'he said "hi"', sentence: 'line one\nline two' })])
    const body = csv.split('\r\n')[1]

    expect(body).toContain('"含,逗号"')
    expect(body).toContain('"he said ""hi"""')
    expect(body).toContain('"line one\nline two"') // 引号内的换行是合法 CSV，不会被当成新行
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  it('防表格公式注入：以 = + - @ 开头的字段加前缀单引号，不会被 Excel 当公式执行', () => {
    const body = toCsv([card({ translation: '=1+1', english: '+SUM(A1)', sentence: '@cmd' })]).split('\r\n')[1]

    expect(body).toContain(`"'=1+1"`)
    expect(body).toContain(`"'+SUM(A1)"`)
    expect(body).toContain(`"'@cmd"`)
  })

  it('Anki TSV：一行一张卡、三列（正面/背面/标签），字段里的制表符与换行被压成空格', () => {
    const tsv = toAnkiTsv([card({ sentence: 'with\ttab\nand newline' }), card({ id: 'id-2', lemma: 'robust' })])
    const rows = tsv.split('\n')

    expect(rows).toHaveLength(2)
    expect(rows[0].split('\t')).toHaveLength(3)
    expect(rows[0].split('\t')[0]).toBe('framework')
    expect(rows[0].split('\t')[1]).toContain('with tab and newline')
    expect(rows[0].split('\t')[2]).toBe('paperlingo')
    expect(rows[1].split('\t')[0]).toBe('robust')
  })

  it('空生词本导出不会崩，只剩表头', () => {
    expect(toCsv([]).split('\r\n')).toHaveLength(1)
    expect(toAnkiTsv([])).toBe('')
  })

  it('文件名带日期和正确后缀', () => {
    const at = new Date('2026-03-05T12:00:00.000Z')
    expect(exportFileName('csv', at)).toBe('paperlingo-vocabulary-2026-03-05.csv')
    expect(exportFileName('anki', at)).toBe('paperlingo-anki-2026-03-05.tsv')
  })
})
