import { createClaudeProviderAdapter } from './claude'
import { createGeminiProviderAdapter } from './gemini'
import { createOpenAiProviderAdapter } from './openai'
import { claudeTransport, geminiTransport, openaiTransport } from './transports'
import type { ProviderAdapter } from './types'

export type ProviderName = 'claude' | 'openai' | 'gemini'

/**
 * Returns a ProviderAdapter wired to the real streaming transport for the
 * requested provider. Pass `apiKey` to override the server environment variable.
 */
export function getProvider(name: ProviderName = 'claude', apiKey?: string): ProviderAdapter {
  switch (name) {
    case 'claude':
      return createClaudeProviderAdapter({ streamTransport: claudeTransport(apiKey) })
    case 'openai':
      return createOpenAiProviderAdapter({ streamTransport: openaiTransport(apiKey) })
    case 'gemini':
      return createGeminiProviderAdapter({ streamTransport: geminiTransport(apiKey) })
    default:
      return createClaudeProviderAdapter({ streamTransport: claudeTransport(apiKey) })
  }
}
