'use client'

import { useEffect, useRef, useState } from 'react'
import { CSRF_HEADER_NAME } from '@/lib/security/csrf'
import type { CanvasEditorBridge } from '@/components/canvas/GrapesCanvas'

type DeployToVercelModalProps = {
    onClose: () => void
    editorBridge: CanvasEditorBridge
}

type PushStatus = 'idle' | 'deploying' | 'success' | 'error'

export function DeployToVercelModal({ onClose, editorBridge }: DeployToVercelModalProps) {
    const dialogTitleId = 'deploy-to-vercel-modal-title'
    const dialogRef = useRef<HTMLDivElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)

    const [projectName, setProjectName] = useState('')
    const [token, setToken] = useState('')
    const [status, setStatus] = useState<PushStatus>('idle')
    const [resultUrl, setResultUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Load previously saved Vercel token
        const savedToken = localStorage.getItem('vercel_deploy_token')
        if (savedToken) setToken(savedToken)

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
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    const handleDeploy = async () => {
        if (!projectName || !token) return
        setStatus('deploying')
        setError(null)
        setResultUrl(null)

        // Persist token for convenience
        localStorage.setItem('vercel_deploy_token', token)

        try {
            const csrfRes = await fetch('/api/csrf-token')
            const csrfData = (await csrfRes.json()) as { token?: string }
            const csrfToken = csrfData.token ?? ''

            // Get exact HTML and CSS from GrapesJS
            const rawHtml = editorBridge.getHtml()
            const rawCss = editorBridge.getCss()

            // Wrap in a full HTML page
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${projectName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>${rawCss}</style>
  </head>
  <body>
    ${rawHtml}
  </body>
</html>`

            const response = await fetch('/api/deploy-vercel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [CSRF_HEADER_NAME]: csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify({ projectName, token, html: fullHtml }),
            })

            const body = (await response.json()) as { url?: string; error?: string }

            if (!response.ok) {
                throw new Error(body.error ?? `HTTP ${response.status}`)
            }

            setResultUrl(body.url ?? 'Deployed successfully')
            setStatus('success')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Deployment failed')
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
                    <span id={dialogTitleId} className="text-sm font-semibold text-white">Deploy to Vercel</span>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        aria-label="Close deploy modal"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white text-lg leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Instantly deploy your canvas layout to a live website using Vercel.
                        You must provide a Personal Access Token from your Vercel Account Settings.
                    </p>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-400">Project Name (lowercase, no spaces) *</span>
                        <input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            placeholder="my-cool-landing-page"
                            className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-zinc-400">Vercel Access Token *</span>
                            <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">Get Token</a>
                        </div>
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="vrc_..."
                            className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                        />
                    </label>

                    {/* Result */}
                    {status === 'success' && resultUrl && (
                        <div className="rounded bg-green-900/30 border border-green-700 p-3 text-sm text-green-400 text-center flex flex-col items-center gap-2">
                            <span className="font-semibold text-green-300">✓ Deployed Successfully</span>
                            <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                {resultUrl}
                            </a>
                        </div>
                    )}
                    {status === 'error' && error && (
                        <div className="rounded bg-red-900/30 border border-red-700 px-3 py-2 text-xs text-red-400">{error}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#333]">
                    {status !== 'success' && (
                        <button
                            type="button"
                            aria-label="Cancel deploy"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    {status === 'success' ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 rounded text-xs font-medium text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
                        >
                            Close
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void handleDeploy()}
                            disabled={!projectName || !token || status === 'deploying'}
                            className="px-4 py-1.5 rounded text-xs font-medium text-black bg-white hover:bg-zinc-200 shadow disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {status === 'deploying' ? 'Deploying…' : 'Deploy to Vercel'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
