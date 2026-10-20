import { describe, expect, it } from 'vitest'
import { buildSegments, REGEX_EXAMPLES, runRegex, validateFlags } from '@/tools/regex/logic'

describe('runRegex', () => {
  it('finds matches with positions', () => {
    const r = runRegex('\\d+', 'g', 'a1 b22 c333')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.matches.map((m) => [m.text, m.index, m.end])).toEqual([
        ['1', 1, 2],
        ['22', 4, 6],
        ['333', 8, 11],
      ])
    }
  })
  it('returns all matches even when the g flag is not given (display tool)', () => {
    const r = runRegex('a', '', 'aaa')
    expect(r.ok && r.matches).toHaveLength(3)
  })
  it('reports numbered capture groups with spans', () => {
    const r = runRegex('(\\w+)@(\\w+)\\.com', 'g', 'ada@example.com')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.matches[0].groups.map((g) => [g.index, g.value, g.start, g.end])).toEqual([
        [1, 'ada', 0, 3],
        [2, 'example', 4, 11],
      ])
    }
  })
  it('reports named groups', () => {
    const r = runRegex('(?<y>\\d{4})-(?<m>\\d{2})', 'g', '2025-03')
    expect(r.ok && r.matches[0].groups.map((g) => g.name)).toEqual(['y', 'm'])
  })
  it('reports unmatched optional groups as undefined', () => {
    const r = runRegex('(a)|(b)', '', 'b')
    expect(r.ok && r.matches[0].groups.map((g) => g.value)).toEqual([undefined, 'b'])
  })
  it('handles flags i, m and s', () => {
    expect(runRegex('abc', 'i', 'ABC').ok && (runRegex('abc', 'i', 'ABC') as { matches: unknown[] }).matches).toHaveLength(1)
    const ml = runRegex('^\\w+$', 'm', 'one\ntwo')
    expect(ml.ok && ml.matches).toHaveLength(2)
    const dotAll = runRegex('a.b', 's', 'a\nb')
    expect(dotAll.ok && dotAll.matches).toHaveLength(1)
  })
  it('does not loop forever on empty matches', () => {
    const r = runRegex('x*', 'g', 'abc')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.matches.length).toBe(4)
  })
  it('handles empty pattern and empty text', () => {
    expect(runRegex('', 'g', 'abc')).toEqual({ ok: true, matches: [], truncated: false })
    expect(runRegex('a', 'g', '')).toEqual({ ok: true, matches: [], truncated: false })
  })
  it('returns a friendly error for invalid patterns', () => {
    for (const bad of ['(', '[a-', '*a', '(?<n>a)(?<n>b)', '\\']) {
      const r = runRegex(bad, 'g', 'text')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).not.toMatch(/^Invalid regular expression: /)
    }
  })
  it('rejects invalid, duplicate and conflicting flags', () => {
    expect(validateFlags('gx')).toMatch(/Unknown flag "x"/)
    expect(validateFlags('gg')).toMatch(/Duplicate/)
    expect(validateFlags('uv')).toMatch(/cannot be combined/)
    expect(validateFlags('gimsuy')).toBeNull()
    expect(runRegex('a', 'q', 'a').ok).toBe(false)
  })
  it('caps the number of matches', () => {
    const r = runRegex('a', 'g', 'a'.repeat(50), 10)
    expect(r.ok && r.matches).toHaveLength(10)
    expect(r.ok && r.truncated).toBe(true)
  })
  it('refuses oversized test text', () => {
    const r = runRegex('a', 'g', 'a'.repeat(200_001))
    expect(r.ok).toBe(false)
  })
  it('supports unicode flag', () => {
    const r = runRegex('\\p{L}+', 'u', 'héllo wörld')
    expect(r.ok && r.matches.map((m) => m.text)).toEqual(['héllo', 'wörld'])
  })
  it('every built-in example (except the catastrophic demo) matches its own sample text', () => {
    for (const ex of REGEX_EXAMPLES.filter((e) => !e.label.startsWith('Catastrophic'))) {
      const r = runRegex(ex.pattern, ex.flags, ex.text)
      expect(r.ok, ex.label).toBe(true)
      if (r.ok) expect(r.matches.length, ex.label).toBeGreaterThan(0)
    }
  })
})

describe('buildSegments', () => {
  it('splits text around matches', () => {
    const r = runRegex('\\d+', 'g', 'a1b22c')
    if (!r.ok) throw new Error('unexpected')
    expect(buildSegments('a1b22c', r.matches)).toEqual([
      { text: 'a', match: null },
      { text: '1', match: 0 },
      { text: 'b', match: null },
      { text: '22', match: 1 },
      { text: 'c', match: null },
    ])
  })
  it('returns the whole text when there are no matches', () => {
    expect(buildSegments('abc', [])).toEqual([{ text: 'abc', match: null }])
  })
  it('skips empty matches', () => {
    const r = runRegex('x*', 'g', 'ab')
    if (!r.ok) throw new Error('unexpected')
    expect(buildSegments('ab', r.matches)).toEqual([{ text: 'ab', match: null }])
  })
})
