import { describe, expect, test } from 'vitest'

import { StreamParser } from '@/lib/ai/stream-parser'

describe('StreamParser.flush', () => {
  test('does not leak partial closing html tag into visible text', () => {
    const parser = new StreamParser()

    parser.push('<lumio-ai-html>abc</lumio-ai-')
    const flushed = parser.flush()

    expect(flushed.visibleText).toBe('')
    expect(flushed.htmlDelta).toBe('</lumio-ai-')
    expect(flushed.cssDelta).toBe('')
  })

  test('does not leak partial closing css tag into visible text', () => {
    const parser = new StreamParser()

    parser.push('<lumio-ai-css>body{color:red;}</lumio-ai-')
    const flushed = parser.flush()

    expect(flushed.visibleText).toBe('')
    expect(flushed.cssDelta).toBe('</lumio-ai-')
    expect(flushed.htmlDelta).toBe('')
  })
})
