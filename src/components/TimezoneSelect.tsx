import { useMemo } from 'react'
import { FlagIcon } from '@/components/FlagIcon'
import { Select } from '@/components/ui/textarea'
import { countryForZone, listTimezones } from '@/lib/zones'

export { listTimezones }

export function TimezoneSelect({
  value,
  onChange,
  id,
  label,
}: {
  value: string
  onChange: (zone: string) => void
  id: string
  label: string
}) {
  const zones = useMemo(listTimezones, [])
  const country = countryForZone(value)
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="min-w-[14rem] text-foreground">
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`${id}-country`}>
          <FlagIcon code={country?.code} />
          {country?.name ?? 'No country'}
        </span>
      </div>
    </div>
  )
}
