import { create } from 'zustand'

type EditorUiState = {
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  setCanUndo: (canUndo: boolean) => void
  setCanRedo: (canRedo: boolean) => void
  setDirty: (isDirty: boolean) => void
  reset: () => void
}

const initialState = {
  canUndo: false,
  canRedo: false,
  isDirty: false,
}

export const useEditorUiStore = create<EditorUiState>((set) => ({
  ...initialState,
  setCanUndo: (canUndo) => {
    set(() => ({ canUndo }))
  },
  setCanRedo: (canRedo) => {
    set(() => ({ canRedo }))
  },
  setDirty: (isDirty) => {
    set(() => ({ isDirty }))
  },
  reset: () => {
    set(() => ({ ...initialState }))
  },
}))
