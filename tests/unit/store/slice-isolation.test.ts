import { beforeEach, describe, expect, test, vi } from 'vitest'

import { useAiChatStore } from '@/store/ai-chat-store'
import { useBackendGraphStore } from '@/store/backend-graph-store'
import { useEditorUiStore } from '@/store/editor-ui-store'

describe('zustand slice isolation', () => {
  beforeEach(() => {
    useAiChatStore.setState({ streamText: '', isStreaming: false })
    useBackendGraphStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
    })
    useEditorUiStore.setState({
      canUndo: false,
      canRedo: false,
      isDirty: false,
    })
  })

  test('ai stream update does not trigger backend or editor subscribers', () => {
    const backendSpy = vi.fn()
    const editorSpy = vi.fn()

    const unsubscribeBackend = useBackendGraphStore.subscribe(() => {
      backendSpy()
    })

    const unsubscribeEditor = useEditorUiStore.subscribe(() => {
      editorSpy()
    })

    useAiChatStore.getState().setStreamText('hello stream')

    expect(backendSpy).not.toHaveBeenCalled()
    expect(editorSpy).not.toHaveBeenCalled()

    unsubscribeBackend()
    unsubscribeEditor()
  })
})
