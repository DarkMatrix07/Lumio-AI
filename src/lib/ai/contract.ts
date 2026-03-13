import { z } from 'zod'

import { LUMIO_STANDARD_NODE_TYPES, LUMIO_TEMPLATE_KINDS, type LumioContract, type LumioContractValidationResult } from '@/types/lumio'

const frontendSchema = z.object({
  html: z.string(),
  css: z.string(),
})

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
})

const standardNodeSchema = z.object({
  id: z.string(),
  type: z.enum(LUMIO_STANDARD_NODE_TYPES),
  label: z.string(),
  config: z.record(z.string(), z.unknown()),
})

const templateNodeSchema = z.object({
  id: z.string(),
  type: z.literal('Template'),
  label: z.string(),
  config: z
    .object({
      templateKind: z.enum(LUMIO_TEMPLATE_KINDS),
    })
    .catchall(z.unknown()),
})

const nodeSchema = z.discriminatedUnion('type', [standardNodeSchema, templateNodeSchema])

const contractSchema = z.object({
  version: z.string().min(1),
  frontend: frontendSchema,
  backendGraph: z.object({
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema),
  }),
})

type ParsedLumioContract = z.infer<typeof contractSchema>

const validateGraphReferences = (contract: ParsedLumioContract): string[] => {
  const nodeIds = new Set(contract.backendGraph.nodes.map((node) => node.id))

  return contract.backendGraph.edges.flatMap((edge) => {
    const errors: string[] = []

    if (!nodeIds.has(edge.source)) {
      errors.push(`backendGraph.edges.${edge.id}.source: source node does not exist`)
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(`backendGraph.edges.${edge.id}.target: target node does not exist`)
    }

    return errors
  })
}

export const validateLumioContract = (input: unknown): LumioContractValidationResult => {
  const parsed = contractSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`),
    }
  }

  const referenceErrors = validateGraphReferences(parsed.data)
  if (referenceErrors.length > 0) {
    return {
      success: false,
      errors: referenceErrors,
    }
  }

  const contract: LumioContract = parsed.data

  return {
    success: true,
    data: contract,
  }
}
