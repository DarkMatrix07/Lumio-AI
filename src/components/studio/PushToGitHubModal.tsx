'use client'

import { useEffect, useRef, useState } from 'react'

import { generateBackendFiles } from '@/lib/backend/codegen'
import { CSRF_HEADER_NAME } from '@/lib/security/csrf'
import { useBackendGraphStore } from '@/store/backend-graph-store'

type PushToGitHubModalProps = {
  onClose: () => void
}

type PushStatus = 'idle' | 'pushing' | 'success' | 'error'

export function PushToGitHubModal({ onClose }: PushToGitHubModalProps) {
  const dialogTitleId = 'push-to-github-modal-title'
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [pat, setPat] = useState('')
  const [appSlug, setAppSlug] = useState('lumio-app')
  const [status, setStatus] = useState<PushStatus>('idle')
  const [result, setResult] = useState<{ usedBranch?: string; commitSha?: string; commitMessage?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const focusableItems = Array.from(focusable).filter((el) => !el.hasAttribute('disabled'))
      if (focusableItems.length === 0) return

      const first = focusableItems[0]
      const last = focusableItems[focusableItems.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const handlePush = async () => {
    if (!owner || !repo || !pat) return
    setStatus('pushing')
    setError(null)
    setResult(null)

    try {
      const csrfRes = await fetch('/api/csrf-token')
      const csrfData = (await csrfRes.json()) as { token?: string }
      const csrfToken = csrfData.token ?? ''

      const { nodes, edges } = useBackendGraphStore.getState()
      const contentByPath = generateBackendFiles({ nodes, edges })

      const response = await fetch('/api/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ owner, repo, branch, pat, appSlug, contentByPath }),
      })

      const body = (await response.json()) as { usedBranch?: string; commitSha?: string; commitMessage?: string; error?: string }

      if (!response.ok) {
        throw new Error(body.error ?? `HTTP ${response.status}`)
      }

      setResult(body)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className="w-[420px] bg-[#252525] border border-[#444] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
          <span id={dialogTitleId} className="text-sm font-semibold text-white">Push to GitHub</span>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close push to GitHub modal"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Owner *</span>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="github-username"
                className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Repository *</span>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="my-app"
                className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Branch</span>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">App Slug</span>
              <input
                value={appSlug}
                onChange={(e) => setAppSlug(e.target.value)}
                placeholder="my-app"
                className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Personal Access Token (PAT) *</span>
            <input
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="github_pat_..."
              className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </label>

          {/* Result */}
          {status === 'success' && result && (
            <div className="rounded bg-green-900/30 border border-green-700 px-3 py-2 text-xs text-green-400">
              ✓ Pushed to <strong>{result.usedBranch}</strong> — {result.commitSha?.slice(0, 7)}
            </div>
          )}
          {status === 'error' && error && (
            <div className="rounded bg-red-900/30 border border-red-700 px-3 py-2 text-xs text-red-400">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#333]">
          <button
            type="button"
            aria-label="Cancel and close push modal"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handlePush()}
            disabled={!owner || !repo || !pat || status === 'pushing'}
            className="px-4 py-1.5 rounded text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'pushing' ? 'Pushing…' : 'Push'}
          </button>
        </div>
      </div>
    </div>
  )
}
