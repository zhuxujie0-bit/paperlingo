import { describe, expect, it } from 'vitest'
import { lookupWord, normalizeLookupWord } from './dictionary'
import { validateLocalDocument } from './fileSafety'
import { isSafeDocxHref } from './docxSafety'
import { joinPdfTextItems } from './pdfText'
import { renderMarkedPdfText } from './pdfHighlight'
import { classifyEnglishSelection } from './selection'

describe('论文划词词典', () => {
  it('第一性原理：点击论文中的词形变化后，能回到原形并得到离线中文释义', () => {
    const result = lookupWord('frameworks')

    expect(result?.lemma).toBe('framework')
    expect(result?.translation).toContain('框架')
    expect(result?.ipaUs).toMatch(/^\/.+\/$/)
    expect(joinPdfTextItems([{ str: 'Evalua', x: 337.32, y: 500, width: 60.0626 }, { str: 'tion', x: 397.44, y: 500, width: 33.22675 }])).toBe('Evaluation')
    expect(renderMarkedPdfText('The hallucination risk.', ['hallucination'])).toBe('The <mark class="pdf-manual-highlight" data-word="hallucination">hallucination</mark> risk.')
    expect(classifyEnglishSelection('framework')).toEqual({ kind: 'word', word: 'framework' })
    expect(classifyEnglishSelection('The proposed framework improves the accuracy of the model.')).toEqual({ kind: 'sentence', sentence: 'The proposed framework improves the accuracy of the model.' })
  })

  it('对抗测试：恶意选区和伪装/超大文件都被拒绝，不进入解析器', () => {
    expect(normalizeLookupWord('<img src=x onerror=alert(1)>')).toBeNull()
    expect(normalizeLookupWord('  2026  ')).toBeNull()
    expect(normalizeLookupWord('fine-grained')).toBe('fine-grained')
    expect(validateLocalDocument({ name: 'research.docx', size: 13 * 1024 * 1024 })).toMatch(/大小/)
    expect(validateLocalDocument({ name: 'paper.docx', size: 1024 })).toBeNull()
    expect(validateLocalDocument({ name: 'paper.pdf.exe', size: 1024 })).toMatch(/PDF 或 DOCX/)
    expect(isSafeDocxHref('javascript:alert(1)')).toBe(false)
    expect(isSafeDocxHref('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeDocxHref('https://example.com/reference')).toBe(true)
    expect(classifyEnglishSelection('<img src=x onerror=alert(1)>')).toEqual({ kind: 'invalid' })
    expect(classifyEnglishSelection('a'.repeat(501))).toEqual({ kind: 'invalid' })
  })
})
