'use client'

import { useState } from 'react'

import { useEditorUiStore } from '@/store/editor-ui-store'

import { PushToGitHubModal } from './PushToGitHubModal'

type TopBarProps = {
  onExport: () => void
  exportError: string | null
  onUndo: () => void
  onRedo: () => void
  onToggleAssistant: () => void
  onPreview: () => void
}

export function TopBar({ onExport, exportError, onUndo, onRedo, onToggleAssistant, onPreview }: TopBarProps) {
  const canUndo = useEditorUiStore((s) => s.canUndo)
  const canRedo = useEditorUiStore((s) => s.canRedo)
  const [showPush, setShowPush] = useState(false)

  return (
    <>
      <header data-testid="builder-top-bar" className="h-11 flex-shrink-0 flex items-center px-4 gap-3 bg-[#1b1b1f] border-b border-[#2a2a2e] z-20">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.5)]" />
          <span className="text-[13px] font-semibold text-white tracking-tight">Studio Editor</span>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 ml-2">
          <button type="button" title="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${canUndo ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5' : 'text-zinc-700 cursor-not-allowed'}`}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h7a3 3 0 010 6H8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 3L3 6l3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button type="button" title="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${canRedo ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5' : 'text-zinc-700 cursor-not-allowed'}`}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 6H6a3 3 0 000 6h2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {/* Autosave */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span className="text-[10px] font-medium text-teal-400">Autosave On</span>
        </div>

        {/* URL bar */}
        <div className="hidden md:flex items-center gap-1.5 flex-1 max-w-md mx-auto">
          <div className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md bg-[#111113] border border-[#2a2a2e]">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#555" strokeWidth="1.5"><path d="M8 1v0a5 5 0 015 5v2a5 5 0 01-5 5v0a5 5 0 01-5-5V6a5 5 0 015-5z"/><path d="M1 8h14"/></svg>
            <span className="text-[11px] text-zinc-600">https://yoursite.com/</span>
            <span className="text-[11px] text-blue-400 hover:underline cursor-pointer">Connect Domain</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 md:hidden" />

        {/* Export error */}
        {exportError && (
          <span data-testid="builder-export-error" className="text-[10px] text-red-400">{exportError}</span>
        )}

        {/* Export ZIP */}
        <button
          data-testid="builder-export-zip"
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-zinc-300 bg-[#2a2a2e] hover:bg-[#333] transition-colors"
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2v9M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12v2h12v-2" strokeLinecap="round"/></svg>
          Export
        </button>

        <button
          data-testid="builder-toggle-assistant"
          type="button"
          onClick={onToggleAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-zinc-300 bg-[#232329] hover:bg-[#2d2d34] transition-colors"
        >
          AI Assistant
        </button>

        {/* Preview */}
        <button
          data-testid="builder-preview"
          type="button"
          onClick={onPreview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-zinc-300 border border-[#2a2a2e] hover:bg-white/5 transition-colors"
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="3"/><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/></svg>
          Preview
        </button>

        {/* Publish */}
        <button
          type="button"
          onClick={() => setShowPush(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
        >
          Publish
        </button>
      </header>

      {showPush && <PushToGitHubModal onClose={() => setShowPush(false)} />}
    </>
  )
}
