import { describe, expect, test } from 'vitest'

import { createClaudeProviderAdapter } from '@/lib/ai/providers/claude'
import { createGeminiProviderAdapter } from '@/lib/ai/providers/gemini'
import { createOpenAiProviderAdapter } from '@/lib/ai/providers/openai'

describe('provider adapters', () => {
  test('claude adapter exposes streamGenerate and returns normalized chunks', async () => {
    const adapter = createClaudeProviderAdapter({
      streamTransport: async function* () {
        yield { text: 'hello', done: false }
        yield { text: 'world', done: true }
      },
    })

    const chunks = []
    for await (const chunk of adapter.streamGenerate({ prompt: 'hi' })) {
      chunks.push(chunk)
    }

    expect(typeof adapter.streamGenerate).toBe('function')
    expect(chunks).toEqual([
      { text: 'hello', done: false },
      { text: 'world', done: true },
    ])
  })

  test('openai adapter exposes streamGenerate and returns normalized chunks', async () => {
    const adapter = createOpenAiProviderAdapter({
      streamTransport: async function* () {
        yield { text: 'a', done: false }
        yield { text: 'b', done: true }
      },
    })

    const chunks = []
    for await (const chunk of adapter.streamGenerate({ prompt: 'hi' })) {
      chunks.push(chunk)
    }

    expect(typeof adapter.streamGenerate).toBe('function')
    expect(chunks).toEqual([
      { text: 'a', done: false },
      { text: 'b', done: true },
    ])
  })

  test('gemini adapter exposes streamGenerate and returns normalized chunks', async () => {
    const adapter = createGeminiProviderAdapter({
      streamTransport: async function* () {
        yield { text: 'x', done: false }
        yield { text: 'y', done: true }
      },
    })

    const chunks = []
    for await (const chunk of adapter.streamGenerate({ prompt: 'hi' })) {
      chunks.push(chunk)
    }

    expect(typeof adapter.streamGenerate).toBe('function')
    expect(chunks).toEqual([
      { text: 'x', done: false },
      { text: 'y', done: true },
    ])
  })
})
