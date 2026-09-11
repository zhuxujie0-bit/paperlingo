// 浏览器端 ECDICT 查词：按"双字母分块"按需 fetch，IndexedDB 持久缓存。
// 目标：平板脱离 Mac 也能查全量离线词典；查过的分块离线可用。

export type RemoteDictEntry = {
  lemma: string
  phonetic: string
  partOfSpeech: string
  translation: string
  english: string
}

type ChunkPayload = Record<string, [string, string, string, string]>

const DB_NAME = 'ella-dict-cache'
const DB_STORE = 'chunks'
const DB_VERSION = 1

// 进程内缓存，避免同一分块重复发请求
const memoryCache = new Map<string, Promise<ChunkPayload | null>>()

function chunkKeyOf(word: string): string | null {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!letters) return null
  return letters[0] + (letters.length > 1 ? letters[1] : '_')
}

function openDb(): Promise<IDBDatabase | null> {
  if (!('indexedDB' in window)) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbGet(key: string): Promise<ChunkPayload | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readonly')
      const request = tx.objectStore(DB_STORE).get(key)
      request.onsuccess = () => resolve((request.result as ChunkPayload | undefined) ?? null)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbSet(key: string, value: ChunkPayload): Promise<void> {
  const db = await openDb()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

async function loadChunk(key: string): Promise<ChunkPayload | null> {
  const cached = await idbGet(key)
  if (cached) return cached
  try {
    const base = import.meta.env.BASE_URL || '/'
    const response = await fetch(`${base}dict/${key}.json`, { cache: 'force-cache' })
    if (!response.ok) return null
    const payload = (await response.json()) as ChunkPayload
    void idbSet(key, payload)
    return payload
  } catch {
    return null
  }
}

function loadChunkOnce(key: string): Promise<ChunkPayload | null> {
  let pending = memoryCache.get(key)
  if (!pending) {
    pending = loadChunk(key)
    memoryCache.set(key, pending)
  }
  return pending
}

function toEntry(word: string, raw: [string, string, string, string]): RemoteDictEntry {
  return { lemma: word, phonetic: raw[0] || '', partOfSpeech: raw[1] || '', translation: raw[2] || '', english: raw[3] || '' }
}

// 常见变形回退：查不到时去掉常规词尾再查一次（复数/过去式/进行时/比较级）
function fallbackForms(word: string): string[] {
  const forms: string[] = []
  if (word.endsWith('ies') && word.length > 4) forms.push(word.slice(0, -3) + 'y')
  if (word.endsWith('es') && word.length > 3) forms.push(word.slice(0, -2))
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) forms.push(word.slice(0, -1))
  if (word.endsWith('ied') && word.length > 4) forms.push(word.slice(0, -3) + 'y')
  if (word.endsWith('ed') && word.length > 3) { forms.push(word.slice(0, -2)); forms.push(word.slice(0, -1)) }
  if (word.endsWith('ing') && word.length > 4) { forms.push(word.slice(0, -3)); forms.push(word.slice(0, -3) + 'e') }
  if (word.endsWith('er') && word.length > 3) forms.push(word.slice(0, -2))
  if (word.endsWith('est') && word.length > 4) forms.push(word.slice(0, -3))
  return [...new Set(forms)].filter((form) => form !== word)
}

// 查一个词：返回词条；查不到（含离线且未缓存）返回 null。
export async function lookupRemoteWord(rawWord: string): Promise<RemoteDictEntry | null> {
  const word = rawWord.trim().toLowerCase()
  if (!/^[a-z]+(?:[-'][a-z]+)*$/.test(word)) return null
  const candidates = [word, ...fallbackForms(word)]
  for (const candidate of candidates) {
    const key = chunkKeyOf(candidate)
    if (!key) continue
    const chunk = await loadChunkOnce(key)
    if (!chunk) {
      // 分块没拿到（离线且未缓存）：继续试别的候选词没意义，直接失败
      if (candidate === word) return null
      continue
    }
    const raw = chunk[candidate]
    if (raw) return toEntry(candidate, raw)
  }
  return null
}
