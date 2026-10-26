// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { clampPage, progressKey, readProgress, saveProgress } from './readingProgress'

describe('阅读进度记忆', () => {
  beforeEach(() => localStorage.clear())

  it('键把文件名和字节数都带上：同名但不同版本的论文不会串页', () => {
    expect(progressKey('paper.pdf', 123)).not.toBe(progressKey('paper.pdf', 456))
    expect(progressKey('paper.pdf', 123)).toBe(progressKey('paper.pdf', 123))
  })

  it('存了多少页就回到多少页', () => {
    const key = progressKey('paper.pdf', 10)
    saveProgress(key, 7)

    expect(readProgress(key, 20)).toBe(7)
  })

  it('没读过的文档从第 1 页开始', () => {
    expect(readProgress(progressKey('new.pdf', 1), 30)).toBe(1)
  })

  it('页码越界或被手改坏时夹回有效范围，不会渲染空白页', () => {
    expect(clampPage(99, 12)).toBe(12) // 文件换成了页数更少的版本
    expect(clampPage(0, 12)).toBe(1)
    expect(clampPage(-3, 12)).toBe(1)
    expect(clampPage('abc', 12)).toBe(1)
    expect(clampPage(null, 12)).toBe(1)
    expect(clampPage(undefined, 12)).toBe(1)
    expect(clampPage(3.7, 12)).toBe(3)
    expect(clampPage(5, 0)).toBe(1) // 文本还没提取出来
  })
})
