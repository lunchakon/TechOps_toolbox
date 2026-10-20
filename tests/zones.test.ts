import { describe, expect, it } from 'vitest'
import { countryForZone, listTimezones, parseZoneList, QUICK_COMPARE_ZONES, searchZones } from '@/lib/zones'

describe('countryForZone', () => {
  it('maps common zones to a country', () => {
    expect(countryForZone('Asia/Bangkok')).toEqual({ code: 'TH', name: 'Thailand' })
    expect(countryForZone('America/New_York')?.code).toBe('US')
    expect(countryForZone('Europe/London')?.code).toBe('GB')
    expect(countryForZone('Asia/Tokyo')).toEqual({ code: 'JP', name: 'Japan' })
  })
  it('returns null for zones without a country', () => {
    expect(countryForZone('UTC')).toBeNull()
    expect(countryForZone('Nope/Zone')).toBeNull()
  })
  it('knows a country for every quick-compare zone', () => {
    for (const z of QUICK_COMPARE_ZONES) expect(countryForZone(z), z).not.toBeNull()
  })
})

describe('listTimezones', () => {
  it('pins UTC and Asia/Bangkok first, without duplicates', () => {
    const zones = listTimezones()
    expect(zones.slice(0, 2)).toEqual(['UTC', 'Asia/Bangkok'])
    expect(new Set(zones).size).toBe(zones.length)
    expect(zones).toContain('America/New_York')
  })
})

describe('parseZoneList', () => {
  it('drops blanks, duplicates and unknown zones', () => {
    expect(parseZoneList('Asia/Tokyo, Asia/Tokyo,,Mars/Base,Europe/Paris')).toEqual(['Asia/Tokyo', 'Europe/Paris'])
    expect(parseZoneList('')).toEqual([])
  })
})

describe('searchZones', () => {
  const zones = listTimezones()
  it('matches by city, ignoring case and spaces', () => {
    expect(searchZones(zones, 'new york')).toContain('America/New_York')
  })
  it('matches by country name', () => {
    const r = searchZones(zones, 'japan')
    expect(r).toContain('Asia/Tokyo')
    expect(r.every((z) => countryForZone(z)?.name === 'Japan' || z.toLowerCase().includes('japan'))).toBe(true)
  })
  it('matches by country code', () => {
    expect(searchZones(zones, 'th')).toContain('Asia/Bangkok')
  })
  it('returns everything for an empty query and nothing for gibberish', () => {
    expect(searchZones(zones, '  ')).toEqual(zones)
    expect(searchZones(zones, 'zzzzqq')).toEqual([])
  })
})
