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

export type CanvasEditorBridge = {
  getHtml: () => string
  getCss: () => string
  setHtml: (value: string) => void
  setCss: (value: string) => void
  editor: EditorLike
}

type GrapesCanvasProps = {
  className?: string
  onEditorReady?: (bridge: CanvasEditorBridge) => void
}

const GrapesCanvasLazy = dynamic(() => import('./GrapesCanvasInner'), {
  ssr: false,
})

export const GrapesCanvas: FC<GrapesCanvasProps> = ({ className, onEditorReady }) => {
  return <GrapesCanvasLazy className={className} onEditorReady={onEditorReady} />
}
