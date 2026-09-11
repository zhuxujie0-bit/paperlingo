// 本机英文句法分析：compromise.js 在浏览器内运行，不联网、不调用任何付费 API。
// 整句翻译走免费的 MyMemory 接口（无需 Key）；离线时跳过翻译，只给结构分析。
import nlp from 'compromise'

export type LocalGrammarResult = {
  structure: string
  main_clause: string
  clauses: Array<{ text: string; role: string; type: string }>
  explanation: string
  translation: string
}

// 句首从属连词 → 从句类型
const SUBORDINATORS: Array<[string, string]> = [
  ['even though', '让步状语从句'],
  ['even if', '让步状语从句'],
  ['so that', '目的状语从句'],
  ['as long as', '条件状语从句'],
  ['in order that', '目的状语从句'],
  ['although', '让步状语从句'],
  ['though', '让步状语从句'],
  ['because', '原因状语从句'],
  ['since', '原因/时间状语从句'],
  ['unless', '条件状语从句'],
  ['if', '条件状语从句'],
  ['when', '时间状语从句'],
  ['whenever', '时间状语从句'],
  ['while', '时间/对比状语从句'],
  ['until', '时间状语从句'],
  ['before', '时间状语从句'],
  ['after', '时间状语从句'],
  ['as', '时间/原因状语从句'],
  ['whereas', '对比状语从句'],
]

// 关系词：出现在从句内部时，提示内含定语/名词性从句
const RELATIVE_PATTERN = /\b(that|which|who|whom|whose|where)\b/i

function classifyClause(text: string, isFirstMainFound: boolean): { role: string; type: string; note: string } {
  const lower = text.trim().toLowerCase().replace(/^[,:;]\s*/, '')
  for (const [marker, type] of SUBORDINATORS) {
    if (lower.startsWith(marker + ' ') || lower === marker) {
      return { role: '从句', type, note: `由 “${marker}” 引导` }
    }
  }
  if (/^(and|or|but|yet|so)\b/.test(lower)) {
    return { role: isFirstMainFound ? '并列主句' : '主句', type: '并列句成分', note: `由并列连词 “${lower.split(' ')[0]}” 连接` }
  }
  return { role: isFirstMainFound ? '主句（第二个，可能与前句并列）' : '主句', type: '句子主干', note: '' }
}

async function translateSentence(sentence: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sentence)}&langpair=en|zh-CN`
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('translate-http')
    const payload = await response.json()
    const text = payload?.responseData?.translatedText
    if (typeof text === 'string' && text.trim() && !/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(text)) return text.trim()
    if (typeof text === 'string' && text.trim()) return text.trim() // 警告时仍尽量返回译文
    throw new Error('translate-empty')
  } catch {
    return '（整句翻译需要联网，当前未获取到；上面的结构分析是本机完成的，不受影响。）'
  }
}

export async function analyzeSentenceLocally(rawSentence: string): Promise<LocalGrammarResult> {
  const sentence = rawSentence.trim()
  const doc = nlp(sentence)
  let parts = doc.clauses().out('array') as string[]
  if (!Array.isArray(parts) || parts.length === 0) parts = [sentence]
  parts = parts.map((part) => part.trim()).filter(Boolean)

  const clauses: LocalGrammarResult['clauses'] = []
  const notes: string[] = []
  let mainFound = false
  let mainClause = ''
  const types: string[] = []

  for (const part of parts) {
    const { role, type, note } = classifyClause(part, mainFound)
    let finalType = type
    let finalNote = note
    const embedded = part.match(RELATIVE_PATTERN)
    if (embedded && role.startsWith('主句')) {
      finalNote = `${note ? note + '；' : ''}内含 “${embedded[1]}” 引导的定语/名词性从句`
    }
    if (!role.startsWith('主句') && embedded && !note) {
      finalNote = `由 “${embedded[1]}” 引导`
    }
    if (role.startsWith('主句') && !mainFound) {
      mainFound = true
      mainClause = part.replace(/^[,:;]\s*/, '')
    }
    types.push(role.startsWith('主句') ? '主句' : finalType)
    clauses.push({ text: part.replace(/^[,:;]\s*/, ''), role, type: finalType + (finalNote ? `（${finalNote}）` : '') })
    if (finalNote) notes.push(finalNote)
  }

  if (!mainClause) mainClause = clauses[0]?.text ?? sentence

  const verbs = doc.verbs().out('array') as string[]
  const structure = types.join(' + ')
  const explanation = [
    `全句共拆出 ${clauses.length} 个分句：${clauses.map((clause, index) => `第${index + 1}段是${clause.role}（${clause.type}）`).join('；')}。`,
    mainClause ? `理解时先抓主句 “${mainClause}”，即“谁 + 做什么”，其余从句都是补充时间、原因、条件或修饰。` : '',
    verbs.length ? `谓语动词依次是：${verbs.slice(0, 6).join('、')}。` : '',
  ].filter(Boolean).join('')

  const translation = await translateSentence(sentence)
  return { structure, main_clause: mainClause, clauses, explanation, translation }
}
