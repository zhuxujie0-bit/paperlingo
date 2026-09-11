export type SelectionKind =
  | { kind: 'empty' | 'invalid' }
  | { kind: 'word'; word: string }
  | { kind: 'sentence'; sentence: string }

export function classifyEnglishSelection(raw: string): SelectionKind {
  const text = raw.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (!text) return { kind: 'empty' }
  if (text.length > 500 || /[\u0000-\u001F\u007F<>]/.test(text)) return { kind: 'invalid' }
  const word = text.replace(/^[“”"'([{]+|[.,;:!?…)”'\]}]+$/g, '')
  if (/^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(word)) return { kind: 'word', word }
  const words = text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) ?? []
  const englishCharacters = (text.match(/[A-Za-z]/g) ?? []).length
  if (words.length >= 3 && englishCharacters / text.length >= 0.55) return { kind: 'sentence', sentence: text }
  return { kind: 'invalid' }
}
