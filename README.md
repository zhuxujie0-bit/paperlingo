# PaperLingo

在平板 / 手机 / 电脑上"点开就用"的**英文论文与课程材料阅读学习工具**。
读英文 PDF / DOCX 时划词查词、拆解长句句法、听发音、攒生词本并导出成 Anki 卡片。
**查词、发音、句法分析全部在本机完成，不联网也能用，不需要任何 API Key。**

## 在线版

```
https://zhuxujie0-bit.github.io/paperlingo/
```

浏览器菜单选"添加到主屏幕"，即可当成独立 App 全屏使用。

- 首次打开需要联网（下载网页本体）
- 查词时按需下载对应词典分块（几十 KB～2MB），查过即缓存在设备里，之后离线可查
- 发音使用设备自带语音引擎（Android / iPad / Mac 都可以）
- 句法分析由浏览器内置的 compromise.js 完成；整句翻译走免费的 MyMemory 接口（无需 Key，离线时只给结构分析）

## 功能

- **PDF / DOCX 阅读**：react-pdf / docx-preview，DOCX 已关闭 altChunk 渲染
- **划词 / 点词查词**：内置演示词典 + ECDICT 全量离线词典（75 万词条，按双字母分块 + IndexedDB 缓存）
- **句法拆解**：拖选一句英文后手动点击"分析句法"，给出主句 / 从句拆解、谓语动词、整句中文翻译
- **发音**：设备自带语音朗读（英式 / 美式），本机语音无响应时自动切在线 TTS 兜底
- **手动划线**：只有你点按钮才会划线，不会自动高亮
- **生词本 + 导出**：生词存在本机 localStorage，可一键导出为 **CSV**（Excel / Numbers 直接打开，带 UTF-8 BOM）或 **Anki 兼容 TSV**（正面=单词 / 背面=词性·释义·音标·例句 / 标签=paperlingo）
- **阅读进度记忆**：同一份 PDF 再次打开时自动回到上次读到的那一页（按文件名 + 字节数区分版本）
- **键盘快捷键**：`←` `→` / `PageUp` `PageDown` 翻页，`K` / `P` 英式 / 美式发音，`U` 划线，`S` 存入生词本，`E` 导出 CSV（在输入框里打字或按住 Cmd / Ctrl 时自动让路）
- **PWA**：可添加到主屏幕、Service Worker 离线缓存

## 本地开发

```bash
npm install
npm run dev
```

1. 浏览器打开 http://127.0.0.1:5173
2. 同一 Wi-Fi 下，平板可直接访问 `http://<电脑的IP>:5173`

## 架构说明

- 前端：React 19 + Vite，构建后为纯静态文件，部署在 GitHub Pages
- 词典：`data/ecdict.sqlite`（94MB，不入库）→ `scripts/export_dictionary_chunks.py` 切成 701 个双字母 JSON 分块（共 60MB，在 `public/dict/`），浏览器按需 fetch + IndexedDB 缓存
- 发音：Web Speech API（设备自带 TTS）；失败时回退在线免费 TTS
- 句法分析：compromise.js 本机拆解 + MyMemory 免费翻译兜底；**不接任何付费 API**
- 导出：`src/lib/vocabularyExport.ts` 在浏览器里生成 Blob 下载，数据不经过任何服务器；CSV / TSV 均做了转义与表格公式注入（`=` `+` `-` `@` 开头）钝化
- PWA：`public/manifest.webmanifest` + `public/sw.js`（缓存优先策略）
- 可选后端：`server.mjs` 是一个**本机开发用的可选代理**（`npm run dev:api`），用于试验服务端转发与提示词注入防护；线上 GitHub Pages 版本不使用它，核心功能不依赖任何 API Key

### 存储键的向后兼容

IndexedDB 库名 `ella-dict-cache` 与 localStorage 前缀 `ella-manual-underlines:v1` 沿用了改名前的旧前缀，**刻意不改**：
改名会让老用户已缓存的词典分块（最多 60MB）失效、需要重下，划线记录也会全部读不出来。
这两个键只存在于本机、对用户不可见，所以用"名字不好看"换取向后兼容。新增的键一律用 `paperlingo-` 前缀。

## 验证命令

```bash
npm run lint
npm test
npm run build
```

## 当前边界

- 扫描版 PDF 没有文字层，无法划词（需要 OCR，未做）
- 整句翻译依赖 MyMemory 免费接口，有频率限制；离线时自动跳过，只给本机结构分析
- 本机句法分析是规则 + 统计的浅层分析，不如大模型细致，但免费、即时、隐私
- 阅读进度只记 PDF 的页码，DOCX 模式未做
- 暂无深色模式
