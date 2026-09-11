# PaperLingo 本地原型

一个在本机浏览器中运行的英文论文划词学习器。

## 已真实跑通

- PDF 上传和第 1 页渲染（React-PDF / PDF.js）
- DOCX 本地渲染（docx-preview；关闭 `renderAltChunks`）
- 示例论文一键点词
- 离线演示词典：中文基础释义、IPA、词性
- 浏览器系统英式/美式朗读
- 本机浏览器 `localStorage` 生词本
- Kimi 语境解释 UI mock：**不调用 Kimi，不会产生 API 成本**

## 怎么启动

1. 在 Finder 打开此文件夹。
2. 双击 `启动 PaperLingo.command`。
3. 浏览器打开 http://127.0.0.1:5173
4. 点击示例里的绿色单词体验；或上传你自己的有文字层 PDF / DOCX。

关闭终端窗口后网页会停止。下次重新双击启动文件即可。

## 当前边界

- 离线词典目前是论文常见词演示集；下一步应导入完整 MIT ECDICT CSV 到 SQLite/IndexedDB。
- PDF 支持原生文字选择；扫描 PDF 没有文字层时无法划词，需要后续 OCR。
- DOCX 已安全关闭 Word 内嵌 HTML `altChunk` 渲染。
- Kimi 尚未接入真实 Key，避免未获确认的付费 API 调用。

## 验证命令

```bash
npm run build
npx vitest run src/lib/dictionary.test.ts
```

测试只有两条，按项目要求覆盖：
1. 第一性原理：词形变化可以回到原形并返回离线中文释义；
2. 对抗测试：HTML 注入形选区和纯数字不会进入词典。
