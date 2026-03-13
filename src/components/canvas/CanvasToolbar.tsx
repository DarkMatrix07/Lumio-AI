'use client'

import { useEditorUiStore } from '@/store/editor-ui-store'

type CanvasToolbarProps = {
  onUndo?: () => void
  onRedo?: () => void
}

export function CanvasToolbar({ onUndo, onRedo }: CanvasToolbarProps) {
  const canUndo = useEditorUiStore((state) => state.canUndo)
  const canRedo = useEditorUiStore((state) => state.canRedo)

  return (
    <div className="flex items-center gap-2" data-testid="canvas-toolbar">
      <button data-testid="toolbar-undo" disabled={!canUndo} onClick={onUndo} type="button">
        Undo
      </button>
      <button data-testid="toolbar-redo" disabled={!canRedo} onClick={onRedo} type="button">
        Redo
      </button>
    </div>
  )
}
