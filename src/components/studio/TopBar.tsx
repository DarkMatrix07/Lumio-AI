'use client'

import { useState } from 'react'

import { PushToGitHubModal } from './PushToGitHubModal'

type TopBarProps = {
  onExport: () => void
  exportError: string | null
}

export function TopBar({ onExport, exportError }: TopBarProps) {
  const [showPush, setShowPush] = useState(false)

  return (
    <>
      <header className="h-11 flex-shrink-0 flex items-center px-3 gap-3 bg-[#1a1a1a] border-b border-[#333] z-10">
        {/* Brand */}
        <div className="flex items-center gap-2 mr-2">
          <span className="text-sm font-bold text-white tracking-tight">⚡ Lumio AI</span>
        </div>

        <div className="w-px h-5 bg-zinc-700" />

        {/* Code indicator */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          <span className="font-mono">&lt;/&gt;</span>
          <span>Code</span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export error */}
        {exportError && (
          <span data-testid="builder-export-error" className="text-xs text-red-400">{exportError}</span>
        )}

        {/* Export ZIP */}
        <button
          data-testid="builder-export-zip"
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-zinc-200 bg-zinc-700 hover:bg-zinc-600 transition-colors"
        >
          <span>↓</span>
          <span>Export ZIP</span>
        </button>

        {/* Push to GitHub */}
        <button
          type="button"
          onClick={() => setShowPush(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors"
        >
          <span>↑</span>
          <span>Push to GitHub</span>
        </button>
      </header>

      {showPush && <PushToGitHubModal onClose={() => setShowPush(false)} />}
    </>
  )
}
