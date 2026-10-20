import { describe, expect, it } from 'vitest'
import { describeCron, explainFields, nextRuns, PRESETS, validateCron } from '@/tools/cron/logic'

const runs = (expr: string, tz: string, from: string, n = 10) => {
  const r = nextRuns(expr, tz, n, new Date(from))
  if (!r.ok) throw new Error(r.error)
  return r.runs
}

describe('validateCron', () => {
  it.each(['* * * * *', '*/5 * * * *', '0 9 * * 1-5', '0 0 1,15 * *', '0-30/10 * * * *', '0 0 * JAN MON', '0 0 * * 7', '15 14 1 * *'])('accepts %s', (e) => {
    expect(validateCron(e).ok).toBe(true)
  })
  it('accepts every preset', () => {
    for (const p of PRESETS) expect(validateCron(p.expr).ok, p.label).toBe(true)
  })
  it('tolerates extra whitespace', () => {
    const r = validateCron('  0   9  * *  1 ')
    expect(r.ok && r.normalized).toBe('0 9 * * 1')
  })
  it('rejects empty input', () => {
    expect(validateCron('').ok).toBe(false)
  })
  it('rejects the wrong number of fields', () => {
    const r = validateCron('* * * *')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/found 4/)
  })
  it('rejects 6 and 7 field (Quartz/seconds) expressions explicitly', () => {
    for (const e of ['0 0 12 * * ?', '0 0 12 * * ? 2030', '*/10 * * * * *']) {
      const r = validateCron(e)
      expect(r.ok, e).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/Quartz|seconds/)
    }
  })
  it.each(['0 0 L * *', '0 0 15W * *', '0 0 * * 5#3', '0 0 ? * *', '0 0 * * 5L'])('rejects Quartz-only syntax in %s', (e) => {
    const r = validateCron(e)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Quartz/)
  })
  it('rejects macros with the equivalent expression', () => {
    const r = validateCron('@daily')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/0 0 \* \* \*/)
    expect(validateCron('@reboot').ok).toBe(false)
  })
  it('rejects out-of-range values', () => {
    for (const e of ['60 * * * *', '* 24 * * *', '* * 0 * *', '* * 32 * *', '* * * 13 *', '* * * * 8']) {
      expect(validateCron(e).ok, e).toBe(false)
    }
  })
  it('rejects bad ranges, steps and characters', () => {
    expect(validateCron('5-1 * * * *').ok).toBe(false)
    expect(validateCron('*/0 * * * *').ok).toBe(false)
    expect(validateCron('a * * * *').ok).toBe(false)
    expect(validateCron('1;2 * * * *').ok).toBe(false)
    expect(validateCron('* * * FOO *').ok).toBe(false)
  })
  it('rejects impossible dates instead of silently accepting', () => {
    expect(validateCron('0 0 31 2 *').ok).toBe(false)
  })
})

describe('describeCron / explainFields', () => {
  it('describes common expressions in English', () => {
    expect(describeCron('* * * * *')).toBe('Every minute')
    expect(describeCron('*/5 * * * *')).toBe('Every 5 minutes')
    expect(describeCron('0 9 * * 1-5')).toMatch(/09:00.*Monday through Friday/)
  })
  it('returns null for an expression it cannot describe', () => {
    expect(describeCron('nonsense')).toBeNull()
  })
  it('explains each field', () => {
    const ex = explainFields(['*/15', '9-17', '1,15', '*', 'MON-FRI'])
    expect(ex.map((e) => e.label)).toEqual(['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'])
    expect(ex[0].meaning).toBe('every 15 minutes')
    expect(ex[1].meaning).toBe('9 through 17')
    expect(ex[2].meaning).toBe('1, and 15')
    expect(ex[3].meaning).toBe('every month')
    expect(ex[4].meaning).toBe('MON through FRI')
    expect(ex[4].allowed).toContain('0 and 7 = Sunday')
  })
})

