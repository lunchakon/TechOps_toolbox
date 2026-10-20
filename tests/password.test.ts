import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OPTIONS,
  entropyBits,
  generateMany,
  generatePassword,
  MAX_LENGTH,
  secureRandomInt,
  strengthOf,
  validateOptions,
  type PasswordOptions,
} from '@/tools/password/logic'

const opts = (patch: Partial<PasswordOptions> = {}): PasswordOptions => ({ ...DEFAULT_OPTIONS, ...patch })
const pw = (o: PasswordOptions) => {
  const r = generatePassword(o)
  if (!r.ok) throw new Error(r.error)
  return r.password
}

describe('secureRandomInt', () => {
  it('stays in range for many sizes', () => {
    for (const max of [1, 2, 3, 7, 26, 62, 94, 1000, 2 ** 32]) {
      for (let i = 0; i < 200; i++) {
        const n = secureRandomInt(max)
        expect(Number.isInteger(n) && n >= 0 && n < max).toBe(true)
      }
    }
  })
  it('is uniform (no modulo bias) for a size that does not divide 2^32', () => {
    const buckets = new Array(6).fill(0)
    const N = 60_000
    for (let i = 0; i < N; i++) buckets[secureRandomInt(6)]++
    for (const b of buckets) expect(Math.abs(b - N / 6)).toBeLessThan(N / 6 * 0.1) // within 10% of expectation
  })
  it('rejects invalid ranges', () => {
    expect(() => secureRandomInt(0)).toThrow(RangeError)
    expect(() => secureRandomInt(1.5)).toThrow(RangeError)
    expect(() => secureRandomInt(2 ** 32 + 1)).toThrow(RangeError)
  })
})

describe('generatePassword', () => {
  it('produces the requested length', () => {
    for (const length of [4, 8, 16, 64, MAX_LENGTH]) expect(pw(opts({ length }))).toHaveLength(length)
  })
  it('only uses the selected character types', () => {
    expect(pw(opts({ length: 40, upper: false, lower: false, symbols: false }))).toMatch(/^\d{40}$/)
    expect(pw(opts({ length: 40, digits: false, symbols: false, upper: false }))).toMatch(/^[a-z]{40}$/)
    expect(pw(opts({ length: 40, digits: false, lower: false, upper: false }))).toMatch(/^[!@#$%^&*()\-_=+[\]{}:;,.?]{40}$/)
  })
  it('always includes every selected type, even at the minimum length', () => {
    for (let i = 0; i < 300; i++) {
      const p = pw(opts({ length: 4 }))
      expect(p).toMatch(/[a-z]/)
      expect(p).toMatch(/[A-Z]/)
      expect(p).toMatch(/\d/)
      expect(p).toMatch(/[^a-zA-Z0-9]/)
    }
  })
  it('can exclude ambiguous characters', () => {
    for (let i = 0; i < 100; i++) expect(pw(opts({ length: 64, excludeAmbiguous: true }))).not.toMatch(/[Il1|O0o]/)
  })
  it('does not repeat itself', () => {
    expect(new Set(Array.from({ length: 50 }, () => pw(opts()))).size).toBe(50)
  })
  it('spreads required characters across positions (shuffled)', () => {
    const firstChars = new Set(Array.from({ length: 200 }, () => pw(opts({ length: 4 }))[0]))
    expect(firstChars.size).toBeGreaterThan(20)
  })
  it('uses the injected random source (deterministic)', () => {
    const zero = generatePassword(opts({ length: 6, symbols: false }), () => 0)
    expect(zero).toEqual({ ok: true, password: expect.stringMatching(/^[a-zA-Z0-9]{6}$/) })
    const a = generatePassword(opts(), () => 0)
    const b = generatePassword(opts(), () => 0)
    expect(a).toEqual(b)
  })
})

describe('validation', () => {
  it('requires at least one character type', () => {
    const o = opts({ lower: false, upper: false, digits: false, symbols: false })
    expect(validateOptions(o)).toBe('Select at least one character type.')
    expect(generatePassword(o)).toEqual({ ok: false, error: 'Select at least one character type.' })
  })
  it('rejects out-of-range or fractional lengths', () => {
    expect(validateOptions(opts({ length: 3 }))).toMatch(/between 4 and 128/)
    expect(validateOptions(opts({ length: 129 }))).toMatch(/between 4 and 128/)
    expect(validateOptions(opts({ length: 8.5 }))).toMatch(/whole number/)
    expect(validateOptions(opts({ length: Number.NaN }))).toMatch(/whole number/)
  })
  it('accepts valid options', () => {
    expect(validateOptions(opts())).toBeNull()
  })
  it('generateMany returns the count or the first error', () => {
    const many = generateMany(opts(), 5)
    expect(many.ok && many.passwords).toHaveLength(5)
    expect(generateMany(opts({ length: 2 }), 3).ok).toBe(false)
  })
})

describe('entropy and strength', () => {
  it('computes length x log2(pool)', () => {
    expect(entropyBits(opts({ length: 10, upper: false, lower: false, symbols: false }))).toBe(33.2) // 10 x log2(10)
    expect(entropyBits(opts({ length: 16 }))).toBeGreaterThan(100)
  })
  it('shrinks the pool when ambiguous characters are excluded', () => {
    expect(entropyBits(opts({ excludeAmbiguous: true }))).toBeLessThan(entropyBits(opts()))
  })
  it('labels strengths', () => {
    expect(strengthOf(20)).toBe('Weak')
    expect(strengthOf(45)).toBe('Fair')
    expect(strengthOf(70)).toBe('Strong')
    expect(strengthOf(120)).toBe('Very strong')
    expect(strengthOf(entropyBits(opts({ length: 8, upper: false, lower: false, symbols: false })))).toBe('Weak')
  })
})
