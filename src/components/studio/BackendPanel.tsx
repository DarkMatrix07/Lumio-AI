'use client'

import { useMemo, useState } from 'react'

import { BACKEND_PALETTE_ITEMS, BACKEND_PALETTE_SECTIONS, createBackendPaletteNode } from '@/components/studio/backend-palette'
import { BackendProperties } from '@/components/studio/backend-properties'
import { useBackendGraphStore } from '@/store/backend-graph-store'

const SECTION_LABEL_COLORS = {
  Endpoints: 'text-blue-400',
  Data: 'text-emerald-400',
  Security: 'text-amber-400',
  Logic: 'text-rose-400',
  Middleware: 'text-purple-400',
  Templates: 'text-orange-400',
} as const

const SECTION_BUTTON_COLORS = {
  Endpoints: 'bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 border-blue-500/20',
  Data: 'bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 border-emerald-500/20',
  Security: 'bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 border-amber-500/20',
  Logic: 'bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 border-rose-500/20',
  Middleware: 'bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 border-purple-500/20',
  Templates: 'bg-orange-500/10 text-orange-200 hover:bg-orange-500/20 border-orange-500/20',
} as const

const buildNodeId = (type: string, count: number) => `${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(count + 1).padStart(3, '0')}`

export function BackendPanel() {
  const [query, setQuery] = useState('')
  const nodes = useBackendGraphStore((state) => state.nodes)
  const selectedNodeId = useBackendGraphStore((state) => state.selectedNodeId)
  const addNode = useBackendGraphStore((state) => state.addNode)
  const setSelectedNodeId = useBackendGraphStore((state) => state.setSelectedNodeId)

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return BACKEND_PALETTE_ITEMS
    }

    return BACKEND_PALETTE_ITEMS.filter((item) => item.label.toLowerCase().includes(normalizedQuery) || item.type.toLowerCase().includes(normalizedQuery))
  }, [query])

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId])

  return (
    <section data-testid="backend-panel" className="h-full min-h-0 bg-[#111113] text-zinc-200">
      <div className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="flex min-h-0 flex-col border-r border-[#232326] bg-[#1b1b1f]">
          <div className="border-b border-[#232326] px-4 py-3">
            <p className="text-[12px] font-semibold text-zinc-300">Backend</p>
          </div>
          <div className="border-b border-[#232326] px-4 py-3">
            <div className="flex items-center gap-2 rounded-md border border-[#2a2a2e] bg-[#111113] px-3 py-2">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#666" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3" strokeLinecap="round"/></svg>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search backend blocks"
                className="w-full bg-transparent text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-4">
              {BACKEND_PALETTE_SECTIONS.map((section) => {
                const sectionItems = filteredItems.filter((item) => item.section === section)
                if (sectionItems.length === 0) {
                  return null
                }

                return (
                  <section key={section} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className={`text-[10px] font-semibold uppercase tracking-widest ${SECTION_LABEL_COLORS[section]}`}>
                        {section}
                      </p>
                      <span className="text-[10px] text-zinc-600">{sectionItems.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {sectionItems.map((item) => (
                        <button
                          key={`${item.section}-${item.label}`}
                          type="button"
                          aria-label={`Add ${item.label}`}
                          className={`rounded-md border px-2 py-2 text-left text-[11px] font-medium transition-colors ${SECTION_BUTTON_COLORS[item.section]}`}
                          onClick={() => {
                            const node = createBackendPaletteNode(item, buildNodeId(item.type, nodes.length))
                            addNode(node)
                            if (node.type !== 'Template') {
                              setSelectedNodeId(node.id)
                            }
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
              {filteredItems.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#2a2a2e] bg-[#151518] px-3 py-4 text-center text-xs text-zinc-600">
                  No backend blocks match this search.
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-[#111113]">
          <div className="border-b border-[#232326] px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-zinc-300">Backend Services</p>
              <button
                type="button"
                onClick={() => {
                  const defaultItem = BACKEND_PALETTE_ITEMS.find((item) => item.type === 'GET')
                  if (!defaultItem) {
                    return
                  }
                  const node = createBackendPaletteNode(defaultItem, buildNodeId(defaultItem.type, nodes.length))
                  addNode(node)
                  setSelectedNodeId(node.id)
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-500"
              >
                Add Service
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {nodes.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[#2a2a2e] bg-[#151518] px-6 text-center">
                <p className="text-sm font-medium text-zinc-300">No backend services yet</p>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-600">
                  Create your first service container to start building your backend.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-[#232326] bg-[#17171a] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Services</p>
                    <span className="text-[10px] text-zinc-600">{nodes.length} nodes</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {nodes.map((node) => {
                    const isSelected = node.id === selectedNodeId
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className={[
                          'flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors',
                          isSelected ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-[#232326] bg-[#17171a] text-zinc-300 hover:bg-[#1d1d21]',
                        ].join(' ')}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{node.label}</span>
                          <span className="block text-[10px] uppercase tracking-widest text-zinc-500">{node.type}</span>
                        </span>
                        <span className="text-[10px] text-zinc-600">{node.id}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="flex min-h-0 flex-col border-l border-[#232326] bg-[#1b1b1f]">
          <div className="border-b border-[#232326] px-4 py-3">
            <p className="text-[12px] font-semibold text-zinc-300">Hierarchy ({nodes.length})</p>
          </div>
          <div className="border-b border-[#232326] px-3 py-3">
            {nodes.length === 0 ? (
              <p className="text-xs text-zinc-600">No services in the backend graph yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {nodes.map((node) => {
                  const isSelected = node.id === selectedNodeId
                  return (
                    <li key={`hierarchy-${node.id}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className={[
                          'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs transition-colors',
                          isSelected ? 'bg-blue-500/10 text-blue-200' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-300',
                        ].join(' ')}
                      >
                        <span className="truncate">{node.label}</span>
                        <span className="ml-2 shrink-0 text-[10px] uppercase tracking-widest text-zinc-600">{node.type}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <section className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-[#232326] px-4 py-3">
              <p className="text-[12px] font-semibold text-zinc-300">Properties{selectedNode ? `: ${selectedNode.label}` : ''}</p>
            </div>
            <BackendProperties node={selectedNode} />
          </section>
        </aside>
      </div>
    </section>
  )
}
