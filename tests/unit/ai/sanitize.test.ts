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
