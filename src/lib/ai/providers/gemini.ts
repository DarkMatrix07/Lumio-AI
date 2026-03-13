import type {
  ProviderAdapter,
  ProviderGenerateInput,
  ProviderStreamTransport,
} from './types'

type GeminiAdapterOptions = {
  streamTransport: ProviderStreamTransport
}

export const createGeminiProviderAdapter = (
  options: GeminiAdapterOptions,
): ProviderAdapter => {
  const streamGenerate = (input: ProviderGenerateInput) => options.streamTransport(input)

  return {
    streamGenerate,
  }
}
