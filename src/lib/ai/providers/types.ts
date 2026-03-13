export type ProviderGenerateInput = {
  prompt: string
}

export type ProviderChunk = {
  text: string
  done: boolean
}

export type ProviderStreamTransport = (
  input: ProviderGenerateInput,
  signal?: AbortSignal,
) => AsyncIterable<ProviderChunk>

export type ProviderAdapter = {
  streamGenerate: (input: ProviderGenerateInput) => AsyncIterable<ProviderChunk>
}
