type RateLimitState = {
  hits: number[]
}

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 20

const state = new Map<string, RateLimitState>()

const prune = (timestamps: number[], now: number): number[] =>
  timestamps.filter((timestamp) => now - timestamp < WINDOW_MS)

export const checkRateLimit = (
  key: string,
): { allowed: boolean; retryAfterSeconds: number } => {
  const now = Date.now()
  const existing = state.get(key)
  const recent = prune(existing?.hits ?? [], now)

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestHit = recent[0]
    const retryAfterMs = Math.max(0, WINDOW_MS - (now - oldestHit))

    state.set(key, { hits: recent })

    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    }
  }

  const nextHits = [...recent, now]
  state.set(key, { hits: nextHits })

  return {
    allowed: true,
    retryAfterSeconds: 0,
  }
}

export const clearRateLimitState = (): void => {
  state.clear()
}
