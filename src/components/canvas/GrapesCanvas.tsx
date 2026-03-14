'use client'

import dynamic from 'next/dynamic'
import type { FC } from 'react'

type EditorLike = {
  runCommand?: (command: string) => void
  UndoManager?: {
    stop?: () => unknown
    start?: () => unknown
  }
}

export type PageInfo = { id: string; name: string }

export type CanvasEditorBridge = {
  getHtml: () => string
  getCss: () => string
  setHtml: (value: string) => void
  setCss: (value: string) => void
  editor: EditorLike
  undo: () => void
  redo: () => void
  setDevice: (name: string) => void
  getPages: () => PageInfo[]
  addPage: (name: string) => string
  selectPage: (id: string) => void
  removePage: (id: string) => void
  getSelectedPageId: () => string
  filterBlocks: (query: string) => void
}

type GrapesCanvasProps = {
  className?: string
  onEditorReady?: (bridge: CanvasEditorBridge) => void
  blocksContainer: HTMLDivElement | null
  layersContainer: HTMLDivElement | null
  rightPanelOpen?: boolean
  onToggleRightPanel?: () => void
}

const GrapesCanvasLazy = dynamic(() => import('./GrapesCanvasInner'), {
  ssr: false,
})

export const GrapesCanvas: FC<GrapesCanvasProps> = ({
  className,
  onEditorReady,
  blocksContainer,
  layersContainer,
  rightPanelOpen = true,
  onToggleRightPanel,
}) => {
  return (
    <GrapesCanvasLazy
      className={className}
      onEditorReady={onEditorReady}
      blocksContainer={blocksContainer}
      layersContainer={layersContainer}
      rightPanelOpen={rightPanelOpen}
      onToggleRightPanel={onToggleRightPanel}
    />
  )
}
