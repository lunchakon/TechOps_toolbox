import { describe, expect, it } from 'vitest'
import { decodeJwt, humanizeDuration, summarizeClaims } from '@/tools/jwt/logic'

const b64url = (o: unknown) => btoa(String.fromCharCode(...new TextEncoder().encode(typeof o === 'string' ? o : JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const make = (header: unknown, payload: unknown, sig = 'c2ln') => `${b64url(header)}.${b64url(payload)}.${sig}`

const PAYLOAD = { iss: 'https://auth.example.com', sub: 'user-1', aud: ['api', 'web'], iat: 1700000000, nbf: 1700000000, exp: 1700003600, name: 'สวัสดี' }
const TOKEN = make({ alg: 'HS256', typ: 'JWT' }, PAYLOAD)

describe('decodeJwt', () => {
  it('decodes header, payload and signature', () => {
    const r = decodeJwt(TOKEN)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.header).toEqual({ alg: 'HS256', typ: 'JWT' })
      expect(r.payload).toEqual(PAYLOAD)
      expect(r.signature).toBe('c2ln')
    }
  })
  it('handles Unicode claims', () => {
    const r = decodeJwt(TOKEN)
    expect(r.ok && r.payload.name).toBe('สวัสดี')
  })
  it('accepts a Bearer prefix, whitespace and line breaks', () => {
    const wrapped = `Bearer ${TOKEN.slice(0, 20)}\n${TOKEN.slice(20)}  `
    expect(decodeJwt(wrapped).ok).toBe(true)
  })
  it('accepts unsecured tokens with empty signature', () => {
    const r = decodeJwt(make({ alg: 'none' }, { a: 1 }, ''))
    expect(r.ok && r.signature).toBe('')
  })
  it('rejects empty input', () => {
    expect(decodeJwt('  ')).toEqual({ ok: false, error: 'Paste a JWT to decode.' })
  })
  it('rejects the wrong number of parts', () => {
    const r = decodeJwt('abc.def')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/3 dot-separated parts; found 2|found 2/)
  })
  it('recognises encrypted JWE tokens', () => {
    const r = decodeJwt('a.b.c.d.e')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/JWE/)
  })
  it('rejects non-Base64URL segments', () => {
    const r = decodeJwt('eyJh+bGci.eyJhIjoxfQ.sig')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/header is not Base64URL/)
  })
  it('rejects segments that are not JSON', () => {
    const r = decodeJwt(`${b64url('not json')}.${b64url({ a: 1 })}.s`)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/header is not valid JSON/)
  })
  it('rejects non-object JSON payloads', () => {
    const r = decodeJwt(`${b64url({ alg: 'none' })}.${b64url('[1,2]')}.s`)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/payload must be a JSON object/)
  })
  it('rejects truncated segments and empty segments', () => {
    expect(decodeJwt(`${b64url({ alg: 'x' })}.A.s`).ok).toBe(false)
    expect(decodeJwt(`${b64url({ alg: 'x' })}..s`).ok).toBe(false)
  })
})

describe('summarizeClaims', () => {
  it('reports a valid token and the time remaining', () => {
    const s = summarizeClaims(PAYLOAD, 1700000000 + 60)
    expect(s.status).toBe('valid')
    expect(s.remainingSeconds).toBe(3540)
    expect(s.remainingText).toBe('expires in 59 minutes')
    expect(s.iss).toBe('https://auth.example.com')
    expect(s.sub).toBe('user-1')
    expect(s.aud).toEqual(['api', 'web'])
    expect(s.times.map((t) => t.name)).toEqual(['iat', 'nbf', 'exp'])
    expect(s.times[2].iso).toBe('2023-11-14T23:13:20.000Z')
  })
  it('reports an expired token', () => {
    const s = summarizeClaims(PAYLOAD, 1700003600 + 7200)
    expect(s.status).toBe('expired')
    expect(s.remainingText).toBe('expired 2 hours ago')
  })
  it('treats exp as expired exactly at the expiry second', () => {
    expect(summarizeClaims({ exp: 100 }, 100).status).toBe('expired')
    expect(summarizeClaims({ exp: 100 }, 99).status).toBe('valid')
  })
  it('reports a token that is not yet valid', () => {
    expect(summarizeClaims({ nbf: 2000, exp: 3000 }, 1000).status).toBe('not-yet-valid')
  })
  it('handles tokens without exp', () => {
    const s = summarizeClaims({ sub: 'x' }, 1)
    expect(s.status).toBe('no-expiry')
    expect(s.remainingText).toBeUndefined()
  })
  it('normalises a string aud to an array and ignores wrong types', () => {
    expect(summarizeClaims({ aud: 'api' }, 1).aud).toEqual(['api'])
    const s = summarizeClaims({ iss: 5, exp: 'soon' }, 1)
    expect(s.iss).toBeUndefined()
    expect(s.invalidTimeClaims).toEqual(['exp'])
  })
})

describe('humanizeDuration', () => {
  it('uses at most two units', () => {
    expect(humanizeDuration(0)).toBe('0 seconds')
    expect(humanizeDuration(1)).toBe('1 second')
    expect(humanizeDuration(3661)).toBe('1 hour 1 minute')
    expect(humanizeDuration(90061)).toBe('1 day 1 hour')
  })
})
