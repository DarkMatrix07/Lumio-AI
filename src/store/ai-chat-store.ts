import { create } from 'zustand'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiProvider = 'claude' | 'openai' | 'gemini'

type AiChatState = {
  messages: ChatMessage[]
  streamText: string
  isStreaming: boolean
  error: string | null
  provider: AiProvider
  apiKey: string

  addMessage: (message: ChatMessage) => void
  appendStreamText: (chunk: string) => void
  setStreamText: (streamText: string) => void
  setIsStreaming: (isStreaming: boolean) => void
  setError: (error: string | null) => void
  setProvider: (provider: AiProvider) => void
  setApiKey: (apiKey: string) => void
  resetStream: () => void
  reset: () => void
}

const initialState = {
  messages: [] as ChatMessage[],
  streamText: '',
  isStreaming: false,
  error: null as string | null,
  provider: 'gemini' as AiProvider,
  apiKey: '',
}

export const useAiChatStore = create<AiChatState>((set) => ({
  ...initialState,
  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }))
  },
  appendStreamText: (chunk) => {
    set((state) => ({ streamText: `${state.streamText}${chunk}` }))
  },
  setStreamText: (streamText) => {
    set(() => ({ streamText }))
  },
  setIsStreaming: (isStreaming) => {
    set(() => ({ isStreaming }))
  },
  setError: (error) => {
    set(() => ({ error }))
  },
  setProvider: (provider) => {
    set(() => ({ provider }))
  },
  setApiKey: (apiKey) => {
    set(() => ({ apiKey }))
  },
  resetStream: () => {
    set(() => ({ streamText: '', error: null }))
  },
  reset: () => {
    set(() => ({ ...initialState }))
  },
}))
