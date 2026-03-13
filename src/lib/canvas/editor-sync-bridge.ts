type EditorUiStateBridge = {
  setCanUndo: (canUndo: boolean) => void
  setCanRedo: (canRedo: boolean) => void
  setDirty: (isDirty: boolean) => void
}

type GrapesLikeEditor = {
  UndoManager?: {
    hasUndo?: () => boolean
    hasRedo?: () => boolean
  }
  getDirtyCount?: () => number
  on: (event: string, cb: () => void) => void
  off: (event: string, cb: () => void) => void
}

const SYNC_EVENTS = ['update', 'undo', 'redo', 'component:selected'] as const

export const bindEditorSyncBridge = (
  editor: GrapesLikeEditor,
  uiState: EditorUiStateBridge,
): (() => void) => {
  const sync = () => {
    const canUndo = Boolean(editor.UndoManager?.hasUndo?.())
    const canRedo = Boolean(editor.UndoManager?.hasRedo?.())
    const isDirty = (editor.getDirtyCount?.() ?? 0) > 0

    uiState.setCanUndo(canUndo)
    uiState.setCanRedo(canRedo)
    uiState.setDirty(isDirty)
  }

  for (const eventName of SYNC_EVENTS) {
    editor.on(eventName, sync)
  }

  sync()

  return () => {
    for (const eventName of SYNC_EVENTS) {
      editor.off(eventName, sync)
    }
  }
}
