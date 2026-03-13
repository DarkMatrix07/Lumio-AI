import type {
  ProviderAdapter,
  ProviderGenerateInput,
  ProviderStreamTransport,
} from './types'

type ClaudeAdapterOptions = {
  streamTransport: ProviderStreamTransport
}

export const createClaudeProviderAdapter = (
  options: ClaudeAdapterOptions,
): ProviderAdapter => {
  const streamGenerate = (input: ProviderGenerateInput) => options.streamTransport(input)

  return {
    streamGenerate,
  }
}
