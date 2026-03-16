'use client'

import { useCallback, useEffect, useState } from 'react'

import { generateBackendFiles } from '@/lib/backend/codegen'
import type { CanvasEditorBridge, PageInfo } from '@/components/canvas/GrapesCanvas'
import { GrapesCanvas } from '@/components/canvas/GrapesCanvas'
import { ChatPanel } from '@/components/studio/ChatPanel'
import { BackendPanel } from '@/components/studio/BackendPanel'
import { BUILDER_LAYOUT, BUILDER_TEST_IDS } from '@/components/studio/builder-layout'
import { FullProjectModal } from '@/components/studio/FullProjectModal'
import { TopBar } from '@/components/studio/TopBar'
import { DeployToVercelModal } from '@/components/studio/DeployToVercelModal'
import { RoutesPanel } from '@/components/studio/RoutesPanel'
import { RoutesSidebarContent } from '@/components/studio/RoutesSidebarContent'
import { useBackendGraphStore } from '@/store/backend-graph-store'
import { usePagesStore } from '@/store/pages-store'

/* ── Left rail icon definitions ── */
const LEFT_RAIL_ITEMS = [
  { id: 'add', label: 'Add', icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="10" y1="4" x2="10" y2="16" strokeLinecap="round" /><line x1="4" y1="10" x2="16" y2="10" strokeLinecap="round" /></svg> },
  { id: 'templates', label: 'Templates', icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="14" height="14" rx="2" /><line x1="3" y1="8" x2="17" y2="8" /><line x1="8" y1="8" x2="8" y2="17" /></svg> },
  { id: 'pages', label: 'Pages', icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M12 2v4h4" /></svg> },
  { id: 'layers', label: 'Layers', icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 3l8 5-8 5-8-5z" /><path d="M2 13l8 5 8-5" opacity=".5" /></svg> },
  { id: 'global', label: 'Global', icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="7" /><path d="M3 10h14" /><ellipse cx="10" cy="10" rx="3.5" ry="7" /></svg> },
  { id: 'code', label: 'Code', icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 5l-4 5 4 5M13 5l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { id: 'routes', label: 'Routes', icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="4" cy="10" r="1.4" /><circle cx="10" cy="4" r="1.4" /><circle cx="10" cy="16" r="1.4" /><circle cx="16" cy="10" r="1.4" /><path d="M5.4 9.2L8.6 5.8M11.4 5.8L14.6 9.2M14.6 10.8L11.4 14.2M8.6 14.2L5.4 10.8" strokeLinecap="round" /></svg> },
  { id: 'backend', label: 'Backend', icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="3" width="12" height="5" rx="1" /><rect x="4" y="12" width="12" height="5" rx="1" /><path d="M10 8v4" /></svg> },
] as const

type LeftRailId = (typeof LEFT_RAIL_ITEMS)[number]['id']

const DEVICE_INFO: Record<string, { label: string; width: string }> = {
  Desktop: { label: 'Desktop', width: '1366px' },
  Tablet: { label: 'Tablet', width: '768px' },
  Mobile: { label: 'Mobile', width: '375px' },
}

const emptyBridge: CanvasEditorBridge = {
  getHtml: () => '',
  getCss: () => '',
  setHtml: () => { },
  setCss: () => { },
  editor: {},
  undo: () => { },
  redo: () => { },
  setDevice: () => { },
  getPages: () => [{ id: 'default', name: 'Home' }],
  addPage: () => '',
  selectPage: () => { },
  removePage: () => { },
  getSelectedPageId: () => 'default',
  filterBlocks: () => { },
}

export function BuilderStudio() {
  const [editorBridge, setEditorBridge] = useState<CanvasEditorBridge>(emptyBridge)
  const [exportError, setExportError] = useState<string | null>(null)
  const [showFullProject, setShowFullProject] = useState(false)
  const [activeRail, setActiveRail] = useState<LeftRailId | null>('add')
  const [blockSearch, setBlockSearch] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [showDeploy, setShowDeploy] = useState(false)

  const [blocksContainerEl, setBlocksContainerEl] = useState<HTMLDivElement | null>(null)
  const [layersContainerEl, setLayersContainerEl] = useState<HTMLDivElement | null>(null)

  /* ── Device switcher state ── */
  const [activeDevice, setActiveDevice] = useState('Desktop')

  /* ── Pages state ── */
  const [pages, setPages] = useState<PageInfo[]>([{ id: 'default', name: 'Home' }])
  const [selectedPageId, setSelectedPageId] = useState('default')

  /* ── Code editor state ── */
  const [codeHtml, setCodeHtml] = useState('')
  const [codeCss, setCodeCss] = useState('')
  const [codeTab, setCodeTab] = useState<'html' | 'css'>('html')

  /* ── Global styles state ── */
  const [globalCss, setGlobalCss] = useState('')

  const toggleRail = (id: LeftRailId) => {
    setActiveRail((prev) => {
      const next = prev === id ? null : id
      if (next !== 'add' && next !== 'templates') {
        setBlockSearch('')
      }
      return next
    })
  }

  /* Sync code panel when opened */
  useEffect(() => {
    if (activeRail === 'code') {
      setCodeHtml(editorBridge.getHtml())
      setCodeCss(editorBridge.getCss())
    }
  }, [activeRail, editorBridge])

  /* Sync block filtering */
  useEffect(() => {
    if (activeRail === 'add') {
      editorBridge.filterBlocks(blockSearch ? `__add_only__:${blockSearch}` : '__add_only__')
      return
    }

    if (activeRail === 'templates') {
      editorBridge.filterBlocks(blockSearch ? `__templates_only__:${blockSearch}` : '__templates_only__')
      return
    }

    editorBridge.filterBlocks('')
  }, [activeRail, blockSearch, editorBridge])

  /* Sync pages when opened */
  const refreshPages = useCallback(() => {
    const p = editorBridge.getPages()
    setPages(p)
    setSelectedPageId(editorBridge.getSelectedPageId())
    // Sync to Zustand store so RoutesSidebarContent picks up changes
    usePagesStore.getState().setPages(
      p.map((pg, i) => ({ id: pg.id, name: pg.name, path: i === 0 ? '/' : `/${pg.name.toLowerCase().replace(/\s+/g, '-')}` }))
    )
  }, [editorBridge])

  useEffect(() => {
    if (activeRail === 'pages') refreshPages()
  }, [activeRail, refreshPages])

  /* Sync pages to store whenever the bridge changes (editor ready) or switching to routes */
  useEffect(() => {
    if (editorBridge !== emptyBridge) refreshPages()
  }, [editorBridge, refreshPages])

  useEffect(() => {
    if (activeRail === 'routes') refreshPages()
  }, [activeRail, refreshPages])

  /* ── Device switch handler ── */
  const handleDeviceSwitch = (device: string) => {
    setActiveDevice(device)
    editorBridge.setDevice(device)
  }

  /* ── Code apply handler ── */
  const applyCode = () => {
    editorBridge.setHtml(codeHtml)
    editorBridge.setCss(codeCss)
  }

  /* ── Global styles apply ── */
  const applyGlobalStyles = () => {
    const existing = editorBridge.getCss()
    editorBridge.setCss(globalCss + '\n' + existing)
  }

  /* ── Page management ── */
  const handleAddPage = () => {
    const name = `Page ${pages.length + 1}`
    editorBridge.addPage(name)
    refreshPages()
  }

  const handleSelectPage = (id: string) => {
    editorBridge.selectPage(id)
    setSelectedPageId(id)
  }

  const handleRemovePage = (id: string) => {
    if (pages.length <= 1) return
    editorBridge.removePage(id)
    refreshPages()
  }

  const [exportedBackendFiles, setExportedBackendFiles] = useState<Record<string, string>>({})
  const [exportedFrontendHtml, setExportedFrontendHtml] = useState('')
  const [exportedFrontendCss, setExportedFrontendCss] = useState('')

  const handleExport = () => {
    setExportError(null)
    setExportedBackendFiles(generateBackendFiles(useBackendGraphStore.getState()))
    setExportedFrontendHtml(editorBridge.getHtml())
    setExportedFrontendCss(editorBridge.getCss())
    setShowFullProject(true)
  }

  const openPreview = () => {
    setExportError(null)
    const html = editorBridge.getHtml()
    const css = editorBridge.getCss()
    const previewWindow = window.open('about:blank', '_blank')
    if (!previewWindow) {
      setExportError('Preview blocked. Allow popups and try again.')
      return
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html')
    parsed.querySelectorAll('script').forEach((node) => node.remove())
    parsed.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes)
        .filter((attribute) => attribute.name.toLowerCase().startsWith('on'))
        .forEach((attribute) => node.removeAttribute(attribute.name))
    })

    const safeCss = css.replace(/<\/?script/gi, '').replace(/<\/style/gi, '<\\/style')
    const previewDoc = `<!doctype html><html><head><meta charset='utf-8' /><meta name='viewport' content='width=device-width, initial-scale=1' /><style>${safeCss}</style></head><body>${parsed.body.innerHTML}</body></html>`
    const previewDocAttr = previewDoc
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    previewWindow.document.write(`<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>html,body{margin:0;min-height:100%;background:#0f0f11;}iframe{width:100vw;height:100vh;border:0;display:block;}</style></head><body><iframe sandbox="" srcdoc="${previewDocAttr}"></iframe></body></html>`)
    previewWindow.document.close()
    previewWindow.focus()
  }

  const panelTitle: Record<LeftRailId, string> = {
    add: 'Add Elements',
    templates: 'Templates',
    pages: 'Pages',
    layers: 'Layers',
    global: 'Global Styles',
    code: 'Code',
    routes: 'Routes',
    backend: 'Backend',
  }

  const deviceInfo = DEVICE_INFO[activeDevice] ?? DEVICE_INFO.Desktop

  return (
    <div className="h-screen flex flex-col bg-[#111113] text-zinc-200 overflow-hidden" data-testid="builder-studio-shell">
      {/* ═══ Top bar ═══ */}
      <TopBar
        onExport={handleExport}
        exportError={exportError}
        onUndo={editorBridge.undo}
        onRedo={editorBridge.redo}
        onToggleAssistant={() => setAssistantOpen((prev) => !prev)}
        onPreview={openPreview}
        onPublish={() => setShowDeploy(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ Left icon rail ═══ */}
        <aside
          data-testid={BUILDER_TEST_IDS.commandRail}
          className={`${BUILDER_LAYOUT.commandRailWidth} flex-shrink-0 bg-[#18181b] border-r border-[#232326] flex flex-col items-center pt-2 gap-0.5 overflow-y-auto overflow-x-hidden`}
          aria-label="Builder command rail"
        >
          {LEFT_RAIL_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => toggleRail(item.id)}
              className={[
                'w-11 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-all duration-100 group',
                activeRail === item.id
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[.04]',
              ].join(' ')}
            >
              <span className="flex items-center justify-center">{item.icon}</span>
              <span className={`text-[8px] font-medium leading-none ${activeRail === item.id ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'
                }`}>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* ═══ Left panel (collapsible) ═══ */}
        <div
          className="flex-shrink-0 bg-[#1b1b1f] border-r border-[#232326] flex flex-col overflow-hidden transition-[width] duration-150"
          style={{ width: activeRail !== null && activeRail !== 'backend' ? 280 : 0 }}
        >
          <div className="flex items-center justify-between px-4 h-10 border-b border-[#232326] flex-shrink-0">
            <span className="text-[12px] font-semibold text-zinc-300">{activeRail ? panelTitle[activeRail] : ''}</span>
            <button
              type="button"
              aria-label="Close panel"
              onClick={() => {
                setBlockSearch('')
                setActiveRail(null)
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div className="px-4 pt-3 pb-2 border-b border-[#232326] flex-shrink-0" style={{ display: activeRail === 'add' || activeRail === 'templates' ? 'block' : 'none' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#111113] border border-[#2a2a2e]">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#666" strokeWidth="1.5"><circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" strokeLinecap="round" /></svg>
              <input
                type="text"
                value={blockSearch}
                onChange={(e) => setBlockSearch(e.target.value)}
                placeholder="Search elements"
                className="w-full bg-transparent text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div
              ref={setBlocksContainerEl}
              className="h-full overflow-y-auto"
              style={{ display: activeRail === 'add' || activeRail === 'templates' ? 'block' : 'none' }}
            />
            <div
              ref={setLayersContainerEl}
              className="h-full overflow-y-auto"
              style={{ display: activeRail === 'layers' ? 'block' : 'none' }}
            />

            <div className="p-3" style={{ display: activeRail === 'pages' ? 'block' : 'none' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Pages</span>
                <button
                  type="button"
                  onClick={handleAddPage}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                >
                  + New Page
                </button>
              </div>
              <div className="space-y-1">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={`flex items-center justify-between p-2.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${selectedPageId === page.id
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                        : 'bg-[#1e1e22] border border-transparent text-zinc-400 hover:bg-[#262629] hover:text-zinc-300'
                      }`}
                    onClick={() => handleSelectPage(page.id)}
                  >
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 1h6l4 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" /><path d="M10 1v3h4" /></svg>
                      {page.name}
                    </div>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemovePage(page.id) }}
                        className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete page"
                      >
                        <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 flex flex-col gap-3" style={{ display: activeRail === 'global' ? 'flex' : 'none' }}>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Custom CSS</p>
              <textarea
                value={globalCss}
                onChange={(e) => setGlobalCss(e.target.value)}
                placeholder={`:root {\n  --primary: #3b82f6;\n  --bg: #ffffff;\n}\n\nbody {\n  font-family: sans-serif;\n}`}
                className="w-full h-48 resize-none rounded-md bg-[#111113] border border-[#2a2a2e] px-3 py-2 text-[11px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/50"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={applyGlobalStyles}
                className="w-full py-1.5 rounded-md text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                Apply Global Styles
              </button>
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                CSS variables and global rules applied to your project. These styles are prepended to your stylesheet.
              </p>
            </div>

            <div className="flex flex-col h-full" style={{ display: activeRail === 'code' ? 'flex' : 'none' }}>
              <div className="flex border-b border-[#232326] flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCodeTab('html')}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider text-center transition-colors ${codeTab === 'html' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('css')}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider text-center transition-colors ${codeTab === 'css' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                >
                  CSS
                </button>
              </div>
              <textarea
                value={codeTab === 'html' ? codeHtml : codeCss}
                onChange={(e) => codeTab === 'html' ? setCodeHtml(e.target.value) : setCodeCss(e.target.value)}
                className="flex-1 min-h-[200px] resize-none bg-[#111113] px-3 py-2 text-[11px] font-mono text-zinc-300 focus:outline-none leading-relaxed"
                spellCheck={false}
              />
              <div className="p-2 border-t border-[#232326] flex gap-2">
                <button
                  type="button"
                  onClick={applyCode}
                  className="flex-1 py-1.5 rounded-md text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
                >
                  Apply Changes
                </button>
                <button
                  type="button"
                  onClick={() => { setCodeHtml(editorBridge.getHtml()); setCodeCss(editorBridge.getCss()) }}
                  className="flex-1 py-1.5 rounded-md text-[10px] font-medium text-zinc-400 bg-[#1e1e22] hover:bg-[#262629] transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Routes sidebar content */}
            <div className="flex flex-col h-full" style={{ display: activeRail === 'routes' ? 'flex' : 'none' }}>
              <RoutesSidebarContent />
            </div>

          </div>
        </div>

        {/* ═══ Primary workspace ═══ */}
        <section
          data-testid={BUILDER_TEST_IDS.primaryWorkspace}
          className="flex-1 min-w-0 flex flex-col overflow-hidden"
        >
          {activeRail === 'backend' && <BackendPanel />}
          {activeRail === 'routes' && <RoutesPanel />}

          {/* Canvas — always mounted so editorBridge stays live */}
          <section
            data-testid="builder-canvas-panel"
            className="flex-1 flex flex-col overflow-hidden"
            style={{ display: activeRail === 'backend' || activeRail === 'routes' ? 'none' : undefined }}
          >
            <GrapesCanvas
              className="flex-1 w-full h-full"
              onEditorReady={setEditorBridge}
              blocksContainer={blocksContainerEl}
              layersContainer={layersContainerEl}
              rightPanelOpen={rightPanelOpen}
              onToggleRightPanel={() => setRightPanelOpen((prev) => !prev)}
            />
          </section>

          {activeRail !== 'backend' && activeRail !== 'routes' && (
            <>
              {/* ═══ Bottom bar — device switcher + zoom ═══ */}
              <div className="h-7 flex-shrink-0 flex items-center px-3 gap-3 bg-[#18181b] border-t border-[#232326] text-zinc-600">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Desktop"
                    onClick={() => handleDeviceSwitch('Desktop')}
                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${activeDevice === 'Desktop' ? 'text-blue-400 bg-blue-500/10' : 'hover:text-zinc-400 hover:bg-white/5'}`}
                  >
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="9" rx="1.5" /><path d="M5 13h6" /><path d="M8 11v2" /></svg>
                  </button>
                  <button
                    type="button"
                    title="Tablet"
                    onClick={() => handleDeviceSwitch('Tablet')}
                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${activeDevice === 'Tablet' ? 'text-blue-400 bg-blue-500/10' : 'hover:text-zinc-400 hover:bg-white/5'}`}
                  >
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="1" width="10" height="14" rx="1.5" /><circle cx="8" cy="13" r=".5" fill="currentColor" /></svg>
                  </button>
                  <button
                    type="button"
                    title="Mobile"
                    onClick={() => handleDeviceSwitch('Mobile')}
                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${activeDevice === 'Mobile' ? 'text-blue-400 bg-blue-500/10' : 'hover:text-zinc-400 hover:bg-white/5'}`}
                  >
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="1" width="8" height="14" rx="1.5" /><circle cx="8" cy="13" r=".5" fill="currentColor" /></svg>
                  </button>
                </div>

                <div className="w-px h-3.5 bg-[#2a2a2e]" />
                <span className="text-[10px] text-zinc-500">{deviceInfo.label} · {deviceInfo.width}</span>
                <div className="flex-1" />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-600">Page</span>
                  <span className="text-[10px] text-zinc-700">›</span>
                  <span className="text-[10px] text-blue-400">Body</span>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ═══ AI Assistant panel ═══ */}
        <aside
          data-testid={BUILDER_TEST_IDS.assistantWorkspace}
          className={`${assistantOpen ? `${BUILDER_LAYOUT.assistantPanelWidth} max-w-[38vw]` : 'w-0'} flex-shrink-0 bg-[#1b1b1f] border-l border-[#232326] overflow-hidden transition-[width] duration-150`}
        >
          <aside
            data-testid="builder-chat-panel"
            className="h-full flex flex-col overflow-hidden"
            style={{ display: assistantOpen ? 'flex' : 'none' }}
          >
            <ChatPanel
              getHtml={editorBridge.getHtml}
              getCss={editorBridge.getCss}
              setHtml={editorBridge.setHtml}
              setCss={editorBridge.setCss}
              editor={editorBridge.editor}
            />
          </aside>
        </aside>
      </div>

      {showDeploy && editorBridge && (
        <DeployToVercelModal
          onClose={() => setShowDeploy(false)}
          editorBridge={editorBridge}
        />
      )}

      {/* ═══ Full Project Code modal ═══ */}
      <FullProjectModal
        open={showFullProject}
        onClose={() => setShowFullProject(false)}
        frontendHtml={exportedFrontendHtml}
        frontendCss={exportedFrontendCss}
        backendFiles={exportedBackendFiles}
      />
    </div>
  )
}