describe('nextRuns', () => {
  it('returns 10 runs in ascending order', () => {
    const r = runs('*/15 * * * *', 'UTC', '2025-01-01T00:07:00Z')
    expect(r).toHaveLength(10)
    expect(r.slice(0, 3).map((x) => x.local)).toEqual(['2025-01-01 00:15', '2025-01-01 00:30', '2025-01-01 00:45'])
    const stamps = r.map((x) => x.utc)
    expect([...stamps].sort()).toEqual(stamps)
  })
  it('excludes the current instant (strictly after)', () => {
    expect(runs('0 * * * *', 'UTC', '2025-01-01T05:00:00Z', 1)[0].local).toBe('2025-01-01 06:00')
  })
  it('handles daily, weekly and monthly presets', () => {
    expect(runs('30 2 * * *', 'UTC', '2025-01-01T12:00:00Z', 2).map((x) => x.local)).toEqual(['2025-01-02 02:30', '2025-01-03 02:30'])
    const weekly = runs('0 0 * * 0', 'UTC', '2025-01-01T00:00:00Z', 2)
    expect(weekly.map((x) => [x.local, x.weekday])).toEqual([['2025-01-05 00:00', 'Sun'], ['2025-01-12 00:00', 'Sun']])
    expect(runs('0 0 1 * *', 'UTC', '2025-01-15T00:00:00Z', 3).map((x) => x.local)).toEqual(['2025-02-01 00:00', '2025-03-01 00:00', '2025-04-01 00:00'])
  })
  it('treats day-of-week 0 and 7 as Sunday', () => {
    const a = runs('0 9 * * 0', 'UTC', '2025-01-01T00:00:00Z', 3).map((x) => x.local)
    const b = runs('0 9 * * 7', 'UTC', '2025-01-01T00:00:00Z', 3).map((x) => x.local)
    expect(a).toEqual(b)
  })
  it('uses OR semantics when both day-of-month and day-of-week are set', () => {
    const r = runs('0 0 13 * 5', 'UTC', '2025-01-01T00:00:00Z', 4).map((x) => x.local)
    expect(r).toEqual(['2025-01-03 00:00', '2025-01-10 00:00', '2025-01-13 00:00', '2025-01-17 00:00'])
  })
  it('handles leap day', () => {
    expect(runs('0 0 29 2 *', 'UTC', '2025-01-01T00:00:00Z', 1)[0].local).toBe('2028-02-29 00:00')
  })

  describe('timezones', () => {
    it('produces different UTC instants for the same expression in different zones', () => {
      const bkk = runs('0 9 * * *', 'Asia/Bangkok', '2025-01-01T00:00:00Z', 1)[0]
      const utc = runs('0 9 * * *', 'UTC', '2025-01-01T00:00:00Z', 1)[0]
      const ny = runs('0 9 * * *', 'America/New_York', '2025-01-01T00:00:00Z', 1)[0]
      expect(bkk.utc).toBe('2025-01-01 02:00 UTC')
      expect(bkk.offset).toBe('+07:00')
      expect(utc.utc).toBe('2025-01-01 09:00 UTC')
      expect(ny.utc).toBe('2025-01-01 14:00 UTC')
      expect(ny.offset).toBe('-05:00')
    })
    it('supports half-hour zones', () => {
      expect(runs('0 9 * * *', 'Asia/Kolkata', '2025-01-01T00:00:00Z', 1)[0].utc).toBe('2025-01-01 03:30 UTC')
    })
    it('rejects unknown zones', () => {
      expect(nextRuns('* * * * *', 'Nope/Zone')).toEqual({ ok: false, error: 'Unknown timezone: Nope/Zone' })
    })
  })

  describe('daylight saving transitions', () => {
    it('keeps wall-clock time constant across spring-forward and changes the UTC offset', () => {
      const r = runs('0 12 * * *', 'America/New_York', '2025-03-08T00:00:00Z', 3)
      expect(r.map((x) => x.local)).toEqual(['2025-03-08 12:00', '2025-03-09 12:00', '2025-03-10 12:00'])
      expect(r.map((x) => x.offset)).toEqual(['-05:00', '-04:00', '-04:00'])
      expect(r.map((x) => x.isDst)).toEqual([false, true, true])
    })
    it('runs a job scheduled inside the spring-forward gap exactly once, after the gap', () => {
      const r = runs('30 2 * * *', 'America/New_York', '2025-03-07T12:00:00Z', 4)
      expect(r.map((x) => x.utc)).toEqual([
        '2025-03-08 07:30 UTC',
        '2025-03-09 07:30 UTC', // 02:30 EST does not exist; fires at 03:30 EDT (same instant)
        '2025-03-10 06:30 UTC',
        '2025-03-11 06:30 UTC',
      ])
      expect(r[1].local).toBe('2025-03-09 03:30')
    })
    it('fires an hourly job once per real hour through fall-back (no skipped or duplicated instants)', () => {
      const r = runs('0 * * * *', 'America/New_York', '2025-11-02T03:30:00Z', 6)
      expect(r.map((x) => x.utc)).toEqual([
        '2025-11-02 04:00 UTC',
        '2025-11-02 05:00 UTC',
        '2025-11-02 06:00 UTC',
        '2025-11-02 07:00 UTC',
        '2025-11-02 08:00 UTC',
        '2025-11-02 09:00 UTC',
      ])
      expect(r.map((x) => x.local)).toEqual(['2025-11-02 00:00', '2025-11-02 01:00', '2025-11-02 01:00', '2025-11-02 02:00', '2025-11-02 03:00', '2025-11-02 04:00'])
      expect(r.map((x) => x.offset)).toEqual(['-04:00', '-04:00', '-05:00', '-05:00', '-05:00', '-05:00'])
    })
    it('fires a fixed-time job inside the repeated hour only once', () => {
      const r = runs('30 1 * * *', 'America/New_York', '2025-11-01T12:00:00Z', 3)
      expect(r.map((x) => x.local)).toEqual(['2025-11-02 01:30', '2025-11-03 01:30', '2025-11-04 01:30'])
    })
    it('follows the European DST schedule independently', () => {
      const r = runs('0 12 * * 1-5', 'Europe/London', '2025-03-28T00:00:00Z', 3)
      expect(r.map((x) => x.offset)).toEqual(['+00:00', '+01:00', '+01:00'])
    })
    it('does not shift zones without DST', () => {
      const r = runs('0 12 * * *', 'Asia/Bangkok', '2025-03-08T00:00:00Z', 3)
      expect(new Set(r.map((x) => x.offset))).toEqual(new Set(['+07:00']))
    })
    it('southern hemisphere DST (Sydney) ends in April', () => {
      const r = runs('0 12 * * *', 'Australia/Sydney', '2025-04-04T00:00:00Z', 3)
      expect(r.map((x) => x.offset)).toEqual(['+11:00', '+11:00', '+10:00'])
    })
  })

  it('propagates validation errors', () => {
    const r = nextRuns('0 0 12 * * ?', 'UTC')
    expect(r.ok).toBe(false)
  })
})
