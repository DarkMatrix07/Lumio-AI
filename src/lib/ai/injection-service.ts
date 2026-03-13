import { sanitizeAiCss, sanitizeAiHtml } from '@/lib/ai/sanitize'

export type InjectionMode = 'append' | 'replace'

type InjectionInput = {
  existingHtml: string
  existingCss: string
  incomingHtml: string
  incomingCss: string
  confidence: number
  mode: InjectionMode
}

type InjectionResult = {
  html: string
  css: string
  requiresConfirmation: boolean
}

type EditorUndoLike = {
  UndoManager?: {
    stop?: () => unknown
    start?: () => unknown
  }
}

const CONFIDENCE_THRESHOLD = 0.6

const combine = (existingValue: string, incomingValue: string): string => {
  const left = existingValue.trim()
  const right = incomingValue.trim()

  if (!left) {
    return right
  }

  if (!right) {
    return left
  }

  return `${left}\n${right}`
}

export const createUndoCheckpoint = (editor: EditorUndoLike): void => {
  if (typeof editor.UndoManager?.stop === 'function' && typeof editor.UndoManager?.start === 'function') {
    editor.UndoManager.stop()
    editor.UndoManager.start()
  }
}

export const applyAiInjection = (input: InjectionInput): InjectionResult => {
  const safeIncomingHtml = sanitizeAiHtml(input.incomingHtml)
  const safeIncomingCss = sanitizeAiCss(input.incomingCss)

  if (input.mode === 'append') {
    return {
      html: combine(input.existingHtml, safeIncomingHtml),
      css: combine(input.existingCss, safeIncomingCss),
      requiresConfirmation: false,
    }
  }

  if (input.confidence < CONFIDENCE_THRESHOLD) {
    return {
      html: input.existingHtml,
      css: input.existingCss,
      requiresConfirmation: true,
    }
  }

  return {
    html: safeIncomingHtml,
    css: safeIncomingCss,
    requiresConfirmation: false,
  }
}
