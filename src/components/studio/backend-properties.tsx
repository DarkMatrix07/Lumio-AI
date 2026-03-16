'use client'

import { useMemo } from 'react'

import type { LumioGraphNode, ModelField, QueryParam, ResponseStatus } from '@/types/lumio'
import { MODEL_FIELD_TYPES, LUMIO_ENDPOINT_TYPES } from '@/types/lumio'
import { useBackendGraphStore } from '@/store/backend-graph-store'

const TEMPLATE_KIND_OPTIONS = ['AuthSystem', 'CrudApi', 'ChatSystem'] as const
const RELATION_TYPE_OPTIONS = ['one-to-one', 'one-to-many', 'many-to-many'] as const

const SELECT_OPTIONS_BY_FIELD: Record<string, readonly string[]> = {
  templateKind: TEMPLATE_KIND_OPTIONS,
  relationType: RELATION_TYPE_OPTIONS,
}

const INPUT_FIELDS_BY_TYPE: Record<string, string[]> = {
  Relation: ['fromModelId', 'toModelId', 'relationType'],
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

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const ENDPOINT_TYPE_SET = new Set<string>(LUMIO_ENDPOINT_TYPES)

const AUTH_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'jwt', label: 'JWT' },
  { value: 'apikey', label: 'API Key' },
  { value: 'session', label: 'Session' },
  { value: 'oauth', label: 'OAuth' },
] as const

const QUERY_PARAM_TYPE_OPTIONS = ['string', 'number', 'boolean'] as const

// Methods that accept a request body
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH'])
// Methods that show query params
const QUERY_PARAM_METHODS = new Set(['GET', 'DELETE', 'PATCH'])

const generateId = (): string =>
  `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const sectionTitleCls = 'text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mt-3 mb-1'

const formatFieldLabel = (field: string) =>
  field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase())
    .trim()

const generateFieldId = (): string =>
  `field-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const sharedInputClass =
  'rounded border border-[#444] bg-[#1a1a1a] px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none'

// ---- Model field editor sub-component ----

type ModelFieldEditorProps = {
  fields: ModelField[]
  onUpdate: (fields: ModelField[]) => void
}

