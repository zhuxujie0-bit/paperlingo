import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { renderAsync } from 'docx-preview'
import { BookOpen, FileUp, Languages, LoaderCircle, Plus, Sparkles, Volume2 } from 'lucide-react'
import { lookupWord, normalizeLookupWord, type DictionaryEntry } from './lib/dictionary'
import { lookupRemoteWord } from './lib/remoteDict'
import { analyzeSentenceLocally } from './lib/localGrammar'
import { readVocabulary, saveVocabulary, type VocabularyCard } from './lib/vocabulary'
import { validateLocalDocument } from './lib/fileSafety'
import { sanitizeDocxLinks } from './lib/docxSafety'
import { joinPdfTextItems } from './lib/pdfText'
import { renderMarkedPdfText } from './lib/pdfHighlight'
import { classifyEnglishSelection } from './lib/selection'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import './App.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
// 真实论文 PDF 常缺内嵌字体/字符映射，缺这些资源会渲染成空白或乱码；随站点一起发布并显式指定路径。
const pdfBase = import.meta.env.BASE_URL || '/'
const pdfRenderOptions = {
  cMapUrl: `${pdfBase}pdfjs/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${pdfBase}pdfjs/standard_fonts/`,
  wasmUrl: `${pdfBase}pdfjs/wasm/`,
  iccUrl: `${pdfBase}pdfjs/iccs/`,
}
const sampleSentence = 'The proposed framework improves the accuracy of the model through a fine-grained approach.'
type GrammarResult = { structure: string; main_clause: string; clauses: Array<{ text: string; role: string; type: string }>; explanation: string; translation: string }

