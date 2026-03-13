import { beforeEach, describe, expect, test } from 'vitest'

import { StreamParser } from '@/lib/ai/stream-parser'

describe('StreamParser', () => {
  let parser: StreamParser

  beforeEach(() => {
    parser = new StreamParser()
  })

  test('plain text passes through as visibleText', () => {
    const result = parser.push('hello world')
    expect(result.visibleText).toBe('hello world')
    expect(result.htmlDelta).toBe('')
    expect(result.cssDelta).toBe('')
  })

  test('html content is routed to htmlDelta', () => {
    const result = parser.push('<lumio-ai-html><main>Hello</main></lumio-ai-html>')
    expect(result.htmlDelta).toBe('<main>Hello</main>')
    expect(result.visibleText).toBe('')
    expect(result.cssDelta).toBe('')
  })

  test('css content is routed to cssDelta', () => {
    const result = parser.push('<lumio-ai-css>body { color: red; }</lumio-ai-css>')
    expect(result.cssDelta).toBe('body { color: red; }')
    expect(result.visibleText).toBe('')
    expect(result.htmlDelta).toBe('')
  })

  test('lumio tag content never leaks to visibleText', () => {
    const result = parser.push('Before<lumio-ai-html>SECRET</lumio-ai-html>After')
    expect(result.visibleText).toBe('BeforeAfter')
    expect(result.htmlDelta).toBe('SECRET')
  })

  test('handles opening tag split across two chunks', () => {
    const r1 = parser.push('<lumio-ai-')
    // Still buffering — nothing flushed to visible yet
    expect(r1.visibleText).toBe('')
    expect(r1.htmlDelta).toBe('')

    const r2 = parser.push('html>content</lumio-ai-html>')
    expect(r2.htmlDelta).toBe('content')
    expect(r2.visibleText).toBe('')
  })

  test('handles closing tag split across two chunks', () => {
    // 'data' is emitted immediately in the first push (IN_HTML state).
    const r0 = parser.push('<lumio-ai-html>data')
    expect(r0.htmlDelta).toBe('data')

    // Second push only buffers the partial close tag — nothing new emitted yet.
    const r1 = parser.push('</lumio-ai-')
    expect(r1.htmlDelta).toBe('')

    // Third push completes the close tag — transitions back to TEXT, no content.
    const r2 = parser.push('html>')
    expect(r2.htmlDelta).toBe('')
    expect(r2.visibleText).toBe('')
  })

  test('non-lumio html tags pass through as visible text', () => {
    const result = parser.push('<div class="hero">hello</div>')
    expect(result.visibleText).toBe('<div class="hero">hello</div>')
    expect(result.htmlDelta).toBe('')
  })

  test('mixed content: text + html block + text in one chunk', () => {
    const result = parser.push('Intro <lumio-ai-html><h1>Title</h1></lumio-ai-html> Done')
    expect(result.visibleText).toBe('Intro  Done')
    expect(result.htmlDelta).toBe('<h1>Title</h1>')
  })

  test('flush returns pending partial tag buffer as visible text', () => {
    parser.push('<lumio-ai-') // partial tag stays in buffer
    const result = parser.flush()
    expect(result.visibleText).toBe('<lumio-ai-')
    expect(result.htmlDelta).toBe('')
  })

  test('handles multiple blocks across sequential pushes', () => {
    const r1 = parser.push('<lumio-ai-html><div/></lumio-ai-html>')
    const r2 = parser.push('<lumio-ai-css>h1 {}</lumio-ai-css>')
    const r3 = parser.push('visible text')

    expect(r1.htmlDelta).toBe('<div/>')
    expect(r2.cssDelta).toBe('h1 {}')
    expect(r3.visibleText).toBe('visible text')
  })

  test('reset clears state so parser can be reused', () => {
    parser.push('<lumio-ai-html>start')
    parser.reset()
    const result = parser.push('clean text')
    expect(result.visibleText).toBe('clean text')
    expect(result.htmlDelta).toBe('')
  })

  test('content after closing tag is visible', () => {
    const r1 = parser.push('<lumio-ai-html>html content</lumio-ai-html>')
    const r2 = parser.push(' assistant reply here')
    expect(r1.visibleText).toBe('')
    expect(r2.visibleText).toBe(' assistant reply here')
  })
})
