import { DateTime } from 'luxon'

export type Unit = 'auto' | 's' | 'ms'

export interface ZoneRow {
  zone: string
  iso: string
  readable: string
  offset: string
  abbreviation: string
  isDst: boolean
}

export interface TimestampResult {
  unit: 's' | 'ms'
  ms: number
  seconds: number
  utcIso: string
  rows: ZoneRow[]
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export function isValidZone(zone: string): boolean {
  return DateTime.local().setZone(zone).isValid
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

/** Values with 12+ digits (>= 1e11) are treated as milliseconds in auto mode. 1e11 s is year 5138; 1e11 ms is 1973. */
export function detectUnit(value: number): 's' | 'ms' {
  return Math.abs(value) >= 1e11 ? 'ms' : 's'
}

export function zoneRow(ms: number, zone: string): ZoneRow {
  const dt = DateTime.fromMillis(ms, { zone })
  return {
    zone,
    iso: dt.toISO({ suppressMilliseconds: false }) ?? '',
    readable: dt.toFormat('ccc, dd LLL yyyy HH:mm:ss'),
    offset: formatOffset(dt.offset),
    abbreviation: dt.offsetNameShort ?? '',
    isDst: dt.isInDST,
  }
}

function build(ms: number, unit: 's' | 'ms', zones: string[]): TimestampResult {
  return {
    unit,
    ms,
    seconds: Math.floor(ms / 1000),
    utcIso: new Date(ms).toISOString(),
    rows: zones.map((z) => zoneRow(ms, z)),
  }
}

export function timestampToDates(input: string, unit: Unit, zones: string[]): Result<TimestampResult> {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Enter a Unix timestamp.' }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { ok: false, error: 'A Unix timestamp must be a number, e.g. 1700000000 or 1700000000000.' }
  const value = Number(text)
  const resolved = unit === 'auto' ? detectUnit(value) : unit
  const ms = Math.round(resolved === 's' ? value * 1000 : value)
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) return { ok: false, error: 'Timestamp is outside the supported date range.' }
  const badZone = zones.find((z) => !isValidZone(z))
  if (badZone) return { ok: false, error: `Unknown timezone: ${badZone}` }
  return { ok: true, value: build(ms, resolved, zones) }
}

export interface DateConversion extends TimestampResult {
  /** True when the wall-clock time does not exist in the zone (spring-forward gap) and was shifted. */
  skipped: boolean
  /** True when the wall-clock time occurs twice (fall-back overlap); the earlier instant is used. */
  ambiguous: boolean
}

const HAS_OFFSET = /(Z|[+-]\d{2}(:?\d{2})?)$/i

/**
 * Convert a date/time string to a Unix timestamp. If the string carries its own offset (Z, +07:00) that wins;
 * otherwise it is interpreted as wall-clock time in `inputZone`.
 */
export function dateToTimestamp(input: string, inputZone: string, zones: string[]): Result<DateConversion> {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Enter a date and time, e.g. 2025-03-09 02:30:00 or 2025-03-09T02:30:00Z.' }
  if (!isValidZone(inputZone)) return { ok: false, error: `Unknown timezone: ${inputZone}` }
  const normalized = text.replace(/^(\d{4}-\d{2}-\d{2})\s+(?=\d)/, '$1T')
  const explicit = HAS_OFFSET.test(normalized) && /T/.test(normalized)
  const dt = DateTime.fromISO(normalized, explicit ? { setZone: true } : { zone: inputZone })
  if (!dt.isValid) return { ok: false, error: `Could not parse date. Use ISO 8601, e.g. 2025-03-09T02:30:00 (${dt.invalidExplanation ?? dt.invalidReason}).` }

  const ms = dt.toMillis()
  let skipped = false
  let ambiguous = false
  if (!explicit) {
    const wall = DateTime.fromISO(normalized, { zone: 'utc' })
    const local = dt.setZone(inputZone)
    skipped = wall.isValid && wall.toFormat("yyyy-MM-dd'T'HH:mm:ss") !== local.toFormat("yyyy-MM-dd'T'HH:mm:ss")
    if (!skipped) {
      ambiguous = [-3600e3, 3600e3, -1800e3, 1800e3].some((d) => {
        const other = DateTime.fromMillis(ms + d, { zone: inputZone })
        return other.toFormat("yyyy-MM-dd'T'HH:mm:ss") === local.toFormat("yyyy-MM-dd'T'HH:mm:ss")
      })
    }
  }
  return { ok: true, value: { ...build(ms, 'ms', zones), skipped, ambiguous } }
}

export function nowMs(): number {
  return Date.now()
}
