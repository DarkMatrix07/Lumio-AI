'use client'

import { useState, useMemo } from 'react'

type FullProjectModalProps = {
  open: boolean
  onClose: () => void
  frontendHtml: string
  frontendCss: string
  backendFiles: Record<string, string>
}

type FileEntry = {
  path: string
  content: string
  section: 'FRONTEND' | 'BACKEND'
}

/* ── File icon helpers ── */
function FileIcon({ path }: { path: string }) {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const base = path.split('/').pop()?.toLowerCase() ?? ''

  if (base === 'dockerfile') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#60a5fa" strokeWidth="1.5">
        <rect x="2" y="4" width="12" height="9" rx="1" />
        <path d="M5 4V2m3 2V2m3 2V2" strokeLinecap="round" />
      </svg>
    )
  }

  if (ext === 'html') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#f97316" strokeWidth="1.5">
        <path d="M4 5l-2 3 2 3M12 5l2 3-2 3M9 3l-2 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (ext === 'js' || ext === 'jsx') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#eab308" strokeWidth="1.5">
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <path d="M7 6v4M9 6v3a1 1 0 002 0" strokeLinecap="round" />
      </svg>
    )
  }

  if (ext === 'ts' || ext === 'tsx') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#3b82f6" strokeWidth="1.5">
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <path d="M5 6h6M8 6v4" strokeLinecap="round" />
      </svg>
    )
  }

  if (ext === 'json') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#3b82f6" strokeWidth="1.5">
        <path d="M5 4c-1 0-2 .5-2 2v.5c0 .8-.5 1.5-1 1.5.5 0 1 .7 1 1.5V11c0 1.5 1 2 2 2M11 4c1 0 2 .5 2 2v.5c0 .8.5 1.5 1 1.5-.5 0-1 .7-1 1.5V11c0 1.5-1 2-2 2" strokeLinecap="round" />
      </svg>
    )
  }

  if (ext === 'css') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#a855f7" strokeWidth="1.5">
        <path d="M3 3l1 10 4 1 4-1 1-10H3z" strokeLinejoin="round" />
        <path d="M5.5 7h5l-.5 3.5L8 11l-1.5-.5L6 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (ext === 'md') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M5 10V6l2 2 2-2v4M11 10V8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (ext === 'env' || base === '.env') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#10b981" strokeWidth="1.5">
        <path d="M8 2a3 3 0 00-3 3v2H4a1 1 0 00-1 1v6h10V8a1 1 0 00-1-1h-1V5a3 3 0 00-3-3z" />
        <circle cx="8" cy="11" r="1" fill="#10b981" />
      </svg>
    )
  }

  if (ext === 'yml' || ext === 'yaml') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#6b7280" strokeWidth="1.5">
        <circle cx="8" cy="8" r="5" />
        <path d="M8 5v3l2 1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (ext === 'prisma') {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#22d3ee" strokeWidth="1.5">
        <path d="M8 2L14 13H2L8 2z" strokeLinejoin="round" />
        <path d="M8 2v11" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#71717a" strokeWidth="1.5">
      <path d="M4 2h6l4 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M10 2v3h4" />
    </svg>
  )
}

/* ── Backend file tree grouping ── */
function groupByFolder(files: FileEntry[]): Map<string, FileEntry[]> {
  const grouped = new Map<string, FileEntry[]>()
  for (const file of files) {
    const parts = file.path.split('/')
    const folder = parts.length > 1 ? parts[0] : '__root__'
    const existing = grouped.get(folder) ?? []
    grouped.set(folder, [...existing, file])
  }
  return grouped
}

