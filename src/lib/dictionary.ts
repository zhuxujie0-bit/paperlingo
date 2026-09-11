export type DictionaryEntry = {
  lemma: string
  partOfSpeech: string
  translation: string
  ipaUk: string
  ipaUs: string
  english: string
}

const seedEntries: DictionaryEntry[] = [
  { lemma: 'framework', partOfSpeech: 'n.', translation: '框架；方法体系', ipaUk: '/ˈfreɪmwɜːk/', ipaUs: '/ˈfreɪmwɜːrk/', english: 'a basic structure or system' },
  { lemma: 'propose', partOfSpeech: 'v.', translation: '提出；提议', ipaUk: '/prəˈpəʊz/', ipaUs: '/prəˈpoʊz/', english: 'to put forward an idea for consideration' },
  { lemma: 'improve', partOfSpeech: 'v.', translation: '改善；提高', ipaUk: '/ɪmˈpruːv/', ipaUs: '/ɪmˈpruːv/', english: 'to make something better' },
  { lemma: 'accuracy', partOfSpeech: 'n.', translation: '准确性', ipaUk: '/ˈækjərəsi/', ipaUs: '/ˈækjərəsi/', english: 'the degree to which something is correct' },
  { lemma: 'model', partOfSpeech: 'n.', translation: '模型；模式', ipaUk: '/ˈmɒdl/', ipaUs: '/ˈmɑːdl/', english: 'a representation or system used for analysis' },
  { lemma: 'approach', partOfSpeech: 'n.', translation: '方法；途径', ipaUk: '/əˈprəʊtʃ/', ipaUs: '/əˈproʊtʃ/', english: 'a way of dealing with a problem' },
  { lemma: 'dataset', partOfSpeech: 'n.', translation: '数据集', ipaUk: '/ˈdeɪtəset/', ipaUs: '/ˈdeɪtəset/', english: 'a collection of data used for analysis' },
  { lemma: 'evaluate', partOfSpeech: 'v.', translation: '评估；评价', ipaUk: '/ɪˈvæljueɪt/', ipaUs: '/ɪˈvæljueɪt/', english: 'to judge quality or value' },
  { lemma: 'robust', partOfSpeech: 'adj.', translation: '稳健的；鲁棒的', ipaUk: '/rəʊˈbʌst/', ipaUs: '/roʊˈbʌst/', english: 'strong and able to work well in different conditions' },
  { lemma: 'significant', partOfSpeech: 'adj.', translation: '显著的；重要的', ipaUk: '/sɪɡˈnɪfɪkənt/', ipaUs: '/sɪɡˈnɪfɪkənt/', english: 'important enough to deserve attention' },
  { lemma: 'fine-grained', partOfSpeech: 'adj.', translation: '细粒度的', ipaUk: '/ˌfaɪn ˈɡreɪnd/', ipaUs: '/ˌfaɪn ˈɡreɪnd/', english: 'showing small and detailed distinctions' },
]

const irregular: Record<string, string> = { frameworks: 'framework', proposed: 'propose', proposes: 'propose', proposing: 'propose', improved: 'improve', improves: 'improve', improving: 'improve', models: 'model', datasets: 'dataset', evaluated: 'evaluate', evaluates: 'evaluate' }

export function normalizeLookupWord(value: string): string | null {
  const word = value.trim().toLowerCase().replace(/[“”‘’.,;:!?()[\]{}]/g, '')
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(word)) return null
  return word
}

export function lookupWord(value: string): DictionaryEntry | null {
  const normalized = normalizeLookupWord(value)
  if (!normalized) return null
  const lemma = irregular[normalized] ?? normalized
  return seedEntries.find((entry) => entry.lemma === lemma) ?? null
}
