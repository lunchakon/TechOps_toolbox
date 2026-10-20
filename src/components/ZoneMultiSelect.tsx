import { ChevronDown, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlagIcon, ZoneLabel } from '@/components/FlagIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/textarea'
import { countryForZone, listTimezones, QUICK_COMPARE_ZONES, searchZones } from '@/lib/zones'

const MAX_VISIBLE = 80

/** Searchable multi-select of IANA timezones with country flags. `fixed` zones are always shown and cannot be removed here. */
export function ZoneMultiSelect({
  selected,
  onChange,
  fixed = [],
}: {
  selected: string[]
  onChange: (zones: string[]) => void
  fixed?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const all = useMemo(listTimezones, [])
  const matches = useMemo(() => searchZones(all, query), [all, query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (zone: string) => onChange(selected.includes(zone) ? selected.filter((z) => z !== zone) : [...selected, zone])
  const quick = QUICK_COMPARE_ZONES.filter((z) => !selected.includes(z) && !fixed.includes(z))

  return (
    <div ref={root} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add timezones <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </Button>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear all
          </Button>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Timezones being compared">
        {fixed.map((z) => (
          <li key={z} className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
            <ZoneLabel zone={z} showCountry={false} />
          </li>
        ))}
        {selected.map((z) => (
          <li key={z} className="inline-flex items-center gap-1 rounded-full border bg-accent py-1 pl-2.5 pr-1 text-xs text-accent-foreground">
            <ZoneLabel zone={z} showCountry={false} />
            <button
              type="button"
              onClick={() => toggle(z)}
              aria-label={`Remove ${z}`}
              className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {quick.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Quick add">
          <span className="text-xs font-medium text-muted-foreground">Quick add:</span>
          {quick.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => toggle(z)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FlagIcon code={countryForZone(z)?.code} /> {z.split('/').pop()?.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute left-0 top-9 z-20 w-[min(26rem,calc(100vw-2rem))] rounded-lg border bg-card p-3 shadow-lg" role="dialog" aria-label="Select timezones">
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search city, zone, country or code (e.g. Japan, TH)" aria-label="Search timezones" />
          <ul className="mt-2 max-h-64 overflow-y-auto" aria-label="Timezone results">
            {matches.slice(0, MAX_VISIBLE).map((z) => {
              const isFixed = fixed.includes(z)
              return (
                <li key={z}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent has-[:disabled]:cursor-default has-[:disabled]:opacity-60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={isFixed || selected.includes(z)}
                      disabled={isFixed}
                      onChange={() => toggle(z)}
                    />
                    <ZoneLabel zone={z} />
                  </label>
                </li>
              )
            })}
            {matches.length === 0 && <li className="px-2 py-3 text-sm text-muted-foreground">No timezones match “{query}”.</li>}
          </ul>
          {matches.length > MAX_VISIBLE && <p className="mt-2 text-xs text-muted-foreground">Showing {MAX_VISIBLE} of {matches.length}. Type to narrow the list.</p>}
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )
}