function App() {
  const [fileName, setFileName] = useState('论文示例 · Sample paper')
  const [mode, setMode] = useState<'sample' | 'pdf' | 'docx'>('sample')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [docxFile, setDocxFile] = useState<File | null>(null)
  const [pages, setPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfPageTexts, setPdfPageTexts] = useState<string[]>([])
  const [pdfStudyText, setPdfStudyText] = useState('')
  const [underlinedWords, setUnderlinedWords] = useState<string[]>([])
  const [entry, setEntry] = useState<DictionaryEntry | null>(null)
  const [selectedWord, setSelectedWord] = useState('')
  const [sentence, setSentence] = useState(sampleSentence)
  const [selectedSentence, setSelectedSentence] = useState('')
  const [grammar, setGrammar] = useState<GrammarResult | null>(null)
  const [isAnalysingGrammar, setIsAnalysingGrammar] = useState(false)
  const [cards, setCards] = useState<VocabularyCard[]>([])
  const [notice, setNotice] = useState('点一下英文词即可查词；拖选一句英文可分析句法。')
  const docxRef = useRef<HTMLDivElement>(null)
  const readerRef = useRef<HTMLElement>(null)
  const lookupRequest = useRef(0)

  useEffect(() => setCards(readVocabulary()), [])
  useEffect(() => {
    if (!pdfFile) { setPdfStudyText(''); setPdfPageTexts([]); return }
    let cancelled = false
    setCurrentPage(1); setNotice('正在提取 PDF 文本…')
    pdfFile.arrayBuffer().then(async (data) => {
      const document = await pdfjs.getDocument({ data }).promise
      const texts: string[] = []
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const content = await (await document.getPage(pageNumber)).getTextContent()
        const items = content.items.filter((item): item is typeof item & { str: string; transform: number[]; width: number } => 'str' in item)
        texts.push(joinPdfTextItems(items.map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width }))).replace(/\s+/g, ' ').trim())
      }
      if (!cancelled) { setPdfPageTexts(texts); setPdfStudyText(texts[0] || ''); setNotice(`PDF 已加载 ${document.numPages} 页。没有自动高亮，句法分析也只在你点击后进行。`) }
    }).catch(() => !cancelled && setNotice('PDF 文本层不可读取：可查看原稿，但无法划词学习。'))
    return () => { cancelled = true }
  }, [pdfFile])

  useEffect(() => {
    if (mode !== 'docx' || !docxFile || !docxRef.current) return
    const container = docxRef.current
    container.replaceChildren()
    renderAsync(docxFile.arrayBuffer(), container, undefined, { renderAltChunks: false, breakPages: true, renderComments: false })
      .then(() => { sanitizeDocxLinks(container); setNotice('DOCX 已加载：拖选词会自动查词，拖选句可分析英文句法。') })
      .catch(() => setNotice('DOCX 解析失败：请确认文件未损坏。'))
  }, [docxFile, mode])

  const openLookup = async (word: string, sourceSentence: string) => {
    const requestId = ++lookupRequest.current
    const result = lookupWord(word)
    setSelectedSentence(''); setGrammar(null); setSelectedWord(word); setSentence(sourceSentence)
    if (result) { setEntry(result); setNotice(`已从内置词典找到 ${result.lemma}。`); return }
    setEntry({ lemma: word.toLowerCase(), partOfSpeech: '查询中', ipaUk: '—', ipaUs: '—', translation: '正在查询本机完整词典…', english: '' })
    const remote = await lookupRemoteWord(word)
    if (requestId !== lookupRequest.current) return
    if (remote) {
      const phonetic = remote.phonetic ? `/${remote.phonetic.replaceAll('/', '')}/` : '—'
      setEntry({ lemma: remote.lemma, partOfSpeech: remote.partOfSpeech || '—', ipaUk: phonetic, ipaUs: phonetic, translation: remote.translation || '—', english: remote.english || '' })
      setNotice(`已从本机完整词典（ECDICT，75 万词条）找到 ${remote.lemma}。`)
      return
    }
    setEntry({ lemma: word.toLowerCase(), partOfSpeech: '待查词', ipaUk: '—', ipaUs: '—', translation: '本机词典暂未收录（若首次查词时处于离线状态，联网后再试一次即可）。', english: 'Local dictionary entry unavailable.' })
    setNotice(`“${word}” 未收录。`)
  }

  const inspectCurrentSelection = () => {
    const selected = window.getSelection()
    if (!selected || selected.isCollapsed || !selected.rangeCount || !readerRef.current) return
    const node = selected.getRangeAt(0).commonAncestorContainer
    const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
    if (!element || !readerRef.current.contains(element)) return
    const selection = classifyEnglishSelection(selected.toString())
    if (selection.kind === 'word') void openLookup(selection.word, pdfStudyText || sampleSentence)
    if (selection.kind === 'sentence') { setEntry(null); setSelectedSentence(selection.sentence); setSentence(selection.sentence); setGrammar(null); setNotice('已选中英文句子，点击右侧按钮即可在本机分析句法（不联网、不花钱）。') }
    if (selection.kind === 'invalid') setNotice('请选择一个英文单词，或不超过 500 个字符、至少含 3 个英文词的句子。')
  }
  const inspectSelection = () => window.setTimeout(inspectCurrentSelection, 0)

  // 触屏设备（手机/平板）拖选不会触发 mouseup：
  // 监听 document 的 selectionchange，用户拖动选区停下 600ms 后自动查词。
  const selectionDebounce = useRef<number | null>(null)
  useEffect(() => {
    const onSelectionChange = () => {
      if (selectionDebounce.current) window.clearTimeout(selectionDebounce.current)
      selectionDebounce.current = window.setTimeout(inspectCurrentSelection, 600)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      if (selectionDebounce.current) window.clearTimeout(selectionDebounce.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 点一下单词也能查：桌面/触屏的单击（tap）都走这里。
  // 用 caretRangeFromPoint 找到指尖/光标落在哪个英文词上。
  const lookupTappedWord = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as Element
    if (target.closest('button, a, input, label')) return
    const selected = window.getSelection()
    if (selected && !selected.isCollapsed) return // 已有拖选选区，交给拖选逻辑
    const docWithCaret = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }
    if (!docWithCaret.caretRangeFromPoint) return
    const range = docWithCaret.caretRangeFromPoint(event.clientX, event.clientY)
    if (!range) return
    ;(range as Range & { expand?: (unit: string) => void }).expand?.('word')
    const normalized = normalizeLookupWord(range.toString())
    if (normalized) void openLookup(normalized, pdfStudyText || sampleSentence)
  }

  const underlineStorageKey = pdfFile ? `ella-manual-underlines:v1:${fileName}:${pdfFile.size}` : ''
  useEffect(() => {
    if (!underlineStorageKey) { setUnderlinedWords([]); return }
    try { const saved = JSON.parse(localStorage.getItem(underlineStorageKey) || '[]'); setUnderlinedWords(Array.isArray(saved) ? saved.filter((word) => typeof word === 'string') : []) } catch { setUnderlinedWords([]) }
  }, [underlineStorageKey])
  useEffect(() => { if (underlineStorageKey) localStorage.setItem(underlineStorageKey, JSON.stringify(underlinedWords)) }, [underlinedWords, underlineStorageKey])
  const addUnderline = () => {
    if (!entry) return
    const word = entry.lemma.toLowerCase()
    setUnderlinedWords((previous) => previous.includes(word) ? previous : [...previous, word])
    setNotice(`已给 “${word}” 划线；这是你的手动标记。`)
  }
  const renderPdfText = ({ str }: { str: string }) => renderMarkedPdfText(str, underlinedWords)

  const handleFile = (file?: File) => {
    if (!file) return
    const safetyError = validateLocalDocument(file)
    if (safetyError) { setNotice(safetyError); return }
    setFileName(file.name); setEntry(null); setSelectedSentence(''); setGrammar(null)
    setNotice(`已选择 ${file.name}（${(file.size / 1048576).toFixed(1)}MB），正在解析…`)
    if (file.name.toLowerCase().endsWith('.pdf')) { setDocxFile(null); setMode('pdf'); setPdfFile(file); return }
    setPdfFile(null); setMode('docx'); setDocxFile(file); setNotice('正在安全渲染 DOCX…')
  }

  const speak = async (lang: 'en-GB' | 'en-US') => {
    const word = entry?.lemma
    if (!word) return
    // 优先用当前设备（平板/手机/Mac）自带的语音引擎，完全不经过服务器。
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(word)
        utterance.lang = lang
        utterance.rate = 0.92
        const voices = window.speechSynthesis.getVoices()
        const voice = voices.find((item) => item.lang === lang) || voices.find((item) => item.lang.startsWith('en'))
        if (voice) utterance.voice = voice
        window.speechSynthesis.speak(utterance)
        setNotice(`正在播放这台设备自带的 ${lang === 'en-GB' ? '英式' : '美式'} 发音；没有经过 Mac。`)
        return
      } catch { /* fall back to the Mac voice below */ }
    }
    // 备用：浏览器不支持本地语音时，由 Mac 生成音频。
    setNotice('正在由 Mac 生成本机语音…')
    try {
      const response = await fetch('/api/pronounce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word, accent: lang === 'en-GB' ? 'uk' : 'us' }) })
      if (!response.ok) throw new Error('voice')
      const audio = new Audio(URL.createObjectURL(await response.blob()))
      audio.onended = () => URL.revokeObjectURL(audio.src)
      await audio.play()
      setNotice(`正在播放 Mac ${lang === 'en-GB' ? '英式 Daniel' : '美式 Samantha'} 发音。`)
    } catch { setNotice('本机发音失败：请确认设备语音或 Mac 服务可用。') }
  }

  const analyzeGrammar = async () => {
    if (!selectedSentence || isAnalysingGrammar) return
    setIsAnalysingGrammar(true); setNotice('正在本机分析英文句法（不联网、不调用付费服务）…')
    try {
      const result = await analyzeSentenceLocally(selectedSentence)
      setGrammar({ translation: result.translation, structure: result.structure, main_clause: result.main_clause, clauses: result.clauses, explanation: result.explanation })
      setNotice('本机句法分析已完成。')
    } catch { setNotice('本机句法分析失败，请换一句再试。') } finally { setIsAnalysingGrammar(false) }
  }

  const selectedSaved = useMemo(() => entry ? cards.some((card) => card.lemma === entry.lemma && card.sentence === sentence) : false, [cards, entry, sentence])
  const saveCard = () => { if (entry) { setCards(saveVocabulary(entry, sentence)); setNotice(`已把 ${entry.lemma} 保存到本机生词本。`) } }
  const documentPanel = <section className="library-panel"><div className="side-title"><BookOpen size={18}/> 我的文档</div><div className="document active"><span className="doc-icon">{mode === 'docx' ? 'DOCX' : 'PDF'}</span><span><b>{fileName}</b><small>{mode === 'sample' ? '上传文档后即可原文划词' : '仅在本机读取，不上传云端'}</small></span></div><div className="side-title vocab-title"><Languages size={18}/> 生词本 <span>{cards.length}</span></div>{cards.length ? <ul className="vocab-list">{cards.slice(0, 5).map((card) => <li key={card.id}><b>{card.lemma}</b><small>{card.translation}</small></li>)}</ul> : <p className="empty">加入的单词会保存在这台浏览器里。</p>}</section>

  return <main className="app-shell"><header className="topbar"><div className="ella-brand"><span className="ella-bow" aria-hidden="true"><i/></span><span className="ella-wordmark"><strong>Ella 的学习小屋</strong><small>READ · MARK · GROW</small></span></div><div className="status-dot">离线词典已启用</div></header><section className="hero"><div><p className="eyebrow">英文论文沉浸式阅读</p><h1>读论文时，<em>划词就懂。</em></h1><p>查词、发音、句法分析全部在这台设备上完成，不联网也不花钱。</p></div><label className="upload"><FileUp size={18}/><span>上传 PDF / DOCX</span><input aria-label="上传 PDF 或 DOCX" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => handleFile(event.target.files?.[0])}/></label></section><div className="notice" role="status">{notice}</div><section className="workspace"><section className="reader"><div className="reader-top"><span>阅读区</span><small>点词即查 · 拖选句子可分析句法 · 单词划线由你手动决定</small></div><article ref={readerRef} className="paper" onMouseUp={inspectSelection} onClick={lookupTappedWord}>{mode === 'sample' && <><p className="paper-meta">DEMO PAPER · PAGE 1</p><h2>Context-aware vocabulary learning in academic reading</h2><p>{sampleSentence}</p></>}{mode === 'pdf' && pdfFile && <Document file={pdfFile} options={pdfRenderOptions} loading={<p><LoaderCircle className="spin"/> 正在解析 PDF…</p>} onLoadSuccess={({ numPages }) => setPages(numPages)} onLoadError={() => setNotice('PDF 解析失败：请确认文件有可选中的文字层。')}><Page key={`${currentPage}-${underlinedWords.join('-')}`} pageNumber={currentPage} width={720} renderAnnotationLayer renderTextLayer customTextRenderer={renderPdfText}/><p className="page-count">已加载 {pages} 页，当前第 {currentPage} 页。<button disabled={currentPage <= 1} onClick={() => { const next = currentPage - 1; setCurrentPage(next); setPdfStudyText(pdfPageTexts[next - 1] || '') }}>上一页</button><button disabled={currentPage >= pages} onClick={() => { const next = currentPage + 1; setCurrentPage(next); setPdfStudyText(pdfPageTexts[next - 1] || '') }}>下一页</button></p></Document>}{mode === 'docx' && <div ref={docxRef} className="docx-content"/>}</article></section><aside className="utility-rail"><section className="lookup"><div className="lookup-title">查词卡</div>{selectedSentence ? <div className="sentence-card"><span>已选英文句子</span><p>{selectedSentence}</p>{grammar ? <div className="ai-box"><b>整句意思</b><p>{grammar.translation}</p><b>句法结构</b><p>{grammar.structure}</p><b>主句</b><p>{grammar.main_clause}</p><b>从句 / 修饰成分</b><ul>{grammar.clauses.map((item, index) => <li key={`${item.text}-${index}`}><strong>{item.type}</strong> — {item.text} ({item.role})</li>)}</ul><b>中文解释</b><p>{grammar.explanation}</p></div> : <button className="ai-button" disabled={isAnalysingGrammar} onClick={analyzeGrammar}><Sparkles size={16}/>{isAnalysingGrammar ? '本机正在分析…' : '分析句法（本机免费）'}</button>}</div> : entry ? <><div className="word-head"><h2>{selectedWord}</h2><span>{entry.partOfSpeech}</span></div><p className="lemma">Lemma: {entry.lemma}</p><div className="pronunciation"><button onClick={() => speak('en-GB')}><Volume2 size={17}/> UK / {entry.ipaUk}</button><button onClick={() => speak('en-US')}><Volume2 size={17}/> US / {entry.ipaUs}</button></div><div className="definition"><span>本机离线词典</span><strong>{entry.translation}</strong><p>{entry.english}</p></div><button className="underline-button" disabled={underlinedWords.includes(entry.lemma.toLowerCase())} onClick={addUnderline}>{underlinedWords.includes(entry.lemma.toLowerCase()) ? '已划线' : '给单词划线'}</button><button className="save-button" disabled={selectedSaved} onClick={saveCard}><Plus size={17}/>{selectedSaved ? 'Saved to vocabulary' : 'Add to vocabulary'}</button></> : <div className="empty-card"><Languages size={28}/><p>点一下英文词即可查词；拖选一句英文后，可以明确点击按钮分析英文句法。</p></div>}</section>{documentPanel}</aside></section></main>
}
export default App