function ModelFieldEditor({ fields, onUpdate }: ModelFieldEditorProps) {
  const addField = () => {
    const newField: ModelField = {
      id: generateFieldId(),
      name: '',
      type: 'String',
      required: true,
    }
    onUpdate([...fields, newField])
  }

  const updateField = (id: string, patch: Partial<ModelField>) => {
    onUpdate(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  const removeField = (id: string) => {
    onUpdate(fields.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Fields</span>
        <button
          type="button"
          onClick={addField}
          className="rounded border border-[#444] bg-[#252525] px-2 py-0.5 text-[10px] text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
        >
          + Add Field
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-[10px] text-zinc-600 italic">No fields defined. Click &ldquo;+ Add Field&rdquo; to begin.</p>
      )}

      <div className="space-y-1.5">
        {fields.map((field) => {
          const isValidName = field.name === '' || IDENTIFIER_PATTERN.test(field.name)
          return (
            <div
              key={field.id}
              className="flex items-center gap-1.5 rounded border border-[#333] bg-[#141414] px-2 py-1.5"
            >
              <input
                aria-label="Field name"
                placeholder="fieldName"
                value={field.name}
                onChange={(e) => updateField(field.id, { name: e.target.value })}
                className={`${sharedInputClass} w-24 flex-shrink-0 ${!isValidName ? 'border-red-600' : ''}`}
              />

              <select
                aria-label="Field type"
                value={field.type}
                onChange={(e) => updateField(field.id, { type: e.target.value as ModelField['type'] })}
                className={`${sharedInputClass} flex-1 min-w-0`}
              >
                {MODEL_FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1 cursor-pointer flex-shrink-0" title="Required">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  className="accent-zinc-400 h-3 w-3"
                />
                <span className="text-[10px] text-zinc-500 select-none">req</span>
              </label>

              <button
                type="button"
                onClick={() => removeField(field.id)}
                aria-label="Delete field"
                className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors text-xs leading-none px-0.5"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Endpoint node editor ----

type EndpointPropertiesProps = {
  node: LumioGraphNode
}

function EndpointProperties({ node }: EndpointPropertiesProps) {
  const updateNodeConfig = useBackendGraphStore((state) => state.updateNodeConfig)

  const cfg = node.config
  const method = node.type

  const path = typeof cfg['path'] === 'string' ? cfg['path'] : ''
  const description = typeof cfg['description'] === 'string' ? cfg['description'] : ''
  const auth = typeof cfg['auth'] === 'string' ? cfg['auth'] : 'none'
  const requestBody = typeof cfg['requestBody'] === 'string' ? cfg['requestBody'] : ''
  const responseDescription = typeof cfg['responseDescription'] === 'string' ? cfg['responseDescription'] : ''
  const tags = typeof cfg['tags'] === 'string' ? cfg['tags'] : ''

  const queryParams: QueryParam[] = Array.isArray(cfg['queryParams'])
    ? (cfg['queryParams'] as QueryParam[])
    : []

  const statuses: ResponseStatus[] = Array.isArray(cfg['statuses'])
    ? (cfg['statuses'] as ResponseStatus[])
    : [{ id: generateId(), code: 200, description: 'OK' }]

  const patch = (partial: Record<string, unknown>) => updateNodeConfig(node.id, partial)

  // Query param helpers
  const addQueryParam = () => {
    const next: QueryParam = { id: generateId(), name: '', type: 'string', required: false }
    patch({ queryParams: [...queryParams, next] })
  }

  const updateQueryParam = (id: string, changes: Partial<QueryParam>) => {
    patch({ queryParams: queryParams.map((p) => (p.id === id ? { ...p, ...changes } : p)) })
  }

  const removeQueryParam = (id: string) => {
    patch({ queryParams: queryParams.filter((p) => p.id !== id) })
  }

  // Status code helpers
  const addStatus = () => {
    const next: ResponseStatus = { id: generateId(), code: 200, description: '' }
    patch({ statuses: [...statuses, next] })
  }

  const updateStatus = (id: string, changes: Partial<ResponseStatus>) => {
    patch({ statuses: statuses.map((s) => (s.id === id ? { ...s, ...changes } : s)) })
  }

  const removeStatus = (id: string) => {
    patch({ statuses: statuses.filter((s) => s.id !== id) })
  }

  const showQueryParams = QUERY_PARAM_METHODS.has(method)
  const showRequestBody = BODY_METHODS.has(method)

  return (
    <div className="space-y-2.5 p-3">
      {/* Path */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Path</span>
        <input
          aria-label="Path"
          className={sharedInputClass}
          value={path}
          placeholder="/users/:id"
          onChange={(e) => patch({ path: e.target.value })}
        />
      </label>

      {/* Description */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Description</span>
        <textarea
          aria-label="Description"
          className={`${sharedInputClass} resize-none`}
          rows={2}
          value={description}
          placeholder="What does this endpoint do?"
          onChange={(e) => patch({ description: e.target.value })}
        />
      </label>

      {/* Auth */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Auth</span>
        <select
          aria-label="Auth"
          className={sharedInputClass}
          value={auth}
          onChange={(e) => patch({ auth: e.target.value })}
        >
          {AUTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* Query Parameters */}
      {showQueryParams && (
        <div>
          <p className={sectionTitleCls}>Query Parameters</p>
          <div className="space-y-2">
            {queryParams.map((param) => (
              <div key={param.id} className="rounded border border-[#333] bg-[#141414] p-2 space-y-1.5">
                <div className="flex gap-1.5">
                  <input
                    aria-label="Param name"
                    className={`${sharedInputClass} flex-1 min-w-0`}
                    value={param.name}
                    placeholder="name"
                    onChange={(e) => updateQueryParam(param.id, { name: e.target.value })}
                  />
                  <select
                    aria-label="Param type"
                    className={`${sharedInputClass} w-24 shrink-0`}
                    value={param.type}
                    onChange={(e) =>
                      updateQueryParam(param.id, { type: e.target.value as QueryParam['type'] })
                    }
                  >
                    {QUERY_PARAM_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Remove query param"
                    className="shrink-0 rounded px-1.5 py-1 text-xs text-zinc-500 hover:bg-[#2a2a2a] hover:text-red-400 transition-colors"
                    onClick={() => removeQueryParam(param.id)}
                  >
                    ✕
                  </button>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-zinc-400"
                    checked={param.required}
                    onChange={(e) => updateQueryParam(param.id, { required: e.target.checked })}
                  />
                  <span className="text-[10px] text-zinc-500">Required</span>
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-1.5 w-full rounded border border-dashed border-[#444] py-1 text-[10px] text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={addQueryParam}
          >
            + Add Query Param
          </button>
        </div>
      )}

      {/* Request Body */}
      {showRequestBody && (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Request Body</span>
          <textarea
            aria-label="Request Body"
            className={`${sharedInputClass} resize-none font-mono`}
            rows={3}
            value={requestBody}
            placeholder={'{ name: string, email: string }'}
            onChange={(e) => patch({ requestBody: e.target.value })}
          />
        </label>
      )}

      {/* Response */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Response</span>
        <textarea
          aria-label="Response"
          className={`${sharedInputClass} resize-none font-mono`}
          rows={3}
          value={responseDescription}
          placeholder={'{ id: string, name: string }'}
          onChange={(e) => patch({ responseDescription: e.target.value })}
        />
      </label>

      {/* Status Codes */}
      <div>
        <p className={sectionTitleCls}>Status Codes</p>
        <div className="space-y-1.5">
          {statuses.map((status) => (
            <div key={status.id} className="flex gap-1.5 items-center">
              <input
                aria-label="Status code"
                type="number"
                className={`${sharedInputClass} w-16 shrink-0`}
                value={status.code}
                min={100}
                max={599}
                onChange={(e) => updateStatus(status.id, { code: Number(e.target.value) })}
              />
              <input
                aria-label="Status description"
                className={`${sharedInputClass} flex-1 min-w-0`}
                value={status.description}
                placeholder="OK"
                onChange={(e) => updateStatus(status.id, { description: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove status"
                className="shrink-0 rounded px-1.5 py-1 text-xs text-zinc-500 hover:bg-[#2a2a2a] hover:text-red-400 transition-colors"
                onClick={() => removeStatus(status.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-1.5 w-full rounded border border-dashed border-[#444] py-1 text-[10px] text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          onClick={addStatus}
        >
          + Add Status
        </button>
      </div>

      {/* Tags */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Tags</span>
        <input
          aria-label="Tags"
          className={sharedInputClass}
          value={tags}
          placeholder="users, auth"
          onChange={(e) => patch({ tags: e.target.value })}
        />
      </label>
    </div>
  )
}

// ---- Main component ----

type BackendPropertiesProps = {
  node: LumioGraphNode | null
}

export function BackendProperties({ node }: BackendPropertiesProps) {
  const updateNodeConfig = useBackendGraphStore((state) => state.updateNodeConfig)

  const genericFields = useMemo(() => {
    if (!node || node.type === 'Model') {
      return []
    }

    return INPUT_FIELDS_BY_TYPE[node.type] ?? []
  }, [node])

  if (!node) {
    return <p className="px-3 py-3 text-xs text-zinc-600">Select a node to edit its properties.</p>
  }

  // Endpoint nodes (GET/POST/PUT/DELETE/PATCH) get the rich editor
  if (ENDPOINT_TYPE_SET.has(node.type)) {
    return <EndpointProperties node={node} />
  }

  // Model node: custom editor with name + field list
  if (node.type === 'Model') {
    const modelName = typeof node.config['model'] === 'string' ? node.config['model'] : ''
    const rawFields = node.config['fields']
    const modelFields: ModelField[] = Array.isArray(rawFields) ? (rawFields as ModelField[]) : []

    return (
      <div className="space-y-2.5 p-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Model Name</span>
          <input
            aria-label="Model Name"
            className={sharedInputClass}
            value={modelName}
            onChange={(e) => updateNodeConfig(node.id, { model: e.target.value })}
          />
        </label>

        <ModelFieldEditor
          fields={modelFields}
          onUpdate={(nextFields) => updateNodeConfig(node.id, { fields: nextFields })}
        />
      </div>
    )
  }

  // All other node types: generic field list
  return (
    <div className="space-y-2.5 p-3">
      {genericFields.length === 0 ? (
        <p className="text-xs text-zinc-600">No editable properties for this node.</p>
      ) : null}
      {genericFields.map((field) => {
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
                className={sharedInputClass}
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
                className={sharedInputClass}
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
