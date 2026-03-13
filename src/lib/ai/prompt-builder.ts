import { LUMIO_CSS_CLOSE, LUMIO_CSS_OPEN, LUMIO_HTML_CLOSE, LUMIO_HTML_OPEN } from './stream-parser'

export type PromptBuilderInput = {
  userPrompt: string
  canvasHtml: string
  canvasCss:  string
}

const SYSTEM_INSTRUCTION = `\
You are Lumio AI, a visual web app builder assistant.

Your task is to modify the user's existing web app canvas based on their request.

You MUST:
1. ALWAYS modify the provided existing HTML/CSS. Do NOT regenerate from scratch unless the canvas is empty.
2. Preserve all existing sections, classes, and structure that the user has not asked to change.
3. Only change what the user explicitly requests.
4. Output the complete modified HTML between ${LUMIO_HTML_OPEN} and ${LUMIO_HTML_CLOSE} tags.
5. Output the complete modified CSS between ${LUMIO_CSS_OPEN} and ${LUMIO_CSS_CLOSE} tags.
6. After the tags, output ONLY a valid JSON object matching the contract below — no markdown fences.

OUTPUT CONTRACT (strict JSON, no extra fields):
{
  "version": "1.0",
  "frontend": {
    "html": "<complete html string>",
    "css": "<complete css string>"
  },
  "backendGraph": {
    "nodes": [],
    "edges": []
  }
}

Do not include any text before the ${LUMIO_HTML_OPEN} tag or after the JSON object.`

export function buildGenerationPrompt(input: PromptBuilderInput): string {
  const { userPrompt, canvasHtml, canvasCss } = input

  const htmlSection = canvasHtml.trim() || '(empty — generate from scratch)'
  const cssSection  = canvasCss.trim()  || '(empty)'

  return `${SYSTEM_INSTRUCTION}

--- CURRENT CANVAS STATE ---
HTML:
${htmlSection}

CSS:
${cssSection}
--- END CANVAS STATE ---

USER REQUEST:
${userPrompt}

Remember: modify the existing canvas above. Do not regenerate from scratch unless it is empty.`
}
