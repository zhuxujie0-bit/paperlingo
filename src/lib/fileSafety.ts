const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024

export type LocalDocumentMeta = { name: string; size: number }

export function validateLocalDocument(file: LocalDocumentMeta): string | null {
  const normalizedName = file.name.trim().toLowerCase()
  if (!normalizedName.endsWith('.pdf') && !normalizedName.endsWith('.docx')) {
    return '只支持 PDF 或 DOCX 文件。'
  }
  if (file.size <= 0) return '文件为空，无法解析。'
  if (file.size > MAX_DOCUMENT_BYTES) return '文件大小超过 12MB 上限，为保护浏览器已拒绝解析。'
  return null
}
