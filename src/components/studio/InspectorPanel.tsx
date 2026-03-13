'use client'

import { useMemo } from 'react'

import { useBackendGraphStore } from '@/store/backend-graph-store'

const TEMPLATE_KIND_OPTIONS = ['AuthSystem', 'CrudApi', 'ChatSystem'] as const

const SELECT_OPTIONS_BY_FIELD: Record<string, readonly string[]> = {
  templateKind: TEMPLATE_KIND_OPTIONS,
}

const INPUT_FIELDS_BY_TYPE: Record<string, string[]> = {
  GET: ['path'],
  POST: ['path'],
  PUT: ['path'],
  DELETE: ['path'],
  PATCH: ['path'],
  Model: ['model'],
  EnvVar: ['key', 'value'],
  Relation: ['fromModelId', 'toModelId'],
  JWT: ['secretEnv'],
  CORS: ['origin'],
  RateLimit: ['limit', 'windowMs'],
  Logger: ['level'],
  CustomMiddleware: ['name'],
  Template: ['templateKind'],
}

export function InspectorPanel() {
  const nodes = useBackendGraphStore((state) => state.nodes)
  const selectedNodeId = useBackendGraphStore((state) => state.selectedNodeId)
  const updateNodeConfig = useBackendGraphStore((state) => state.updateNodeConfig)

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  )

  return (
    <section data-testid="inspector-panel" className="border-t border-[#333]">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#333]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Inspector{selectedNode ? `: ${selectedNode.label}` : ''}
        </p>
      </div>

      {!selectedNode ? (
        <p className="px-3 py-3 text-xs text-zinc-600">Select a block to configure it.</p>
      ) : (
        <div className="p-3 space-y-2.5">
          {(INPUT_FIELDS_BY_TYPE[selectedNode.type] ?? []).map((field) => {
            const selectOptions = SELECT_OPTIONS_BY_FIELD[field]
            const currentValue = String(selectedNode.config[field] ?? '')
            const onChange = (value: string) => updateNodeConfig(selectedNode.id, { [field]: value })

            return (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{field}</span>
                {selectOptions ? (
                  <select
                    className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                    value={currentValue}
                    onChange={(e) => onChange(e.target.value)}
                  >
                    {selectOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                    value={currentValue}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              </label>
            )
          })}
        </div>
      )}
    </section>
  )
}
