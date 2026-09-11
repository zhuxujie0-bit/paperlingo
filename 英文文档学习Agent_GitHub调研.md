# 英文论文沉浸式阅读与划词学习工具：开发调研与执行规格

更新日期：2026-09-09  
适用目标：将英文 PDF / DOCX 放进网页，在阅读原文时点击或选中不认识的单词，立即看到**结合当前句子的中文意思、词性、英美音标与读音**；用户可选择加入生词本，后续再复习。

---

## 1. 一句话产品定义

这是一个“论文里的划词词典 + 生词本”，不是一开始就做成“万能英语学习 Agent”。

用户的真实闭环是：

```text
上传英文论文
→ 在网页内阅读原文
→ 遇到不认识的词，点击/选中
→ 立刻看到中文释义、音标和读音
→ （可选）加入生词本
→ 以后在复习页再次记忆
```

### 为什么这样定

读论文时最痛的事情是不断在 PDF、浏览器词典、翻译软件之间切换。第一版要消灭的就是这个切换成本。

“AI 自动找重点词、自动出题、RAG 问答、多 Agent”都可以以后加；它们不能抢走“随读随查”的主线。

---

## 2. V1 范围：做什么、不做什么

### V1 必做（验收标准）

1. 支持上传 `.pdf` 与 `.docx`。
2. 将文档解析为可阅读的网页段落，至少保留：文档名、页码、段落序号、原文。
3. 用户选中一个英文词或点击词后，在右侧栏/浮层展示：
   - 原词和 lemma（如 `improves → improve`）；
   - 当前句中的中文解释；
   - 词性；
   - 英式与美式 IPA（缺失时明确显示“暂无”）；
   - 英式与美式播放按钮；
   - 原句、页码；
   - “加入生词本”按钮。
4. 点击“加入生词本”后，保存的是**该词在该句中的词义**，而不只是孤立单词。
5. 有一个“今日复习”页：能显示待复习词，并让用户选择“认识 / 模糊 / 不认识”。
6. 任何词义、音标、音频均显示来源与是否为降级结果；不能把 AI 猜测伪装成权威词典事实。

### V1 暂不做

- 扫描 PDF 的 OCR、复杂双栏/公式/表格的完美还原；
- 自动生成几十张“重点词卡”并强迫用户确认；
- 自动生成大测验、完整 RAG 文档问答、多 Agent；
- 用户登录、多端同步、团队协作、对象存储、异步队列；
- 抓取 Cambridge / Oxford / 有道等网站的释义或音频。

> 先用“有文字层的英文论文 PDF + 标准 DOCX”验证真实阅读体验。复杂 PDF 解析不稳定时，必须在页面说清楚，不要静默给出错页码或错句。

---

## 3. 关键问题：翻译 API 到底要不要接？

### 结论

**要接一个服务端的“中文语境释义”能力。**浏览器本身不能可靠地把英文单词按论文当前句子翻成中文。

但它不是“浏览器直接请求一个翻译 API”这么简单，而应是一个分层词典服务：

```text
用户选中单词
→ 浏览器请求自己的后端 /api/lookup
→ 后端先查本地缓存
→ 没有缓存时：词典来源查 IPA/词性/音频
→ 再调用语境释义提供者，生成当前句的简短中文解释
→ 后端校验 JSON、记录来源、缓存
→ 返回页面
```

API Key 必须只放在服务器 `.env`，绝不能写进前端 JavaScript 或上传到 GitHub。

### 推荐的三层数据策略

| 层 | 负责什么 | V1 建议 | 重要说明 |
|---|---|---|---|
| A. 词典层 | lemma、词性、IPA、英文释义、中文基础释义 | ECDICT 导入本地 SQLite / Postgres，并建立 FTS 检索 | 数据集为 MIT；它没有可靠音频，且基础词义不能替代当前句的语境解释 |
| B. 语境释义层 | “这个词在这句话里是什么意思”的中文解释 | 接一个可切换的 LLM Provider（V1 为 Kimi），通过后端调用 | 用结构化 JSON 返回；不能只返回一段自由文本 |
| C. 发音兜底层 | 缺少录制音频时仍可播放 | 浏览器 Web Speech API | 这是设备语音合成，不等于授权词典录音；口音和质量因系统而异 |

