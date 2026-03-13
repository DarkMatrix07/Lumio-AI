import type {
  ProviderAdapter,
  ProviderGenerateInput,
  ProviderStreamTransport,
} from './types'

type OpenAiAdapterOptions = {
  streamTransport: ProviderStreamTransport
}

export const createOpenAiProviderAdapter = (
  options: OpenAiAdapterOptions,
): ProviderAdapter => {
  const streamGenerate = (input: ProviderGenerateInput) => options.streamTransport(input)

  return {
    streamGenerate,
  }
}
