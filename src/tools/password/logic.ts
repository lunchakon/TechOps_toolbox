export interface PasswordOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  /** Drop look-alike characters: I l 1 | O 0 o */
  excludeAmbiguous: boolean
}

export const MIN_LENGTH = 4
export const MAX_LENGTH = 128

export const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
}

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}:;,.?',
} as const

const AMBIGUOUS = new Set('Il1|O0o')

/** Returns a uniformly distributed integer in [0, max). `max` must be in 1..2^32. */
export type RandomInt = (max: number) => number

/** Cryptographically secure, unbiased (rejection sampling, no modulo bias). */
export const secureRandomInt: RandomInt = (max) => {
  if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError('max out of range')
  const limit = Math.floor(2 ** 32 / max) * max
  const buf = new Uint32Array(1)
  do {
    crypto.getRandomValues(buf)
  } while (buf[0] >= limit)
  return buf[0] % max
}

export function activePools(opts: PasswordOptions): string[][] {
  return (Object.keys(SETS) as (keyof typeof SETS)[])
    .filter((k) => opts[k])
    .map((k) => [...SETS[k]].filter((c) => !(opts.excludeAmbiguous && AMBIGUOUS.has(c))))
}

export type PasswordResult = { ok: true; password: string } | { ok: false; error: string }

export function validateOptions(opts: PasswordOptions): string | null {
  const pools = activePools(opts)
  if (pools.length === 0) return 'Select at least one character type.'
  if (!Number.isInteger(opts.length) || opts.length < MIN_LENGTH || opts.length > MAX_LENGTH) {
    return `Length must be a whole number between ${MIN_LENGTH} and ${MAX_LENGTH}.`
  }
  if (opts.length < pools.length) return `Length must be at least ${pools.length} to include every selected character type.`
  return null
}

/** One password containing at least one character from every selected type, in random positions. */
export function generatePassword(opts: PasswordOptions, rand: RandomInt = secureRandomInt): PasswordResult {
  const error = validateOptions(opts)
  if (error) return { ok: false, error }
  const pools = activePools(opts)
  const all = pools.flat()
  const chars: string[] = pools.map((p) => p[rand(p.length)])
  while (chars.length < opts.length) chars.push(all[rand(all.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return { ok: true, password: chars.join('') }
}

export function generateMany(opts: PasswordOptions, count: number, rand: RandomInt = secureRandomInt): { ok: true; passwords: string[] } | { ok: false; error: string } {
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const r = generatePassword(opts, rand)
    if (!r.ok) return r
    out.push(r.password)
  }
  return { ok: true, passwords: out }
}

/** Entropy estimate in bits: length x log2(pool size). The "one of each type" rule lowers it very slightly. */
export function entropyBits(opts: PasswordOptions): number {
  const size = activePools(opts).flat().length
  return size > 1 ? Math.round(opts.length * Math.log2(size) * 10) / 10 : 0
}

export type Strength = 'Weak' | 'Fair' | 'Strong' | 'Very strong'

export function strengthOf(bits: number): Strength {
  if (bits < 40) return 'Weak'
  if (bits < 60) return 'Fair'
  if (bits < 90) return 'Strong'
  return 'Very strong'
}