### 为什么不能只用翻译 API

把整句丢进机器翻译可以得到句子译文，但通常不能稳定告诉你：

- 被点击的 `model` 在这句里究竟是“模型”还是“模范”；
- 它是什么词性；
- 原形是什么；
- 英美音标、录制音频是否存在；
- 释义来自哪里、是否可追溯。

因此正确做法是：**词典负责“词的事实”，语境服务负责“这句话里的解释”。**

### 语境释义 API 的请求与返回约束

后端向提供者发送的最小输入：

```json
{
  "word": "framework",
  "sentence": "The proposed framework improves the accuracy of the model.",
  "paragraphContext": "...",
  "targetLanguage": "zh-CN"
}
```

要求提供者严格返回（用 JSON Schema / Structured Outputs 校验）：

```json
{
  "lemma": "framework",
  "partOfSpeech": "noun",
  "contextualChinese": "（本文提出的）方法框架/体系",
  "shortExplanation": "指作者提出的一套方法结构，不是画框的‘框架’。",
  "confidence": "high"
}
```

规则：

- `contextualChinese` 最多 30 个汉字，适合阅读时扫一眼；
- `shortExplanation` 最多 80 个汉字；
- 不让模型编造音标、音频 URL 或词典来源；这些字段只能来自词典层；
- 对模型没有把握的专有名词，返回 `confidence: low`，页面显示“建议查看原句”；
- 缓存键使用 `lemma + sentence_hash + provider_version`，同一句再点不应再次付费；
- 付费 API 的真实调用由产品拥有者明确配置 Key 后才启用；开发/测试阶段只使用 mock 响应和免费健康检查。

### 发音策略

1. V1 的音标、词性、英文基础释义和中文基础释义来自本地 ECDICT；查词不依赖外部免费接口的在线可用性。
2. ECDICT 没有可依赖的发音音频字段，因此不把“词典真人录音”列为 V1 承诺。
3. 点击播放时优先使用浏览器 Web Speech API，并分别尝试本机的 `en-GB` 与 `en-US` voice。
4. 如果设备没有对应语音：禁用相应按钮，提示“此设备暂无英式/美式语音”。
5. 以后接入明确授权的发音服务后，才将其放在浏览器 TTS 之前；页面必须标记实际音频来源。
6. 不能把 TTS 合成语音标成“Oxford / Cambridge 英音”。

> 不将 Free Dictionary API 当作 V1 的基础依赖：它确实能返回 `phonetic`、`phonetics`、`audio` 与 `meanings` 一类字段，但覆盖不保证；实际对 `framework` 的查询返回 IPA 和 noun 释义，却没有音频 URL。它可作为未来的 best-effort 外部补充，不能决定核心功能是否可用。

---

## 4. 推荐技术架构（先小后大）

### V1 推荐组合

```text
前端/服务端：Next.js + TypeScript
页面样式：Tailwind CSS（或 CSS Modules；不追求花哨动效）
PDF 原稿阅读：react-pdf（底层 PDF.js，保留原生可选中文本层）
DOCX 原稿阅读：docx-preview / docxjs（浏览器渲染为 DOM；关闭 `renderAltChunks`）
查词触发与定位：浏览器 Selection / Range + Floating UI
可选“学习模式” DOCX 转换：Mammoth（干净语义 HTML，非原排版）
英文句子与词切分：Intl.Segmenter + 规则；后续可接 spaCy
本地词典：ECDICT CSV 导入 SQLite/Postgres 的 FTS 表
数据库：SQLite + Prisma
语境释义适配器：ContextProvider 接口（先 mock，后接 Kimi）
浏览器发音兜底：Web Speech API
复习调度：ts-fsrs（先在 Phase 4 接入，而非自行实现算法）
测试：Vitest（单元）+ Playwright（真实网页流程）
```

### 为什么不是第一天就用 Docling

