import { describe, expect, it } from 'vitest'
import { dateToTimestamp, detectUnit, formatOffset, timestampToDates } from '@/tools/timestamp/logic'

const ZONES = ['UTC', 'Asia/Bangkok', 'America/New_York']

describe('timestampToDates', () => {
  it('converts seconds', () => {
    const r = timestampToDates('1700000000', 's', ZONES)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.utcIso).toBe('2023-11-14T22:13:20.000Z')
      expect(r.value.unit).toBe('s')
      expect(r.value.rows[0].iso).toMatch(/^2023-11-14T22:13:20\.000(Z|\+00:00)$/)
      expect(r.value.rows[1].readable).toBe('Wed, 15 Nov 2023 05:13:20')
      expect(r.value.rows[1].offset).toBe('UTC+07:00')
      expect(r.value.rows[2].offset).toBe('UTC-05:00')
    }
  })
  it('converts milliseconds to the same instant', () => {
    const s = timestampToDates('1700000000', 's', ZONES)
    const ms = timestampToDates('1700000000000', 'ms', ZONES)
    expect(s.ok && ms.ok && s.value.ms === ms.value.ms).toBe(true)
  })
  it('auto-detects the unit', () => {
    expect(detectUnit(1700000000)).toBe('s')
    expect(detectUnit(1700000000000)).toBe('ms')
    const r = timestampToDates('1700000000000', 'auto', ['UTC'])
    expect(r.ok && r.value.unit).toBe('ms')
  })
  it('lets the user force seconds vs milliseconds', () => {
    const forced = timestampToDates('1700000000000', 's', ['UTC'])
    expect(forced.ok).toBe(true)
    if (forced.ok) expect(forced.value.utcIso).toMatch(/^\+0\d{5}-/) // 6-digit year: clearly not 2023
  })
  it('handles negative timestamps and the epoch', () => {
    const r = timestampToDates('0', 's', ['UTC'])
    expect(r.ok && r.value.utcIso).toBe('1970-01-01T00:00:00.000Z')
    const neg = timestampToDates('-86400', 's', ['UTC'])
    expect(neg.ok && neg.value.utcIso).toBe('1969-12-31T00:00:00.000Z')
  })
  it('rejects non-numeric, empty and out-of-range input', () => {
    expect(timestampToDates('abc', 'auto', ZONES).ok).toBe(false)
    expect(timestampToDates('', 'auto', ZONES).ok).toBe(false)
    expect(timestampToDates('99999999999999999', 'ms', ZONES).ok).toBe(false)
  })
  it('rejects unknown timezones', () => {
    const r = timestampToDates('0', 's', ['Mars/Olympus'])
    expect(r).toEqual({ ok: false, error: 'Unknown timezone: Mars/Olympus' })
  })
  it('reflects daylight saving time in offsets', () => {
    const winter = timestampToDates('1704067200', 's', ['America/New_York']) // 2024-01-01
    const summer = timestampToDates('1719792000', 's', ['America/New_York']) // 2024-07-01
    expect(winter.ok && winter.value.rows[0].offset).toBe('UTC-05:00')
    expect(winter.ok && winter.value.rows[0].isDst).toBe(false)
    expect(summer.ok && summer.value.rows[0].offset).toBe('UTC-04:00')
    expect(summer.ok && summer.value.rows[0].isDst).toBe(true)
  })
  it('changing the selected timezone changes the converted row', () => {
    const tokyo = timestampToDates('1700000000', 's', ['Asia/Tokyo'])
    const la = timestampToDates('1700000000', 's', ['America/Los_Angeles'])
    expect(tokyo.ok && tokyo.value.rows[0].offset).toBe('UTC+09:00')
    expect(la.ok && la.value.rows[0].offset).toBe('UTC-08:00')
  })
  it('supports half-hour offsets', () => {
    const r = timestampToDates('1700000000', 's', ['Asia/Kolkata'])
    expect(r.ok && r.value.rows[0].offset).toBe('UTC+05:30')
  })
})

describe('dateToTimestamp', () => {
  it('parses an ISO string with Z', () => {
    const r = dateToTimestamp('2023-11-14T22:13:20Z', 'Asia/Bangkok', ['UTC'])
    expect(r.ok && r.value.seconds).toBe(1700000000)
    expect(r.ok && r.value.ms).toBe(1700000000000)
  })
  it('lets an explicit offset override the selected zone', () => {
    const r = dateToTimestamp('2023-11-15T05:13:20+07:00', 'America/New_York', ['UTC'])
    expect(r.ok && r.value.seconds).toBe(1700000000)
  })
  it('interprets offset-less input in the chosen zone', () => {
    const bkk = dateToTimestamp('2023-11-15 05:13:20', 'Asia/Bangkok', ['UTC'])
    const utc = dateToTimestamp('2023-11-15 05:13:20', 'UTC', ['UTC'])
    expect(bkk.ok && bkk.value.seconds).toBe(1700000000)
    expect(utc.ok && utc.value.seconds).toBe(1700000000 + 7 * 3600)
  })
  it('flags a nonexistent spring-forward time', () => {
    const r = dateToTimestamp('2025-03-09 02:30:00', 'America/New_York', ['UTC'])
    expect(r.ok && r.value.skipped).toBe(true)
  })
  it('flags an ambiguous fall-back time and uses the earlier instant', () => {
    const r = dateToTimestamp('2025-11-02 01:30:00', 'America/New_York', ['UTC'])
    expect(r.ok && r.value.ambiguous).toBe(true)
    expect(r.ok && r.value.utcIso).toBe('2025-11-02T05:30:00.000Z') // EDT, first occurrence
  })
  it('does not flag ordinary times', () => {
    const r = dateToTimestamp('2025-06-15 09:30:00', 'America/New_York', ['UTC'])
    expect(r.ok && r.value.skipped).toBe(false)
    expect(r.ok && r.value.ambiguous).toBe(false)
  })
  it('rejects garbage', () => {
    expect(dateToTimestamp('not a date', 'UTC', ['UTC']).ok).toBe(false)
    expect(dateToTimestamp('', 'UTC', ['UTC']).ok).toBe(false)
    expect(dateToTimestamp('2025-02-30T00:00:00Z', 'UTC', ['UTC']).ok).toBe(false)
  })
})

describe('formatOffset', () => {
  it('formats positive, negative and zero offsets', () => {
    expect(formatOffset(420)).toBe('UTC+07:00')
    expect(formatOffset(-300)).toBe('UTC-05:00')
    expect(formatOffset(0)).toBe('UTC+00:00')
    expect(formatOffset(345)).toBe('UTC+05:45')
  })
})
