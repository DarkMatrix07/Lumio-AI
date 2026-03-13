const JAVASCRIPT_URL_TEST_PATTERN = /javascript\s*:/i
const JAVASCRIPT_URL_REPLACE_PATTERN = /javascript\s*:/gi
const CSS_IMPORT_PATTERN = /@import\b[^;]*(;|$)/gi
const CSS_EXPRESSION_PATTERN = /expression\s*\(/gi
const DANGEROUS_CSS_URL_PATTERN = /url\s*\(\s*['"]?\s*javascript:/gi
// @font-face with external src can be used for fingerprinting via font-load timing.
// Strip all @font-face blocks from AI-generated CSS (single-level braces, common case).
const CSS_FONT_FACE_PATTERN = /@font-face\s*\{[^{}]*\}/gi

const ALLOWED_HTML_TAGS = new Set([
  'a',
  'abbr',
  'article',
  'aside',
  'b',
  'blockquote',
  'br',
  'button',
  'caption',
  'code',
  'div',
  'em',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'img',
  'input',
  'label',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'section',
  'select',
  'small',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'textarea',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
])

const GLOBAL_ATTRS = new Set(['class', 'id', 'title', 'role', 'aria-label', 'aria-hidden'])
const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  input: new Set(['type', 'name', 'value', 'placeholder', 'checked', 'disabled']),
  textarea: new Set(['name', 'rows', 'cols', 'placeholder', 'disabled']),
  select: new Set(['name', 'disabled']),
  button: new Set(['type', 'name', 'value', 'disabled']),
  form: new Set(['action', 'method']),
}

const isSafeUrl = (value: string): boolean => {
  const trimmed = value.trim()

  if (!trimmed) {
    return true
  }

  if (trimmed.startsWith('//')) {
    return false
  }

  if (!URL_SCHEME_PATTERN.test(trimmed)) {
    return true
  }

  try {
    const parsed = new URL(trimmed)
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

const sanitizeAttribute = (element: Element, attrName: string, attrValue: string): void => {
  const lowerName = attrName.toLowerCase()

  if (lowerName.startsWith('on')) {
    element.removeAttribute(attrName)
    return
  }

  const tagName = element.tagName.toLowerCase()
  const allowedForTag = TAG_ATTRS[tagName] ?? new Set<string>()
  const isAllowed = GLOBAL_ATTRS.has(lowerName) || allowedForTag.has(lowerName)

  if (!isAllowed) {
    element.removeAttribute(attrName)
    return
  }

  if (lowerName === 'href' || lowerName === 'src' || lowerName === 'action') {
    if (JAVASCRIPT_URL_TEST_PATTERN.test(attrValue) || !isSafeUrl(attrValue)) {
      element.removeAttribute(attrName)
      return
    }
  }

  if (lowerName === 'target' && attrValue === '_blank') {
    element.setAttribute('rel', 'noopener noreferrer')
  }
}

export const sanitizeAiHtml = (input: string): string => {
  if (typeof DOMParser === 'undefined') {
    return input.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(input, 'text/html')

  const elements = Array.from(doc.body.querySelectorAll('*'))

  for (const element of elements) {
    const tagName = element.tagName.toLowerCase()

    if (!ALLOWED_HTML_TAGS.has(tagName)) {
      element.remove()
      continue
    }

    for (const attr of Array.from(element.attributes)) {
      sanitizeAttribute(element, attr.name, attr.value)
    }
  }

  return doc.body.innerHTML
}

export const sanitizeAiCss = (input: string): string => {
  return input
    .replace(CSS_FONT_FACE_PATTERN, '')
    .replace(CSS_IMPORT_PATTERN, '')
    .replace(DANGEROUS_CSS_URL_PATTERN, 'url(')
    .replace(CSS_EXPRESSION_PATTERN, '')
    .replace(JAVASCRIPT_URL_REPLACE_PATTERN, '')
}
