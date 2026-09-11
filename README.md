# Ella 的学习小屋（PaperLingo）

一个可以在平板 / 手机 / 电脑上"点开就用"的英文论文划词学习器。
**查词、发音、句法分析全部在本机完成，不联网、不花钱、不需要任何 API Key。**

## 在线版（推荐给平板）

打开 GitHub Pages 地址后，浏览器菜单选"添加到主屏幕"，桌面出现蝴蝶结图标，点开即全屏使用：

```
https://zhuxujie0-bit.github.io/paperlingo/
```

- 首次打开需要联网（下载网页本体）
- 查词时按需下载对应词典分块（几十 KB～2MB），查过即缓存在设备里，之后离线可查
- 发音使用设备自带语音引擎（vivo / iPad / Mac 都可以）
- 句法分析由浏览器内置的 compromise.js 完成；整句翻译走免费的 MyMemory 接口（无需 Key，离线时只给结构分析）

## 功能

- PDF / DOCX 上传阅读（react-pdf / docx-preview，DOCX 已关闭 altChunk 渲染）
- 拖选单词自动查词：内置演示词典 + ECDICT 全量离线词典（75 万词条，按双字母分块 + IndexedDB 缓存）
- 拖选句子后可手动点击"分析句法"（本机免费）：主句/从句拆解、谓语动词、整句中文翻译
- 设备自带语音朗读（英式 / 美式）
- 手动给单词划线（不会自动高亮）
- 本机浏览器 localStorage 生词本
- PWA：可添加到主屏幕、Service Worker 离线缓存

## 本地开发（Mac）

1. 双击 `启动 PaperLingo.command`
2. 浏览器打开 http://127.0.0.1:5173
3. 同一 Wi-Fi 下，平板可直接访问 `http://<Mac的IP>:5173`

## 架构说明

- 前端：React 19 + Vite，构建后为纯静态文件，部署在 GitHub Pages
- 词典：`data/ecdict.sqlite`（94MB，不入库）→ `scripts/export_dictionary_chunks.py` 切成 701 个双字母 JSON 分块（共 60MB，在 `public/dict/`），浏览器按需 fetch + IndexedDB 缓存
- 发音：Web Speech API（设备自带 TTS）；开发模式下备用 Mac `say` 命令
- 句法分析：compromise.js 本机拆解 + MyMemory 免费翻译兜底；**不接 Kimi / 不接任何付费 API**
- PWA：`public/manifest.webmanifest` + `public/sw.js`（缓存优先策略）
- 图标：`scripts/generate_pwa_icons.py` 生成的原创蝴蝶结图标（无 Sanrio 素材）

## 验证命令

```bash
npm run build
npx vitest run src/lib/dictionary.test.ts
```

## 当前边界

- 扫描版 PDF 没有文字层，无法划词（需要 OCR，未做）
- 整句翻译依赖 MyMemory 免费接口，有频率限制；离线时自动跳过
- 本机句法分析是规则 + 统计的浅层分析，不如大模型细致，但免费、即时、隐私
