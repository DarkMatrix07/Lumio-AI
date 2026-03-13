import { beforeEach, describe, expect, test } from 'vitest'

import { useEditorUiStore } from '@/store/editor-ui-store'

describe('editor-ui-store', () => {
  beforeEach(() => {
    useEditorUiStore.getState().reset()
  })

  test('setCanUndo updates state', () => {
    useEditorUiStore.getState().setCanUndo(true)

    expect(useEditorUiStore.getState().canUndo).toBe(true)
  })

  test('setCanRedo updates state', () => {
    useEditorUiStore.getState().setCanRedo(true)

    expect(useEditorUiStore.getState().canRedo).toBe(true)
  })

  test('setDirty updates state', () => {
    useEditorUiStore.getState().setDirty(true)

    expect(useEditorUiStore.getState().isDirty).toBe(true)
  })
})
