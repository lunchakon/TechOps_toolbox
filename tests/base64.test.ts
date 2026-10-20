import { describe, expect, it } from 'vitest'
import { decodeBase64, encodeBase64 } from '@/tools/base64/logic'

describe('Base64', () => {
  it('encodes ASCII', () => {
    expect(encodeBase64('Hello, World!')).toBe('SGVsbG8sIFdvcmxkIQ==')
  })
  it('round-trips Unicode (Thai, emoji, accents)', () => {
    const text = 'สวัสดี 🌏 café ñ 日本語'
    const enc = encodeBase64(text)
    expect(decodeBase64(enc)).toEqual({ ok: true, output: text })
  })
  it('encodes known UTF-8 bytes', () => {
    expect(encodeBase64('café')).toBe('Y2Fmw6k=')
  })
  it('supports the URL-safe alphabet without padding', () => {
    const enc = encodeBase64('>>>???', true)
    expect(enc).toBe('Pj4-Pz8_')
    expect(decodeBase64(enc)).toEqual({ ok: true, output: '>>>???' })
    expect(encodeBase64('a', true)).toBe('YQ')
  })
  it('decodes input with missing padding and whitespace/newlines', () => {
    expect(decodeBase64('SGVs\nbG8')).toEqual({ ok: true, output: 'Hello' })
  })
  it('handles empty input', () => {
    expect(decodeBase64('')).toEqual({ ok: true, output: '' })
    expect(encodeBase64('')).toBe('')
  })
  it('rejects invalid characters with position', () => {
    const r = decodeBase64('SGVsbG8$')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Invalid character "\$" at position 8/)
  })
  it('rejects bad length', () => {
    const r = decodeBase64('SGVsb')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/length/i)
  })
  it('rejects misplaced padding', () => {
    expect(decodeBase64('SG=VsbG8=').ok).toBe(false)
  })
  it('rejects mixed alphabets', () => {
    expect(decodeBase64('a+b_cd==').ok).toBe(false)
  })
  it('reports binary (non UTF-8) payloads clearly', () => {
    const r = decodeBase64('/9j/4AAQ') // JPEG header bytes
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/not UTF-8/)
  })
  it('handles large input without stack overflow', () => {
    const big = 'x'.repeat(300_000)
    expect(decodeBase64(encodeBase64(big))).toEqual({ ok: true, output: big })
  })
})
