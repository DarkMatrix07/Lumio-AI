'use client'

import { useMemo } from 'react'

import type { LumioGraphNode } from '@/types/lumio'
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
  Relation: ['fromModelId', 'toModelId'],
  JWT: ['secretEnv'],
  ApiKey: ['headerName'],
  OAuth: ['provider'],
  Session: ['secretEnv'],
  IfElse: ['condition'],
  Loop: ['iterable'],
  TryCatch: ['tryLabel'],
  Validation: ['schema'],
  CORS: ['origin'],
  RateLimit: ['limit', 'windowMs'],
  Logger: ['level'],
  CustomMiddleware: ['name'],
  EnvVar: ['key', 'value'],
  Template: ['templateKind'],
}

const formatFieldLabel = (field: string) =>
  field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase())
    .trim()

type BackendPropertiesProps = {
  node: LumioGraphNode | null
}

export function BackendProperties({ node }: BackendPropertiesProps) {
  const updateNodeConfig = useBackendGraphStore((state) => state.updateNodeConfig)

  const fields = useMemo(() => {
    if (!node) {
      return []
    }

    return INPUT_FIELDS_BY_TYPE[node.type] ?? []
  }, [node])

  if (!node) {
    return <p className="px-3 py-3 text-xs text-zinc-600">Select a node to edit its properties.</p>
  }

  return (
    <div className="space-y-2.5 p-3">
      {fields.length === 0 ? <p className="text-xs text-zinc-600">No editable properties for this node.</p> : null}
      {fields.map((field) => {
        const selectOptions = SELECT_OPTIONS_BY_FIELD[field]
        const currentValue = String(node.config[field] ?? '')
        const onChange = (value: string) => updateNodeConfig(node.id, { [field]: value })
        const label = formatFieldLabel(field)

        return (
          <label key={field} className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
            {selectOptions ? (
              <select
                aria-label={label}
                className="rounded border border-[#444] bg-[#1a1a1a] px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                value={currentValue}
                onChange={(event) => onChange(event.target.value)}
              >
                {selectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={label}
                className="rounded border border-[#444] bg-[#1a1a1a] px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                value={currentValue}
                onChange={(event) => onChange(event.target.value)}
              />
            )}
          </label>
        )
      })}
    </div>
  )
}