Docling 对 OCR、版面分析、表格与复杂 PDF 更强，适合作为第二阶段解析器；但它增加 Python 环境、模型和部署复杂度。V1 先处理有文字层的论文，PDF.js + Mammoth 更容易让“上传 → 可读 → 点词”闭环真正跑起来。

当真实测试发现以下任何一个问题时，再新增 `DoclingParser`：

- 双栏论文文字阅读顺序错乱；
- PDF 没有文字层；
- 段落与页码对应关系不可信；
- DOCX 中有复杂表格/图文混排而 Mammoth 丢失关键信息。

### 核心接口（避免以后被单个 API 锁死）

```ts
export interface DictionaryProvider {
  lookup(word: string): Promise<{
    lemma?: string;
    ipaUk?: string;
    ipaUs?: string;
    audioUkUrl?: string;
    audioUsUrl?: string;
    meanings: Array<{ partOfSpeech?: string; englishDefinition?: string }>;
    source: string;
    licenseNote?: string;
  }>;
}

export interface ContextProvider {
  explain(input: {
    word: string;
    sentence: string;
    paragraphContext?: string;
  }): Promise<{
    lemma: string;
    partOfSpeech?: string;
    contextualChinese: string;
    shortExplanation?: string;
    confidence: "high" | "medium" | "low";
    provider: string;
  }>;
}
```

这样以后可在不改阅读器页面的前提下替换：免费原型 → DeepL / Google Cloud Translation / 某个 LLM → 自建词典数据。

---

## 5. 页面与交互规格

```text
┌─────────────┬─────────────────────────────────────────┬─────────────────────┐
│ 文档列表     │ 原文阅读区                                │ 查词侧栏             │
│             │                                         │                     │
│ • paper.pdf │ The proposed [framework] improves ...  │ framework           │
│ • report... │                                         │ noun                │
│             │ 点击/选中一个词                           │ UK /.../   [播放]    │
│             │                                         │ US /.../   [播放]    │
│             │                                         │ 本句：方法框架/体系   │
│             │                                         │ 原句 + 第 3 页        │
│             │                                         │ [加入生词本]          │
└─────────────┴─────────────────────────────────────────┴─────────────────────┘
```

### 阅读交互细节

- 默认只把正文渲染为正常文本，不能所有词都蓝色加下划线；
- 支持两种查词方式：点击单词、鼠标拖选一个词后出现“查询”小浮钮；
- 过滤纯数字、标点、长度小于 2 的片段；
- 连字符词（如 `fine-grained`）优先整体查询，失败后再尝试拆分；
- 选中的是 `models` 时，页面显示原词 `models`，查词优先使用 lemma `model`；
- 每张查词卡必须显示原句和页码；
- 查询中显示 skeleton/loading；失败时给“重试”按钮，不清空用户选中的词；
- 加入生词本后按钮变为“已加入”，但允许“保存为另一个语境”。

---

## 6. 数据模型（SQLite / Prisma）

```text
Document
- id, filename, mimeType, createdAt
- parserName, parserVersion, parseStatus, errorMessage

Paragraph
- id, documentId, pageNumber, orderIndex
- originalText, normalizedText

LookupCache
- id, lemma, sentenceHash, dictionaryProvider, contextProvider
- payloadJson, createdAt, expiresAt

VocabularyCard
- id, documentId, paragraphId
- surfaceWord, lemma, partOfSpeech
- contextualChinese, ipaUk, ipaUs
- audioUkUrl, audioUsUrl, pronunciationSource
- sourceSentence, pageNumber
- dictionarySource, contextProvider, confidence
- createdAt, archivedAt

ReviewLog
- id, vocabularyCardId, reviewedAt
- rating: AGAIN | HARD | GOOD | EASY
- nextReviewAt
```

关键原则：`VocabularyCard` 不只存 `lemma`。同一个英文词在不同论文、不同句子里可能有不同含义，必须保存原句、页码与当时的释义版本。

---

## 7. API 设计

