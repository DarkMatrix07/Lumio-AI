import { describe, expect, test } from 'vitest'

import { buildGenerationPrompt } from '@/lib/ai/prompt-builder'

describe('buildGenerationPrompt', () => {
  test('includes canvasHtml in the output', () => {
    const prompt = buildGenerationPrompt({
      userPrompt: 'Add a footer',
      canvasHtml: '<main>existing content</main>',
      canvasCss:  'main { color: red; }',
    })
    expect(prompt).toContain('<main>existing content</main>')
  })

  test('includes canvasCss in the output', () => {
    const prompt = buildGenerationPrompt({
      userPrompt: 'Add a footer',
      canvasHtml: '<main/>',
      canvasCss:  'main { color: red; }',
    })
    expect(prompt).toContain('main { color: red; }')
  })

  test('instructs model to modify existing canvas, not regenerate', () => {
    const prompt = buildGenerationPrompt({
      userPrompt: 'Add a footer',
      canvasHtml: '<main/>',
      canvasCss:  '',
    })
    // Must contain explicit "modify" or "existing" instruction
    expect(prompt).toMatch(/modify|existing/i)
    expect(prompt).toMatch(/do not.*scratch|not.*regenerate/i)
  })

  test('includes the user prompt verbatim', () => {
    const prompt = buildGenerationPrompt({
      userPrompt: 'Add a blue sticky navbar with logo',
      canvasHtml: '',
      canvasCss:  '',
    })
    expect(prompt).toContain('Add a blue sticky navbar with logo')
  })

  test('includes lumio output tag names so model knows the format', () => {
    const prompt = buildGenerationPrompt({
      userPrompt: 'anything',
      canvasHtml: '',
      canvasCss:  '',
    })
    expect(prompt).toContain('<lumio-ai-html>')
    expect(prompt).toContain('<lumio-ai-css>')
  })

  test('handles empty canvas gracefully without throwing', () => {
    expect(() =>
      buildGenerationPrompt({ userPrompt: 'Build a landing page', canvasHtml: '', canvasCss: '' })
    ).not.toThrow()
  })

  test('empty canvas uses placeholder text, not empty string', () => {
    const prompt = buildGenerationPrompt({ userPrompt: 'test', canvasHtml: '', canvasCss: '' })
    expect(prompt).toContain('empty')
  })
})
