import type { DictionaryEntry } from './dictionary'

export type VocabularyCard = DictionaryEntry & { id: string; sentence: string; savedAt: string }
const KEY = 'paper-reader-vocabulary-v1'

export function readVocabulary(): VocabularyCard[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as VocabularyCard[]
  } catch {
    return []
  }
}

export function saveVocabulary(entry: DictionaryEntry, sentence: string): VocabularyCard[] {
  const cards = readVocabulary()
  const duplicate = cards.some((card) => card.lemma === entry.lemma && card.sentence === sentence)
  if (duplicate) return cards
  const next = [{ ...entry, id: crypto.randomUUID(), sentence, savedAt: new Date().toISOString() }, ...cards]
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