/* ── Main modal ── */
export function FullProjectModal({ open, onClose, frontendHtml, frontendCss, backendFiles }: FullProjectModalProps) {
  const [selectedFile, setSelectedFile] = useState<string>('index.html')

  const allFiles: FileEntry[] = useMemo(() => {
    const htmlJsonLiteral = JSON.stringify(frontendHtml)

    const frontendEntries: FileEntry[] = [
      {
        path: 'index.html',
        section: 'FRONTEND',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lumio App</title>
  <link rel="stylesheet" href="src/styles.css" />
</head>
<body>
${frontendHtml}
</body>
</html>`,
      },
      {
        path: 'src/styles.css',
        section: 'FRONTEND',
        content: frontendCss,
      },
      {
        path: 'package.json',
        section: 'FRONTEND',
        content: JSON.stringify(
          {
            name: 'lumio-frontend',
            version: '1.0.0',
            scripts: { dev: 'vite', build: 'vite build' },
            dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
            devDependencies: { vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0' },
          },
          null,
          2,
        ),
      },
      {
        path: 'src/App.jsx',
        section: 'FRONTEND',
        content: `import './styles.css'

export default function App() {
  return <div dangerouslySetInnerHTML={{ __html: ${htmlJsonLiteral} }} />
}
`,
      },
      {
        path: 'src/main.jsx',
        section: 'FRONTEND',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`,
      },
      {
        path: 'vite.config.js',
        section: 'FRONTEND',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({ plugins: [react()] })
`,
      },
      {
        path: 'README.md',
        section: 'FRONTEND',
        content: `# Lumio Frontend

Generated by [Lumio AI](https://lumio.ai) visual app builder.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
`,
      },
    ]

    const backendEntries: FileEntry[] = Object.entries(backendFiles).map(([path, content]) => ({
      path,
      content,
      section: 'BACKEND' as const,
    }))

    return [...frontendEntries, ...backendEntries]
  }, [frontendHtml, frontendCss, backendFiles])

  const selectedEntry = allFiles.find((f) => f.path === selectedFile)
  const isFrontendHtmlFile = selectedEntry?.path === 'index.html'

  const frontendFiles = allFiles.filter((f) => f.section === 'FRONTEND')
  const backendFileList = allFiles.filter((f) => f.section === 'BACKEND')
  const backendGroups = groupByFolder(backendFileList)

  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownload = async () => {
    setDownloadError(null)
    let url: string | null = null
    try {
      const manifest: Record<string, string> = {}
      for (const file of allFiles) {
        manifest[file.path] = file.content
      }
      const { buildProjectZip, buildExportFilename } = await import('@/lib/export/client-zip')
      const blob = await buildProjectZip(manifest)
      url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = buildExportFilename()
      a.click()
    } catch (err) {
      console.error('Download failed', err)
      setDownloadError('Download failed. Please try again.')
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[960px] h-[620px] max-w-[95vw] max-h-[90vh] bg-[#18181b] border border-[#2a2a2e] rounded-xl flex flex-col overflow-hidden shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-[#1b1b1f] border-b border-[#232326] px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#60a5fa" strokeWidth="1.6">
              <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] font-semibold text-zinc-100">Full Project Code</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 text-[10px] font-semibold">
              {allFiles.length} files
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── File tree ── */}
          <div className="w-[240px] flex-shrink-0 bg-[#111113] border-r border-[#232326] flex flex-col overflow-y-auto">

            {/* FRONTEND section */}
            <div className="px-3 pt-3 pb-1">
              <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase">Frontend</span>
            </div>
            <div className="pb-2">
              {frontendFiles.map((file) => {
                const isSelected = selectedFile === file.path
                const label = file.path.split('/').pop() ?? file.path
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedFile(file.path)}
                    title={file.path}
                    className={[
                      'w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors',
                      file.path.includes('/') ? 'pl-6' : '',
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
                    ].join(' ')}
                  >
                    <span className="flex-shrink-0"><FileIcon path={file.path} /></span>
                    <span className="truncate font-mono">{label}</span>
                  </button>
                )
              })}
            </div>

            {/* BACKEND section */}
            {backendFileList.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 border-t border-[#1e1e22]">
                  <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase">Backend</span>
                </div>
                <div className="pb-2">
                  {Array.from(backendGroups.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([folder, files]) => (
                    <div key={folder}>
                      {folder !== '__root__' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 mt-1">
                          <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="#52525b" strokeWidth="1.5">
                            <path d="M2 4a1 1 0 011-1h3l1.5 2H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />
                          </svg>
                          <span className="text-[10px] font-medium text-zinc-500">{folder}/</span>
                        </div>
                      )}
                      {files.map((file) => {
                        const isSelected = selectedFile === file.path
                        const label = file.path.split('/').pop() ?? file.path
                        const indent = folder !== '__root__' ? 'pl-7' : 'pl-3'
                        return (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => setSelectedFile(file.path)}
                            title={file.path}
                            className={[
                              'w-full flex items-center gap-2 py-1.5 text-left text-[11px] transition-colors pr-3',
                              indent,
                              isSelected
                                ? 'bg-blue-600/20 text-blue-300'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
                            ].join(' ')}
                          >
                            <span className="flex-shrink-0"><FileIcon path={file.path} /></span>
                            <span className="truncate font-mono">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Preview / Code panel ── */}
          <div className="flex-1 flex flex-col bg-[#111113] overflow-hidden">
            {/* File path breadcrumb */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e1e22] flex-shrink-0 bg-[#13131a]">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="#52525b" strokeWidth="1.5">
                <path d="M4 2h6l4 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
                <path d="M10 2v3h4" />
              </svg>
              <span className="text-[10px] text-zinc-500 font-mono">{selectedFile}</span>
              {isFrontendHtmlFile && (
                <span className="ml-auto px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 text-[9px] font-semibold uppercase tracking-wide">
                  Live Preview
                </span>
              )}
            </div>

            {/* Content area */}
            {isFrontendHtmlFile ? (
              <iframe
                className="w-full flex-1 border-0"
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${frontendCss}</style></head><body>${frontendHtml}</body></html>`}
                sandbox="allow-scripts"
                title="Frontend Preview"
              />
            ) : (
              <pre className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed font-mono text-zinc-300 bg-[#111113] m-0">
                <code>{selectedEntry?.content ?? ''}</code>
              </pre>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-[#232326] px-4 py-3 flex justify-between items-center bg-[#1b1b1f] flex-shrink-0">
          <span className="text-[11px] text-zinc-500">
            {frontendFiles.length} frontend · {backendFileList.length} backend files
          </span>
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 2v9M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12v2h12v-2" strokeLinecap="round" />
            </svg>
            Download ZIP
          </button>
        </div>

      </div>
    </div>
  )
}
