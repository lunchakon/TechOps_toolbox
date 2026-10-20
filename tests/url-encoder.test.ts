import { describe, expect, it } from 'vitest'
import { decodeUrl, encodeUrl, parseQuery } from '@/tools/url-encoder/logic'

describe('encodeUrl', () => {
  it('encodes components including reserved characters', () => {
    expect(encodeUrl('a b&c=d/e?f', 'component')).toEqual({ ok: true, output: 'a%20b%26c%3Dd%2Fe%3Ff' })
  })
  it('keeps URL structure in full mode', () => {
    expect(encodeUrl('https://x.com/a b?q=ü&z=1#h', 'full')).toEqual({ ok: true, output: 'https://x.com/a%20b?q=%C3%BC&z=1#h' })
  })
  it('uses + for spaces in form mode and encodes !\'()~', () => {
    expect(encodeUrl("a b+c!'()~", 'form')).toEqual({ ok: true, output: 'a+b%2Bc%21%27%28%29%7E' })
  })
  it('encodes Unicode as UTF-8', () => {
    expect(encodeUrl('สวัสดี', 'component')).toEqual({ ok: true, output: '%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5' })
  })
  it('fails gracefully on lone surrogates', () => {
    const r = encodeUrl('\uD800', 'component')
    expect(r.ok).toBe(false)
  })
})

describe('decodeUrl', () => {
  it('decodes components', () => {
    expect(decodeUrl('a%20b%26c', 'component')).toEqual({ ok: true, output: 'a b&c' })
  })
  it('does not treat + as space in component mode but does in form mode', () => {
    expect(decodeUrl('a+b', 'component')).toEqual({ ok: true, output: 'a+b' })
    expect(decodeUrl('a+b%2Bc', 'form')).toEqual({ ok: true, output: 'a b+c' })
  })
  it('keeps reserved escapes in full mode', () => {
    expect(decodeUrl('a%2Fb%20c', 'full')).toEqual({ ok: true, output: 'a%2Fb c' })
  })
  it('explains a bare percent sign', () => {
    const r = decodeUrl('50% off', 'component')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/position 3.*two hex digits.*%25/)
  })
  it('explains truncated escapes', () => {
    const r = decodeUrl('abc%2', 'component')
    expect(r.ok).toBe(false)
  })
  it('explains invalid UTF-8 sequences', () => {
    const r = decodeUrl('%E0%A4%A', 'component')
    expect(r.ok).toBe(false)
    const r2 = decodeUrl('%FF', 'component')
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.error).toMatch(/UTF-8/)
  })
  it('round-trips arbitrary text', () => {
    const text = 'q=ü ñ 🌏 &?#/ +%'
    for (const mode of ['component', 'form'] as const) {
      const enc = encodeUrl(text, mode)
      expect(enc.ok && decodeUrl(enc.output, mode)).toEqual({ ok: true, output: text })
    }
  })
})

describe('parseQuery', () => {
  it('parses a full URL and decodes keys and values', () => {
    const r = parseQuery('https://x.com/p?name=Ada+L&city=%E0%B8%81&flag#frag')
    expect(r).toEqual({
      ok: true,
      params: [
        { key: 'name', value: 'Ada L' },
        { key: 'city', value: 'ก' },
        { key: 'flag', value: '' },
      ],
    })
  })
  it('parses a bare query string and an empty query', () => {
    expect(parseQuery('a=1&b=2')).toEqual({ ok: true, params: [{ key: 'a', value: '1' }, { key: 'b', value: '2' }] })
    expect(parseQuery('https://x.com/')).toEqual({ ok: true, params: [] })
  })
  it('reports malformed encodings per parameter', () => {
    const r = parseQuery('a=100%')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Parameter "a"/)
  })
})
