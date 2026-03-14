import { describe, expect, test, vi } from 'vitest'

import { sanitizeAiCss, sanitizeAiHtml } from '@/lib/ai/sanitize'

describe('sanitizeAiHtml', () => {
  test('removes unsupported url protocols from links', () => {
    const result = sanitizeAiHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>')

    expect(result).toContain('<a>x</a>')
    expect(result).not.toContain('href=')
  })

  test('keeps allowed url protocols on links', () => {
    const result = sanitizeAiHtml('<a href="https://example.com">x</a>')

    expect(result).toContain('href="https://example.com"')
  })

  test('preserves inline style attributes on elements', () => {
    const result = sanitizeAiHtml('<div style="padding:16px;background:#fff;">hello</div>')

    expect(result).toContain('style=')
    expect(result).toContain('padding:16px')
    expect(result).toContain('background:#fff')
  })

  test('preserves complex inline styles on nested elements', () => {
    const result = sanitizeAiHtml(
      '<section style="padding:80px 32px;background:#f9fafb;"><h2 style="font-size:2.5rem;font-weight:800;color:#111;">Title</h2></section>'
    )

    expect(result).toContain('padding:80px 32px')
    expect(result).toContain('font-size:2.5rem')
  })

  test('strips expression() from style attribute values', () => {
    const result = sanitizeAiHtml('<div style="width: expression(alert(1));">hi</div>')

    expect(result).not.toContain('expression')
    expect(result).toContain('width:')
  })

  test('strips javascript: urls from style attribute values', () => {
    const result = sanitizeAiHtml('<div style="background:url(javascript:alert(1));">hi</div>')

    expect(result).not.toContain('javascript')
  })

  test('strips -moz-binding from style attribute values', () => {
    const result = sanitizeAiHtml('<div style="-moz-binding: url(evil.xml#xss);">hi</div>')

    expect(result).not.toContain('-moz-binding')
  })

  test('strips behavior from style attribute values', () => {
    const result = sanitizeAiHtml('<div style="behavior: url(evil.htc);">hi</div>')

    expect(result).not.toContain('behavior')
  })

  test('preserves video and source tags', () => {
    const result = sanitizeAiHtml('<video controls style="max-width:100%;"><source src="video.mp4" type="video/mp4"></video>')

    expect(result).toContain('<video')
    expect(result).toContain('controls')
    expect(result).toContain('<source')
    expect(result).toContain('src="video.mp4"')
  })

  test('strips @font-face blocks from ai css', () => {
    const input = 'body{color:red;}@font-face{font-family:"X";src:url("https://evil.example/f.woff2")}p{margin:0}'
    const result = sanitizeAiCss(input)
    expect(result).not.toContain('@font-face')
    expect(result).toContain('body{color:red;}')
    expect(result).toContain('p{margin:0}')
  })

  test('escapes html when DOMParser is unavailable', () => {
    const originalDOMParser = globalThis.DOMParser

    vi.stubGlobal('DOMParser', undefined)

    const result = sanitizeAiHtml('<script>alert(1)</script><section>ok</section>')

    expect(result).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(result).toContain('&lt;section&gt;ok&lt;/section&gt;')

    vi.stubGlobal('DOMParser', originalDOMParser)
  })
})
