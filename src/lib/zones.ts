import { getCountryForTimezone } from 'countries-and-timezones'
import { DateTime } from 'luxon'

export interface ZoneCountry {
  code: string
  name: string
}

/** Country for an IANA zone, or null for zones that belong to no country (UTC, Etc/*). */
export function countryForZone(zone: string): ZoneCountry | null {
  const c = getCountryForTimezone(zone)
  return c ? { code: c.id, name: c.name } : null
}

export const PINNED_ZONES = ['UTC', 'Asia/Bangkok']

export const QUICK_COMPARE_ZONES = [
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export function listTimezones(): string[] {
  let zones: string[] = []
  try {
    zones = Intl.supportedValuesOf('timeZone')
  } catch {
    zones = []
  }
  return [...PINNED_ZONES, ...zones.filter((z) => !PINNED_ZONES.includes(z))]
}

export function isKnownZone(zone: string): boolean {
  return DateTime.local().setZone(zone).isValid
}

/** Parse a persisted comma-separated zone list, dropping unknown and duplicate entries. */
export function parseZoneList(raw: string): string[] {
  return Array.from(new Set(raw.split(',').map((z) => z.trim()).filter(Boolean))).filter(isKnownZone)
}

/** Case-insensitive match on zone name, country name or country code. */
export function searchZones(zones: string[], query: string): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '_')
  if (!q) return zones
  const qSpaced = q.replace(/_/g, ' ')
  return zones.filter((z) => {
    if (z.toLowerCase().includes(q)) return true
    const c = countryForZone(z)
    return !!c && (c.name.toLowerCase().includes(qSpaced) || c.code.toLowerCase() === qSpaced)
  })
}
