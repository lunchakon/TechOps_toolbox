export interface GroupInfo {
  index: number
  name?: string
  value: string | undefined
  start?: number
  end?: number
}

export interface MatchInfo {
  index: number
  end: number
  text: string
  groups: GroupInfo[]
}

export type RegexResult =
  | { ok: true; matches: MatchInfo[]; truncated: boolean }
  | { ok: false; error: string }

export interface Segment {
  text: string
  match: number | null
}

export const MAX_TEXT_LENGTH = 200_000
export const MAX_MATCHES = 1000
const VALID_FLAGS = new Set('dgimsuvy')

export function validateFlags(flags: string): string | null {
  const seen = new Set<string>()
  for (const f of flags) {
    if (!VALID_FLAGS.has(f)) return `Unknown flag "${f}". Valid flags: d g i m s u v y.`
    if (seen.has(f)) return `Duplicate flag "${f}".`
    seen.add(f)
  }
  if (seen.has('u') && seen.has('v')) return 'Flags "u" and "v" cannot be combined.'
  return null
}

/** Pure matcher. Run through `runRegexSafely` in the UI so catastrophic backtracking cannot freeze the page. */
export function runRegex(pattern: string, flags: string, text: string, maxMatches = MAX_MATCHES): RegexResult {
  if (!pattern) return { ok: true, matches: [], truncated: false }
  const flagError = validateFlags(flags)
  if (flagError) return { ok: false, error: flagError }
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, error: `Test text is too long (limit ${MAX_TEXT_LENGTH.toLocaleString()} characters).` }

  const internalFlags = Array.from(new Set((flags + 'gd').split(''))).join('')
  let re: RegExp
  try {
    re = new RegExp(pattern, internalFlags)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.replace(/^Invalid regular expression: /, '') : 'Invalid regular expression' }
  }

  const sticky = re.sticky
  const matches: MatchInfo[] = []
  let truncated = false
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (matches.length >= maxMatches) {
      truncated = true
      break
    }
    const indices = (m as RegExpExecArray & { indices?: (([number, number]) | undefined)[] & { groups?: Record<string, [number, number] | undefined> } }).indices
    const names = new Map<number, string>()
    if (m.groups && indices?.groups) {
      // Map named groups back to numbered positions via their exact span, in declaration order.
      const used = new Set<number>()
      for (const [name, span] of Object.entries(indices.groups)) {
        if (!span) continue
        for (let i = 1; i < m.length; i++) {
          const s = indices[i]
          if (!used.has(i) && s && s[0] === span[0] && s[1] === span[1] && m[i] === m.groups[name]) {
            names.set(i, name)
            used.add(i)
            break
          }
        }
      }
    }
    const groups: GroupInfo[] = []
    for (let i = 1; i < m.length; i++) {
      const span = indices?.[i]
      groups.push({ index: i, name: names.get(i), value: m[i], start: span?.[0], end: span?.[1] })
    }
    matches.push({ index: m.index, end: m.index + m[0].length, text: m[0], groups })
    if (m[0].length === 0) {
      if (re.lastIndex >= text.length && !sticky) break
      re.lastIndex += 1
    }
  }
  return { ok: true, matches, truncated }
}

/** Split `text` into alternating plain and matched segments for highlighting. */
export function buildSegments(text: string, matches: MatchInfo[]): Segment[] {
  const segments: Segment[] = []
  let pos = 0
  matches.forEach((m, i) => {
    if (m.end === m.index || m.index < pos) return
    if (m.index > pos) segments.push({ text: text.slice(pos, m.index), match: null })
    segments.push({ text: text.slice(m.index, m.end), match: i })
    pos = m.end
  })
  if (pos < text.length) segments.push({ text: text.slice(pos), match: null })
  return segments
}

export const REGEX_EXAMPLES = [
  { label: 'Email', pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.-]+', flags: 'g', text: 'Contact ada@example.com or ops+alerts@corp.co.th today.' },
  { label: 'IPv4', pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b', flags: 'g', text: 'src=10.0.0.12 dst=192.168.1.255 bad=999.1.1.1' },
  { label: 'ISO date', pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})', flags: 'g', text: 'Released 2025-03-09, patched 2025-04-01.' },
  { label: 'UUID', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', flags: 'gi', text: 'id=3F2504E0-4F89-11D3-9A0C-0305E82C3301 other=none' },
  { label: 'URL', pattern: 'https?://[^\\s/$.?#].[^\\s]*', flags: 'g', text: 'See https://example.com/a?b=1 and http://localhost:8080/health.' },
  { label: 'Log level', pattern: '^(\\d{4}-\\d{2}-\\d{2}) (ERROR|WARN) (.*)$', flags: 'gm', text: '2025-01-01 INFO started\n2025-01-01 ERROR disk full\n2025-01-02 WARN retrying' },
  { label: 'Catastrophic (a+)+$', pattern: '(a+)+$', flags: '', text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!' },
]
