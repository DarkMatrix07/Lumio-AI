'use client'

import { useState } from 'react'

import { generateBackendFiles } from '@/lib/backend/codegen'
import { buildExportFilename, buildProjectZip } from '@/lib/export/client-zip'
import type { CanvasEditorBridge } from '@/components/canvas/GrapesCanvas'
import { GrapesCanvas } from '@/components/canvas/GrapesCanvas'
import { ChatPanel } from '@/components/studio/ChatPanel'
import { TopBar } from '@/components/studio/TopBar'
import { useBackendGraphStore } from '@/store/backend-graph-store'

const emptyBridge: CanvasEditorBridge = {
  getHtml: () => '',
  getCss: () => '',
  setHtml: () => {},
  setCss: () => {},
  editor: {},
}

export function BuilderStudio() {
  const [editorBridge, setEditorBridge] = useState<CanvasEditorBridge>(emptyBridge)
  const [exportError, setExportError] = useState<string | null>(null)

  const exportProjectZip = async () => {
    let objectUrl: string | null = null
    try {
      setExportError(null)
      const { nodes, edges } = useBackendGraphStore.getState()
      const files = generateBackendFiles({ nodes, edges })
      const blob = await buildProjectZip(files)
      objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = buildExportFilename()
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    } catch (error) {
      console.error('Failed to export project zip', error)
      setExportError('Export failed. Please try again.')
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a] text-zinc-200 overflow-hidden" data-testid="builder-studio-shell">
      {/* Top bar */}
      <TopBar onExport={() => void exportProjectZip()} exportError={exportError} />

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas — GrapesCanvasInner handles Blocks/Layers/Canvas/Styles/Properties internally */}
        <section
          data-testid="builder-canvas-panel"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <GrapesCanvas className="flex-1 w-full h-full" onEditorReady={setEditorBridge} />
        </section>

        {/* Right panel — AI Chat */}
        <aside
          data-testid="builder-chat-panel"
          className="w-72 flex-shrink-0 bg-[#252525] border-l border-[#333] flex flex-col overflow-hidden"
        >
          <ChatPanel
            getHtml={editorBridge.getHtml}
            getCss={editorBridge.getCss}
            setHtml={editorBridge.setHtml}
            setCss={editorBridge.setCss}
            editor={editorBridge.editor}
          />
        </aside>
      </div>
    </div>
  )
}
