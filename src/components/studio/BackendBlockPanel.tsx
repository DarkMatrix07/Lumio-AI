'use client'

import { useMemo, useState } from 'react'

import type { LumioGraphNode, LumioNodeType, LumioTemplateKind } from '@/types/lumio'
import { useBackendGraphStore } from '@/store/backend-graph-store'

type BlockDef = {
  type: LumioNodeType
  label: string
  category: 'Endpoints' | 'Data' | 'Security' | 'Middleware' | 'Templates'
  templateKind?: LumioTemplateKind
}

const BLOCK_DEFS: BlockDef[] = [
  { type: 'GET', label: 'GET', category: 'Endpoints' },
  { type: 'POST', label: 'POST', category: 'Endpoints' },
  { type: 'PUT', label: 'PUT', category: 'Endpoints' },
  { type: 'DELETE', label: 'DELETE', category: 'Endpoints' },
  { type: 'PATCH', label: 'PATCH', category: 'Endpoints' },
  { type: 'Model', label: 'Model', category: 'Data' },
  { type: 'Relation', label: 'Relation', category: 'Data' },
  { type: 'JWT', label: 'JWT', category: 'Security' },
  { type: 'CORS', label: 'CORS', category: 'Security' },
  { type: 'RateLimit', label: 'Rate Limit', category: 'Security' },
  { type: 'Logger', label: 'Logger', category: 'Middleware' },
  { type: 'CustomMiddleware', label: 'Middleware', category: 'Middleware' },
  { type: 'EnvVar', label: 'Env Var', category: 'Middleware' },
  { type: 'Template', label: 'Auth System', category: 'Templates', templateKind: 'AuthSystem' },
  { type: 'Template', label: 'CRUD API', category: 'Templates', templateKind: 'CrudApi' },
  { type: 'Template', label: 'Chat System', category: 'Templates', templateKind: 'ChatSystem' },
]

const CATEGORIES: BlockDef['category'][] = ['Endpoints', 'Data', 'Security', 'Middleware', 'Templates']

const CATEGORY_COLORS: Record<BlockDef['category'], string> = {
  Endpoints: 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/30',
  Data: 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/30',
  Security: 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30',
  Middleware: 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-purple-500/30',
  Templates: 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border-orange-500/30',
}

const CATEGORY_LABEL_COLORS: Record<BlockDef['category'], string> = {
  Endpoints: 'text-blue-400',
  Data: 'text-emerald-400',
  Security: 'text-amber-400',
  Middleware: 'text-purple-400',
  Templates: 'text-orange-400',
}

const nextNodeId = (type: LumioNodeType): string =>
  `${type.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`

const createNode = (block: BlockDef): LumioGraphNode => {
  const id = nextNodeId(block.type)

  if (block.type === 'Template') {
    return {
      id,
      type: 'Template',
      label: block.label,
      config: { templateKind: block.templateKind ?? 'CrudApi' },
    }
  }

  return { id, type: block.type, label: block.label, config: {} }
}

export function BackendBlockPanel() {
  const [query, setQuery] = useState('')
  const addNode = useBackendGraphStore((state) => state.addNode)
  const setSelectedNodeId = useBackendGraphStore((state) => state.setSelectedNodeId)

  const filteredBlocks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return BLOCK_DEFS
    return BLOCK_DEFS.filter(
      (block) => block.label.toLowerCase().includes(q) || block.type.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <section data-testid="backend-block-panel" className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#333]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Backend Blocks</p>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-[#333]">
        <input
          className="w-full rounded bg-[#1a1a1a] border border-[#444] px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          placeholder="Search blocks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Block list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {CATEGORIES.map((category) => {
          const blocks = filteredBlocks.filter((b) => b.category === category)
          if (blocks.length === 0) return null

          return (
            <div key={category}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${CATEGORY_LABEL_COLORS[category]}`}>
                {category}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {blocks.map((block) => (
                  <button
                    key={`${category}-${block.label}`}
                    className={`rounded border px-2 py-1.5 text-left text-[11px] font-medium transition-colors cursor-pointer ${CATEGORY_COLORS[category]}`}
                    type="button"
                    aria-label={`Add ${block.label}`}
                    onClick={() => {
                      const node = createNode(block)
                      addNode(node)
                      if (node.type !== 'Template') setSelectedNodeId(node.id)
                    }}
                  >
                    {block.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
