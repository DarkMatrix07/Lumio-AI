import { describe, expect, test, vi } from 'vitest'

import { applyAiInjection, createUndoCheckpoint } from '@/lib/ai/injection-service'

describe('injection-service', () => {
  test('creates pre-injection checkpoint via undo manager boundary', () => {
    const stop = vi.fn()
    const start = vi.fn()

    createUndoCheckpoint({
      UndoManager: { stop, start },
    })

    expect(stop).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(1)
  })

  test('append mode preserves existing content', () => {
    const result = applyAiInjection({
      existingHtml: '<main>Old</main>',
      existingCss: 'main{color:black;}',
      incomingHtml: '<footer>New</footer>',
      incomingCss: 'footer{color:white;}',
      confidence: 0.9,
      mode: 'append',
    })

    expect(result.requiresConfirmation).toBe(false)
    expect(result.html).toContain('<main>Old</main>')
    expect(result.html).toContain('<footer>New</footer>')
    expect(result.css).toContain('main{color:black;}')
    expect(result.css).toContain('footer{color:white;}')
  })

  test('low-confidence replace requires confirmation', () => {
    const result = applyAiInjection({
      existingHtml: '<main>Keep</main>',
      existingCss: 'main{color:black;}',
      incomingHtml: '<main>Replace</main>',
      incomingCss: 'main{color:red;}',
      confidence: 0.2,
      mode: 'replace',
    })

    expect(result.requiresConfirmation).toBe(true)
    expect(result.html).toBe('<main>Keep</main>')
    expect(result.css).toBe('main{color:black;}')
  })

  test('sanitizes unsafe html and css from ai content', () => {
    const result = applyAiInjection({
      existingHtml: '<main>Safe</main>',
      existingCss: 'main{color:black;}',
      incomingHtml: '<section onclick="alert(1)">ok</section><script>alert(1)</script>',
      incomingCss: 'body{color:red;}@import url("https://evil")',
      confidence: 0.9,
      mode: 'replace',
    })

    expect(result.requiresConfirmation).toBe(false)
    expect(result.html).toContain('<section')
    expect(result.html).not.toContain('onclick=')
    expect(result.html).not.toContain('<script')
    expect(result.css).toContain('body{color:red;}')
    expect(result.css).not.toContain('@import')
  })
})
