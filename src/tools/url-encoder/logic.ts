export type UrlMode = 'component' | 'full' | 'form'
export type CodecResult = { ok: true; output: string } | { ok: false; error: string }

export function encodeUrl(text: string, mode: UrlMode): CodecResult {
  try {
    switch (mode) {
      case 'component':
        return { ok: true, output: encodeURIComponent(text) }
      case 'full':
        return { ok: true, output: encodeURI(text) }
      case 'form':
        // application/x-www-form-urlencoded: space is "+", and !'()~ are percent-encoded too.
        return {
          ok: true,
          output: encodeURIComponent(text)
            .replace(/%20/g, '+')
            .replace(/[!'()~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()),
        }
    }
  } catch {
    return { ok: false, error: 'Input contains an unpaired surrogate character (a broken emoji or similar) and cannot be encoded as UTF-8.' }
  }
}

export function decodeUrl(text: string, mode: UrlMode): CodecResult {
  const source = mode === 'form' ? text.replace(/\+/g, ' ') : text
  const badPercent = /%(?![0-9A-Fa-f]{2})/.exec(source)
  if (badPercent) {
    return {
      ok: false,
      error: `Malformed percent-escape at position ${badPercent.index + 1}: "%" must be followed by two hex digits (e.g. %20). If you meant a literal percent sign, encode it as %25.`,
    }
  }
  try {
    return { ok: true, output: mode === 'full' ? decodeURI(source) : decodeURIComponent(source) }
  } catch {
    return {
      ok: false,
      error: 'The percent-escapes do not form valid UTF-8 (for example a lone %E0 or %FF). The text may use a different charset such as Latin-1, or be truncated.',
    }
  }
}

export interface QueryParam {
  key: string
  value: string
}

/** Parse the query part of a URL (or a bare "a=1&b=2" string) into decoded key/value pairs. */
export function parseQuery(input: string): { ok: true; params: QueryParam[] } | { ok: false; error: string } {
  let query = input.trim()
  const hashAt = query.indexOf('#')
  if (hashAt >= 0) query = query.slice(0, hashAt)
  const q = query.indexOf('?')
  if (q >= 0) query = query.slice(q + 1)
  else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(query) || query.startsWith('/')) query = '' // URL or path without a query
  if (!query) return { ok: true, params: [] }
  const params: QueryParam[] = []
  for (const pair of query.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const rawKey = eq >= 0 ? pair.slice(0, eq) : pair
    const rawValue = eq >= 0 ? pair.slice(eq + 1) : ''
    const key = decodeUrl(rawKey, 'form')
    const value = decodeUrl(rawValue, 'form')
    if (!key.ok) return { ok: false, error: `Parameter "${rawKey}": ${key.error}` }
    if (!value.ok) return { ok: false, error: `Parameter "${rawKey}": ${value.error}` }
    params.push({ key: key.output, value: value.output })
  }
  return { ok: true, params }
}
