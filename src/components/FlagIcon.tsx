import { Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { countryForZone } from '@/lib/zones'

type FlagMap = Record<string, string>

// Flags are bundled SVG strings (no network requests, CSP-safe via data: URIs) and loaded lazily into their own chunk.
let flagsPromise: Promise<FlagMap> | null = null
let flagsCache: FlagMap | null = null
function loadFlags(): Promise<FlagMap> {
  flagsPromise ??= import('country-flag-icons/string/3x2').then((m) => {
    flagsCache = m as unknown as FlagMap
    return flagsCache
  })
  return flagsPromise
}

export function FlagIcon({ code, className }: { code?: string; className?: string }) {
  const [svg, setSvg] = useState<string | undefined>(code ? flagsCache?.[code] : undefined)

  useEffect(() => {
    if (!code) return
    let live = true
    loadFlags().then(
      (m) => live && setSvg(m[code]),
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [code])

  const box = 'inline-block h-3.5 w-5 shrink-0 rounded-[3px] ring-1 ring-border'
  if (!code) return <Globe className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground', className)} aria-hidden />
  if (!svg) return <span className={cn(box, 'bg-muted', className)} aria-hidden />
  return <img src={`data:image/svg+xml,${encodeURIComponent(svg)}`} alt="" aria-hidden className={cn(box, 'object-cover', className)} />
}

/** Flag + zone name, with the country name behind it. */
export function ZoneLabel({ zone, showCountry = true, className }: { zone: string; showCountry?: boolean; className?: string }) {
  const country = countryForZone(zone)
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-0.5', className)}>
      <FlagIcon code={country?.code} />
      <span>{zone}</span>
      {showCountry && country && <span className="font-normal text-muted-foreground">{country.name}</span>}
    </span>
  )
}
