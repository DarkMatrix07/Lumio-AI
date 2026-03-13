export const LUMIO_HTML_OPEN  = '<lumio-ai-html>'
export const LUMIO_HTML_CLOSE = '</lumio-ai-html>'
export const LUMIO_CSS_OPEN   = '<lumio-ai-css>'
export const LUMIO_CSS_CLOSE  = '</lumio-ai-css>'

export type ParsedChunk = {
  visibleText: string
  htmlDelta:   string
  cssDelta:    string
}

type ParserState =
  | 'TEXT'
  | 'MAYBE_OPEN'
  | 'IN_HTML'
  | 'MAYBE_HTML_CLOSE'
  | 'IN_CSS'
  | 'MAYBE_CSS_CLOSE'

/**
 * Stateful streaming parser that separates lumio generation tags from
 * user-visible assistant text. Handles tags split across chunk boundaries.
 *
 * Routing:
 *   <lumio-ai-html>...</lumio-ai-html>  → htmlDelta   (never reaches visibleText)
 *   <lumio-ai-css>...</lumio-ai-css>    → cssDelta    (never reaches visibleText)
 *   everything else                     → visibleText
 */
export class StreamParser {
  private state: ParserState = 'TEXT'
  private buf: string = ''

  push(chunk: string): ParsedChunk {
    let visibleText = ''
    let htmlDelta   = ''
    let cssDelta    = ''

    for (const ch of chunk) {
      switch (this.state) {
        // ── TEXT: default pass-through state ──────────────────────────
        case 'TEXT':
          if (ch === '<') {
            this.state = 'MAYBE_OPEN'
            this.buf = '<'
          } else {
            visibleText += ch
          }
          break

        // ── MAYBE_OPEN: buffering potential lumio opening tag ─────────
        case 'MAYBE_OPEN':
          // New '<' encountered before current buffer resolved → flush buffer
          if (ch === '<') {
            visibleText += this.buf
            this.buf = '<'
            break
          }

          this.buf += ch

          if (this.buf === LUMIO_HTML_OPEN) {
            this.state = 'IN_HTML'
            this.buf = ''
          } else if (this.buf === LUMIO_CSS_OPEN) {
            this.state = 'IN_CSS'
            this.buf = ''
          } else if (
            !LUMIO_HTML_OPEN.startsWith(this.buf) &&
            !LUMIO_CSS_OPEN.startsWith(this.buf)
          ) {
            // Buffer can no longer match any known lumio tag → flush to visible
            visibleText += this.buf
            this.buf = ''
            this.state = 'TEXT'
          }
          break

        // ── IN_HTML: inside <lumio-ai-html> block ─────────────────────
        case 'IN_HTML':
          if (ch === '<') {
            this.state = 'MAYBE_HTML_CLOSE'
            this.buf = '<'
          } else {
            htmlDelta += ch
          }
          break

        // ── MAYBE_HTML_CLOSE: buffering potential </lumio-ai-html> ────
        case 'MAYBE_HTML_CLOSE':
          this.buf += ch

          if (this.buf === LUMIO_HTML_CLOSE) {
            this.state = 'TEXT'
            this.buf = ''
          } else if (!LUMIO_HTML_CLOSE.startsWith(this.buf)) {
            // Not a close tag → treat buffer as html content
            htmlDelta += this.buf
            this.buf = ''
            this.state = 'IN_HTML'
          }
          break

        // ── IN_CSS: inside <lumio-ai-css> block ───────────────────────
        case 'IN_CSS':
          if (ch === '<') {
            this.state = 'MAYBE_CSS_CLOSE'
            this.buf = '<'
          } else {
            cssDelta += ch
          }
          break

        // ── MAYBE_CSS_CLOSE: buffering potential </lumio-ai-css> ──────
        case 'MAYBE_CSS_CLOSE':
          this.buf += ch

          if (this.buf === LUMIO_CSS_CLOSE) {
            this.state = 'TEXT'
            this.buf = ''
          } else if (!LUMIO_CSS_CLOSE.startsWith(this.buf)) {
            // Not a close tag → treat buffer as css content
            cssDelta += this.buf
            this.buf = ''
            this.state = 'IN_CSS'
          }
          break
      }
    }

    return { visibleText, htmlDelta, cssDelta }
  }

  /** Flush any pending buffer at end of stream. Unmatched partial tags become visible text. */
  flush(): ParsedChunk {
    const visibleText = this.buf
    this.buf = ''
    this.state = 'TEXT'
    return { visibleText, htmlDelta: '', cssDelta: '' }
  }

  reset(): void {
    this.state = 'TEXT'
    this.buf = ''
  }
}