```text
POST /api/documents
  上传 PDF / DOCX，返回 documentId 和 parseStatus

GET /api/documents/:id
  返回文档元数据和段落（每段带 pageNumber）

POST /api/lookup
  入参：documentId, paragraphId, word, sentence
  出参：词典事实 + 语境中文解释 + 结果来源 + 缓存状态

POST /api/vocabulary
  将一次 lookup 保存为生词卡

GET /api/reviews/today
  返回今日待复习卡

POST /api/reviews/:cardId
  入参：rating
  更新 review log 与 nextReviewAt
```

`POST /api/lookup` 的第一个版本必须支持 `MOCK_CONTEXT_PROVIDER=true`：不调用任何付费 API，固定返回可预测 JSON，用于前端、缓存、存卡与错误路径测试。

---

## 8. 可以借鉴什么：借流程，不盲目 fork

| 项目/技术 | 借鉴内容 | 不要直接照搬的部分 |
|---|---|---|
| [mozilla/pdf.js](https://github.com/mozilla/pdf.js) | PDF 文本层、按页抽取文字、页码映射思路 | 不要试图在 V1 像 Adobe 一样完美还原所有复杂 PDF |
| [microsoft/markitdown](https://github.com/microsoft/markitdown) | 多格式文档转 Markdown 的输入适配思路 | 它不是交互阅读器，且 Markdown 转换可能丢失精确位置 |
| [docling-project/docling](https://github.com/docling-project/docling) | OCR、复杂版面、结构化文档表示；作为解析升级路线 | 不要在 V1 为少量文字型 PDF 引入重型解析基础设施 |
| [Nutlope/pdf-to-interactive-lesson](https://github.com/Nutlope/pdf-to-interactive-lesson) | 上传、后台处理、课程/测验产品流程的参考 | 不把它当作词典、发音、DOCX 或生产服务底座；先核对自身复用范围的许可证 |
| [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | 第二阶段的间隔复习计算与 review log 设计 | V1 先做简单“今日复习”规则，真实积累数据后再接 FSRS |
| [openai/openai-structured-outputs-samples](https://github.com/openai/openai-structured-outputs-samples) | 用 JSON Schema 约束语境释义和题目格式 | 不让模型产出的音标、音频、许可信息混入词典事实 |
| [explosion/spaCy](https://github.com/explosion/spaCy) | 第二阶段 lemma、词性、句子切分、过滤功能词 | 不把 spaCy 当成“重点词判定器” |

截至本文件更新时，MarkItDown、Docling 与 ts-fsrs 的 GitHub API 仓库信息均显示 MIT 许可证；真正复用代码或发布前仍须再核对仓库 LICENSE、依赖和模型许可证。

### 已核验的完整阅读器：为什么只参考、不直接 fork

- [Koodo Reader](https://github.com/koodo-reader/koodo-reader) 是目前与目标最接近的完整参考：PDF/DOCX 导入、选词词典、AI 翻译、标注、词汇同步等均已存在，React 技术栈也相近。但它是 **AGPL-3.0** 且以 Electron 桌面端为主。若未来做对外网页产品，直接 fork/修改会触发网络服务的开源义务；因此只研究它的能力边界、交互和离线 MDX 词典流程，不复制核心代码。
- [Readest](https://github.com/readest/readest) 的阅读、词典、笔记交互很值得作为 UI 参考，且有网页端；同样为 **AGPL-3.0**，且文档格式重点不含 DOCX，因此不作为代码底座。
- [Hypothesis client](https://github.com/hypothesis/client) 为 BSD-2-Clause，适合日后研究“重渲染后高亮仍能定位”的文本锚定策略；它是协作批注客户端，不包含 PDF/DOCX 导入和个人词汇学习闭环。
- [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) 为 MIT，提供 PDF 选区、高亮、popover、滚动回定位的快捷能力。若 MVP 的重点是“拖选论文文本后立即查词/记笔记”，可以先采用它；它版本活跃度较低且处于 RC 路线，须锁定版本并用真实论文验证。长期可换回 react-pdf + 原生 Selection / Range。

**最终代码策略：不 fork 大型完整阅读器。**新建一个干净的 Next.js 网页项目，组合 Apache-2.0/MIT 的 react-pdf/PDF.js、docx-preview、Floating UI、ECDICT、ts-fsrs；将 Koodo、Readest、Lute、Agent Reader 作为产品和实现参考。

---

## 9. 分阶段开发清单

### Phase 0：先验证技术风险（0.5–1 天）

目标：不写完整产品，先证明最关键的三件事。

- [ ] 找 3 份真实英文论文：单栏 PDF、双栏 PDF、DOCX；
- [ ] 用 PDF.js 抽取每页文本，人工核对第 1、3、最后一页的阅读顺序；
- [ ] 用 Mammoth 抽取 DOCX，核对段落内容；
- [ ] 用 Free Dictionary API 试查至少 30 个论文常见词，记录 IPA、音频 URL 缺失率、词性质量；
- [ ] 在目标浏览器检查 Web Speech API 是否能列出英式和美式 voices；
- [ ] 不配置任何付费 API Key；语境解释仅使用 mock JSON。

通过标准：3 份文档中，至少 2 份可正确阅读；已验证“缺词典音频 → 系统朗读”的降级能实际播放。

### Phase 1：阅读器骨架（1–2 天）

- [ ] 初始化 Next.js + TypeScript 项目；
- [ ] 创建上传页与阅读页；
- [ ] 实现 PDF/DOCX 的解析适配器，统一输出 `Paragraph[]`；
- [ ] SQLite 保存 Document、Paragraph；
- [ ] 阅读页按段落显示、带页码；
- [ ] 写测试：PDF/DOCX 解析结果必须保留非空文本和有效页码。

通过标准：上传真实 PDF 后刷新页面，仍能读取已保存的文档段落与页码。

### Phase 2：点击单词与查词卡（1–2 天）

- [ ] 使用 `Intl.Segmenter` 将段落中的英文词变成可点击 token；
- [ ] 实现选择/点击词 → 打开右侧查词栏；
- [ ] 实现 `DictionaryProvider`，先接免费原型来源；
- [ ] 实现 `/api/lookup` 的缓存逻辑；
- [ ] 实现 browser speech fallback；
- [ ] 写测试：`models` 传入后 UI 保留 surface word，服务层可查 lemma；缺音频时必须返回 fallback 状态。

通过标准：从一份真实论文中连续点 10 个单词，侧栏不会错位，且每张卡都有原句与页码。

### Phase 3：语境中文解释（1 天）

- [ ] 先实现 MockContextProvider；
- [ ] 定义并测试 JSON Schema；
- [ ] 配置 `ContextProvider` 环境变量和适配器，不在页面泄露 Key；
- [ ] 接入前先由产品拥有者自行配置 API Key 并明确成本；
- [ ] 加入缓存、限流、失败重试与“低置信度”展示；
- [ ] 使用 30 个真实论文词例，人工检查中文释义是否匹配当前句。

通过标准：同一个词在不同句子中，页面能保存不同的语境解释；同一句重复点不触发第二次付费请求。

### Phase 4：生词本与简单复习（1 天）

- [ ] 新建 VocabularyCard、ReviewLog；
- [ ] 实现“加入生词本 / 已加入 / 保存另一语境”；
- [ ] 实现今日复习队列；
- [ ] 初版规则：Again=明天、Hard=3 天后、Good=7 天后、Easy=14 天后；
- [ ] 写集成测试：存卡 → 出现在今日队列 → 评分 → 下次日期变化。

通过标准：从真实论文加入 10 个词后，可以完整走通一次复习。

### Phase 5：真实验收与决定是否扩展（至少 3 天真实使用）

- [ ] 实际读 3 篇英文论文；
- [ ] 记录查了多少词、成功率、失败原因、释义是否准确；
- [ ] 对每个错误留“原句 + 页面截图/录屏证据 + 预期结果”；
- [ ] 根据真实问题决定是否上 Docling、spaCy、FSRS 或自动难词标注。

不以“做了多少页面”验收；以“读论文时是否减少切换、释义是否可信、是否愿意保存生词”验收。

---

## 10. 测试与真实验证标准

### 自动化测试

- 单元测试：token 切分、lemma 归一化、缓存键、音频 fallback、复习日期；
- API 测试：文件类型/大小限制、解析失败、词典无结果、语境 API 超时、JSON Schema 无效；
- Playwright：上传 fixture PDF → 进入阅读页 → 点 `framework` → 出现释义卡 → 加入生词本 → 在复习页找到它。

### 人工真实数据验收

不要只用一段手写英文 lorem ipsum。至少使用：

1. 一份单栏英文论文 PDF；
2. 一份双栏英文论文 PDF；
3. 一份英文 DOCX；
4. 30 个来自这三份文件的真实查词样本；
5. 10 个加入生词本并完成一次复习的样本。

记录表建议：

```text
文档 | 页码 | 单词 | 原句 | IPA是否存在 | 音频/系统朗读是否成功 | 中文语境释义是否正确 | 是否加入生词本 | 备注
```

---

## 11. 风险与决策门

| 风险 | 处理方式 | 决策点 |
|---|---|---|
| 双栏 PDF 阅读顺序错 | V1 提示“复杂版式可能不完整”；收集真实失败文件 | 失败影响超过 20% 样本后接 Docling |
| 词典没有音频 | 显示 IPA + Web Speech fallback | 正式上线前选择授权音频供应商 |
| 中文释义不符合语境 | 原句强绑定、用户可反馈/编辑、低置信提示 | 30 词人工准确率不足 85% 时调整 prompt/provider |
| API 成本失控 | 只在点击时调用；服务端缓存、限流、每日预算 | 达到真实使用量后再比较付费 API 单价 |
| API Key 泄露 | 后端环境变量、`.env` 加 `.gitignore`、不在客户端调用 | 上线前做 secret scan |
| 词典版权/授权不清 | 原型与正式产品分开；保存来源和许可字段 | 对外发布前完成供应商/许可审查 |

---

## 12. 后续路线（仅当 V1 被真实使用证明有效）

1. 自动标记可能较难的词，但只能作为“建议”，不能替代用户点击；
2. 从用户已确认的生词卡生成小测；
3. 采用 ts-fsrs 替换初版固定间隔复习；
4. Docling OCR 和复杂 PDF 版面解析；
5. 论文段落问答、术语解释、用户个人词汇掌握度；
6. 登录、多端同步、对象存储与任务队列。

---

## 13. 开发前的最终决策

开始编码时按以下默认值执行：

```text
产品主线：阅读中划词，而非 AI 预选词
技术栈：Next.js + TypeScript + SQLite + Prisma
输入范围：有文字层的 PDF / 标准 DOCX
发音：词典音频优先，Web Speech API 兜底
中文释义：后端 ContextProvider；先 mock，Key 由产品拥有者明确配置后才开启真实付费调用
数据原则：每一张生词卡永远保留原句、页码、词典来源和语境服务来源
```

## Sources

- PDF.js：https://github.com/mozilla/pdf.js
- MarkItDown：https://github.com/microsoft/markitdown
- Docling：https://github.com/docling-project/docling
- Free Dictionary API：https://dictionaryapi.dev/
- Web Speech API（MDN）：https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- OpenAI Structured Outputs：https://developers.openai.com/api/docs/guides/structured-outputs
- ts-fsrs：https://github.com/open-spaced-repetition/ts-fsrs
- ECDICT：https://github.com/skywind3000/ECDICT
- React-PDF：https://github.com/wojtekmaj/react-pdf
- docx-preview / docxjs：https://github.com/VolodymyrBaydalka/docxjs
- Floating UI：https://github.com/floating-ui/floating-ui
- Koodo Reader（AGPL，仅参考）：https://github.com/koodo-reader/koodo-reader
- Readest（AGPL，仅参考）：https://github.com/readest/readest
- Hypothesis client：https://github.com/hypothesis/client
- react-pdf-highlighter：https://github.com/agentcooper/react-pdf-highlighter
- Nutlope/pdf-to-interactive-lesson：https://github.com/Nutlope/pdf-to-interactive-lesson
- spaCy：https://github.com/explosion/spaCy
