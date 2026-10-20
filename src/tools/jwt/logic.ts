export type JwtResult =
  | { ok: true; header: Record<string, unknown>; payload: Record<string, unknown>; signature: string }
  | { ok: false; error: string }

function decodeSegment(segment: string, name: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!segment) return { ok: false, error: `The ${name} segment is empty.` }
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
    return { ok: false, error: `The ${name} is not Base64URL: it contains characters outside A-Z a-z 0-9 - _ (standard Base64 "+", "/" or "=" padding is not allowed in JWTs).` }
  }
  if (segment.length % 4 === 1) return { ok: false, error: `The ${name} has an invalid Base64URL length (token may be truncated).` }
  let text: string
  try {
    const b64 = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, error: `The ${name} could not be decoded as UTF-8 text.` }
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: `The ${name} is not valid JSON.` }
  }
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, error: `The ${name} must be a JSON object.` }
  }
  return { ok: true, value: json as Record<string, unknown> }
}

/** Decode (NOT verify) a JWT. Accepts an optional "Bearer " prefix and surrounding whitespace. */
export function decodeJwt(input: string): JwtResult {
  const token = input.trim().replace(/^bearer\s+/i, '').replace(/\s+/g, '')
  if (!token) return { ok: false, error: 'Paste a JWT to decode.' }
  const parts = token.split('.')
  if (parts.length === 5) return { ok: false, error: 'This looks like an encrypted JWT (JWE, 5 parts). Its contents cannot be read without the decryption key.' }
  if (parts.length !== 3) return { ok: false, error: `A JWT has 3 dot-separated parts (header.payload.signature); found ${parts.length}.` }
  const header = decodeSegment(parts[0], 'header')
  if (!header.ok) return header
  const payload = decodeSegment(parts[1], 'payload')
  if (!payload.ok) return payload
  return { ok: true, header: header.value, payload: payload.value, signature: parts[2] }
}

export type ExpiryStatus = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry'

export interface TimeClaim {
  name: 'iat' | 'exp' | 'nbf'
  label: string
  seconds: number
  iso: string
}

export interface ClaimsSummary {
  times: TimeClaim[]
  invalidTimeClaims: string[]
  iss?: string
  sub?: string
  aud?: string[]
  status: ExpiryStatus
  /** Seconds until expiry (negative when expired). Undefined without exp. */
  remainingSeconds?: number
  remainingText?: string
}

const TIME_LABELS = { iat: 'Issued at', exp: 'Expires', nbf: 'Not before' } as const

export function humanizeDuration(totalSeconds: number): string {
  let s = Math.floor(Math.abs(totalSeconds))
  if (s === 0) return '0 seconds'
  const units: [string, number][] = [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]]
  const parts: string[] = []
  for (const [name, size] of units) {
    const n = Math.floor(s / size)
    if (n > 0) {
      parts.push(`${n} ${name}${n === 1 ? '' : 's'}`)
      s -= n * size
    }
    if (parts.length === 2) break
  }
  return parts.join(' ')
}

export function summarizeClaims(payload: Record<string, unknown>, nowSeconds: number): ClaimsSummary {
  const times: TimeClaim[] = []
  const invalidTimeClaims: string[] = []
  for (const name of ['iat', 'nbf', 'exp'] as const) {
    if (!(name in payload)) continue
    const v = payload[name]
    if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 8.64e12) {
      times.push({ name, label: TIME_LABELS[name], seconds: v, iso: new Date(v * 1000).toISOString() })
    } else {
      invalidTimeClaims.push(name)
    }
  }
  const exp = times.find((t) => t.name === 'exp')
  const nbf = times.find((t) => t.name === 'nbf')
  let status: ExpiryStatus = 'no-expiry'
  let remainingSeconds: number | undefined
  let remainingText: string | undefined
  if (nbf && nowSeconds < nbf.seconds) status = 'not-yet-valid'
  else if (exp) status = nowSeconds >= exp.seconds ? 'expired' : 'valid'
  if (exp) {
    remainingSeconds = exp.seconds - nowSeconds
    remainingText = remainingSeconds >= 0 ? `expires in ${humanizeDuration(remainingSeconds)}` : `expired ${humanizeDuration(remainingSeconds)} ago`
  }
  const aud = payload.aud === undefined ? undefined : (Array.isArray(payload.aud) ? payload.aud : [payload.aud]).map(String)
  return {
    times,
    invalidTimeClaims,
    iss: typeof payload.iss === 'string' ? payload.iss : undefined,
    sub: typeof payload.sub === 'string' ? payload.sub : undefined,
    aud,
    status,
    remainingSeconds,
    remainingText,
  }
}
