import { describe, expect, it } from 'vitest'
import { isTypingTarget, resolveShortcut } from './shortcuts'

describe('键盘快捷键', () => {
  it('单键映射到对应动作，大小写都认', () => {
    expect(resolveShortcut({ key: 'ArrowLeft' })).toBe('prevPage')
    expect(resolveShortcut({ key: 'PageUp' })).toBe('prevPage')
    expect(resolveShortcut({ key: 'ArrowRight' })).toBe('nextPage')
    expect(resolveShortcut({ key: 'PageDown' })).toBe('nextPage')
    expect(resolveShortcut({ key: 'k' })).toBe('speakUk')
    expect(resolveShortcut({ key: 'P' })).toBe('speakUs')
    expect(resolveShortcut({ key: 'u' })).toBe('underline')
    expect(resolveShortcut({ key: 's' })).toBe('save')
    expect(resolveShortcut({ key: 'e' })).toBe('exportCsv')
    expect(resolveShortcut({ key: 'z' })).toBeNull()
  })

  it('带修饰键的组合让给浏览器：Cmd+S 保存网页、Ctrl+P 打印不能被抢走', () => {
    expect(resolveShortcut({ key: 's', metaKey: true })).toBeNull()
    expect(resolveShortcut({ key: 'p', ctrlKey: true })).toBeNull()
    expect(resolveShortcut({ key: 'e', altKey: true })).toBeNull()
    expect(resolveShortcut({ key: 'ArrowRight', shiftKey: true })).toBeNull()
  })

  it('用户正在输入框 / 可编辑区域里打字时，单键快捷键全部让路', () => {
    expect(resolveShortcut({ key: 's', target: { tagName: 'INPUT' } })).toBeNull()
    expect(resolveShortcut({ key: 's', target: { tagName: 'textarea' } })).toBeNull()
    expect(resolveShortcut({ key: 's', target: { tagName: 'SELECT' } })).toBeNull()
    expect(resolveShortcut({ key: 's', target: { tagName: 'DIV', isContentEditable: true } })).toBeNull()
    expect(resolveShortcut({ key: 's', target: { tagName: 'DIV' } })).toBe('save')
  })

  it('isTypingTarget 对 null / 非元素输入不炸', () => {
    expect(isTypingTarget(null)).toBe(false)
    expect(isTypingTarget(undefined)).toBe(false)
    expect(isTypingTarget('INPUT')).toBe(false)
    expect(isTypingTarget({})).toBe(false)
  })
})
