export type CodecResult = { ok: true; output: string } | { ok: false; error: string }

const STD_RE = /^[A-Za-z0-9+/]*={0,2}$/
const URL_RE = /^[A-Za-z0-9_-]*={0,2}$/

export function encodeBase64(text: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  const b64 = btoa(binary)
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64
}

export function decodeBase64(input: string): CodecResult {
  const cleaned = input.replace(/\s+/g, '')
  if (!cleaned) return { ok: true, output: '' }

  const bad = /[^A-Za-z0-9+/_\-=]/.exec(cleaned)
  if (bad) return { ok: false, error: `Invalid character "${bad[0]}" at position ${bad.index + 1}. Base64 uses only A-Z, a-z, 0-9, + / (or - _ for URL-safe) and = padding.` }
  if (/[+/]/.test(cleaned) && /[-_]/.test(cleaned)) return { ok: false, error: 'Mixed standard (+ /) and URL-safe (- _) alphabets.' }
  if (!STD_RE.test(cleaned) && !URL_RE.test(cleaned)) return { ok: false, error: 'Misplaced "=" padding: it may only appear at the end.' }

  const unpadded = cleaned.replace(/=+$/, '')
  if (unpadded.length % 4 === 1) return { ok: false, error: 'Invalid length: a single leftover character cannot encode a byte. The input is probably truncated.' }
  const padded = unpadded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (unpadded.length % 4)) % 4)

  let binary: string
  try {
    binary = atob(padded)
  } catch {
    return { ok: false, error: 'Input is not valid Base64.' }
  }
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  try {
    return { ok: true, output: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return { ok: false, error: 'Valid Base64, but the decoded bytes are not UTF-8 text (probably binary data such as an image or archive).' }
  }
}
