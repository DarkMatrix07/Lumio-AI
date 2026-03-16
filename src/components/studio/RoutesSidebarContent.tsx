'use client'

import { useMemo } from 'react'
import { usePagesStore } from '@/store/pages-store'
import { useRoutesGraphStore } from '@/store/routes-graph-store'
import { useBackendGraphStore } from '@/store/backend-graph-store'
import type { LumioGraphNode } from '@/types/lumio'

/* ── Detect interactive elements from HTML ── */
function detectPageElements(html: string): string[] {
  const elements: string[] = []
  if (typeof window === 'undefined') return ['Navigate here']
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html || '<div></div>', 'text/html')
    doc.querySelectorAll('button, [type="button"], [type="submit"]').forEach((el, i) => elements.push(el.textContent?.trim() || `Button ${i + 1}`))
    doc.querySelectorAll('form').forEach((_, i) => elements.push(`Form ${i + 1} > Submit`))
    doc.querySelectorAll('a[href]').forEach((el, i) => elements.push(el.textContent?.trim() || `Link ${i + 1}`))
    doc.querySelectorAll('img').forEach((el, i) => elements.push(`Image: ${(el as HTMLImageElement).alt || String(i + 1)}`))
  } catch { /* ignore */ }
  if (elements.length === 0) elements.push('Navigate here')
  return elements
}

/* ── Derive services ── */
type DerivedService = { id: string; label: string; port: number; endpoints: string[]; authNodes: string[]; nodeCount: number; color: string }

const AUTH_NODE_TYPES = new Set(['JWT', 'ApiKey', 'OAuth', 'Session'])
const ENDPOINT_TYPES = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])

function deriveServices(nodes: LumioGraphNode[]): DerivedService[] {
  const serviceMap = new Map<string, { nodes: LumioGraphNode[]; label: string; port: number; color: string }>()

  for (const node of nodes) {
    let key: string, label: string, port: number, color: string

    if (node.type === 'Template') {
      const kind = node.config.templateKind as string
      if (kind === 'AuthSystem') { key = 'auth'; label = 'Auth Service'; port = 3001; color = '#f59e0b' }
      else if (kind === 'CrudApi') { key = 'crud'; label = 'CRUD API'; port = 3002; color = '#60a5fa' }
      else if (kind === 'ChatSystem') { key = 'chat'; label = 'Chat Service'; port = 3003; color = '#a78bfa' }
      else { key = 'api'; label = 'API Service'; port = 3000; color = '#34d399' }
    } else if (AUTH_NODE_TYPES.has(node.type)) {
      key = 'auth'; label = 'Auth Service'; port = 3001; color = '#f59e0b'
    } else {
      key = 'api'; label = 'API Service'; port = 3000; color = '#34d399'
    }

    const existing = serviceMap.get(key)
    if (existing) { existing.nodes.push(node) }
    else { serviceMap.set(key, { nodes: [node], label, port, color }) }
  }

  return Array.from(serviceMap.entries()).map(([key, val]) => ({
    id: key,
    label: val.label,
    port: val.port,
    endpoints: val.nodes.filter((n) => ENDPOINT_TYPES.has(n.type)).map((n) => `${n.type} ${(n.config.path as string) || `/${n.label.toLowerCase()}`}`),
    authNodes: val.nodes.filter((n) => AUTH_NODE_TYPES.has(n.type)).map((n) => n.type),
    nodeCount: val.nodes.length,
    color: val.color,
  }))
}

export function RoutesSidebarContent() {
  const pages = usePagesStore((s) => s.pages)
  const addPageNode = useRoutesGraphStore((s) => s.addPageNode)
  const backendNodes = useBackendGraphStore((s) => s.nodes)
  const addServiceNode = useRoutesGraphStore((s) => s.addServiceNode)
  const services = useMemo(() => deriveServices(backendNodes), [backendNodes])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Pages ── */}
      <div className="flex-1 min-h-0 flex flex-col border-b border-[#2a2a2e]">
        <div className="flex items-center gap-2 px-3 h-9 border-b border-[#232326] flex-shrink-0">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#71717a" strokeWidth="1.5">
            <path d="M5 2h7l3 3v9a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" />
            <path d="M12 2v3h3" />
          </svg>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex-1">Pages</span>
          <span className="text-[9px] text-zinc-600 bg-[#1e1e22] border border-[#2a2a2e] rounded px-1.5 py-px">{pages.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pages.length === 0 ? (
            <p className="text-[10px] text-zinc-600 text-center py-4">No pages yet</p>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                className="group flex items-center gap-2 p-2 rounded-md bg-[#1e1e24] border border-[#2a2a30] hover:border-indigo-500/30 hover:bg-[#22222a] transition-all duration-150"
              >
                <div className="w-5 h-5 rounded bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="#818cf8" strokeWidth="1.5">
                    <rect x="2" y="1" width="10" height="13" rx="1" />
                    <line x1="5" y1="5" x2="9" y2="5" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-zinc-200 leading-tight truncate">{page.name}</div>
                  <div className="text-[9px] font-mono text-zinc-600 truncate">{page.path}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); addPageNode({ id: page.id, name: page.name, path: page.path, elements: detectPageElements('') }) }}
                  className="text-[9px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded px-2 py-0.5 cursor-pointer flex-shrink-0 hover:bg-indigo-500/20 transition-all opacity-0 group-hover:opacity-100"
                >
                  + Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Services ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 h-9 border-b border-[#232326] flex-shrink-0">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#71717a" strokeWidth="1.5">
            <rect x="1" y="2" width="14" height="4" rx="1" />
            <rect x="1" y="9" width="14" height="4" rx="1" />
          </svg>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex-1">Services</span>
          {services.length > 0 && (
            <span className="text-[9px] text-zinc-600 bg-[#1e1e22] border border-[#2a2a2e] rounded px-1.5 py-px">{services.length}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {services.length === 0 ? (
            <p className="text-[10px] text-zinc-600 text-center py-4">Add nodes in the Backend tab</p>
          ) : (
            services.map((svc) => (
              <div key={svc.id} className="group rounded-md border border-[#2a3530] bg-[#1a1f1e] hover:border-emerald-500/30 transition-all duration-150">
                <div className="flex items-center gap-2 px-2.5 pt-2 pb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: svc.color, boxShadow: `0 0 6px ${svc.color}40` }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-zinc-200 leading-tight truncate">{svc.label}</div>
                    <div className="flex items-center gap-1.5 mt-px">
                      <span className="text-[9px] font-mono text-emerald-400/70">:{svc.port}</span>
                      <span className="text-[9px] text-zinc-600">{svc.nodeCount} node{svc.nodeCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                {svc.endpoints.length > 0 && (
                  <div className="px-2.5 pb-1">
                    {svc.endpoints.slice(0, 3).map((ep, i) => (
                      <div key={i} className="text-[9px] font-mono text-zinc-600 truncate py-px">{ep}</div>
                    ))}
                    {svc.endpoints.length > 3 && <div className="text-[9px] text-zinc-700">+{svc.endpoints.length - 3} more</div>}
                  </div>
                )}
                <div className="px-2.5 pb-2 pt-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addServiceNode({ id: svc.id, label: svc.label, port: svc.port, endpoints: svc.endpoints, authNodes: svc.authNodes }) }}
                    className="w-full text-[9px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded py-1 cursor-pointer hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1"
                  >
                    <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="3" x2="8" y2="13" strokeLinecap="round" />
                      <line x1="3" y1="8" x2="13" y2="8" strokeLinecap="round" />
                    </svg>
                    Integrate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
