import { Clock, Eraser } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Examples, Notice, Panel, ToolHeader } from '@/components/ToolLayout'
import { ZoneLabel } from '@/components/FlagIcon'
import { TimezoneSelect } from '@/components/TimezoneSelect'
import { ZoneMultiSelect } from '@/components/ZoneMultiSelect'
import { parseZoneList } from '@/lib/zones'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/textarea'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { dateToTimestamp, nowMs, timestampToDates, type TimestampResult, type Unit } from './logic'

function ZoneTable({ result }: { result: TimestampResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Converted time per timezone</caption>
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="py-1.5 pr-3 font-medium">Zone</th>
            <th scope="col" className="py-1.5 pr-3 font-medium">Local time</th>
            <th scope="col" className="py-1.5 pr-3 font-medium">Offset</th>
            <th scope="col" className="py-1.5 pr-3 font-medium">ISO 8601</th>
            <th scope="col" className="py-1.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r) => (
            <tr key={r.zone} className="border-t align-top">
              <th scope="row" className="py-2 pr-3 font-medium"><ZoneLabel zone={r.zone} /></th>
              <td className="py-2 pr-3">{r.readable} <span className="text-muted-foreground">({r.abbreviation})</span>{r.isDst && <Badge variant="warning" className="ml-2">DST</Badge>}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.offset}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.iso}</td>
              <td className="py-2"><CopyButton value={r.iso} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Summary({ result }: { result: TimestampResult }) {
  const items = [
    { label: 'Seconds', value: String(result.seconds) },
    { label: 'Milliseconds', value: String(result.ms) },
    { label: 'ISO 8601 (UTC)', value: result.utcIso },
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-md border p-3">
          <dt className="text-xs font-medium text-muted-foreground">{i.label}</dt>
          <dd className="mt-1 flex items-center justify-between gap-2 break-all font-mono text-sm">
            {i.value}
            <CopyButton value={i.value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function TimestampPage() {
  const [zone, setZone] = usePersistentState('techops.timezone', 'Asia/Bangkok')
  const [tsInput, setTsInput] = useState('')
  const [unit, setUnit] = useState<Unit>('auto')
  const [dateInput, setDateInput] = useState('')
  const [dateZone, setDateZone] = useState(zone)

  const [compareRaw, setCompareRaw] = usePersistentState('techops.compareZones', '')

  const fixed = useMemo(() => Array.from(new Set(['UTC', 'Asia/Bangkok', zone])), [zone])
  const compare = useMemo(() => parseZoneList(compareRaw).filter((z) => !fixed.includes(z)), [compareRaw, fixed])
  const zones = useMemo(() => [...fixed, ...compare], [fixed, compare])
  const tsResult = useMemo(() => (tsInput.trim() ? timestampToDates(tsInput, unit, zones) : null), [tsInput, unit, zones])
  const dateResult = useMemo(() => (dateInput.trim() ? dateToTimestamp(dateInput, dateZone, zones) : null), [dateInput, dateZone, zones])

  return (
    <div>
      <ToolHeader
        icon={Clock}
        title="Unix Timestamp & Timezone Converter"
        description="Unix timestamps count seconds (10 digits today) or milliseconds (13 digits) since 1970-01-01T00:00:00Z. Results are shown in UTC, Asia/Bangkok and your selected timezone, with DST handled by the IANA timezone database."
      />

      <div className="mb-4 grid gap-4">
        <Panel title="Timezones to compare">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <TimezoneSelect id="tz-select" label="Your timezone" value={zone} onChange={setZone} />
            <p className="pb-2 text-xs text-muted-foreground">UTC, Asia/Bangkok and your timezone are always shown. Choices are remembered in this browser.</p>
          </div>
          <ZoneMultiSelect selected={compare} onChange={(z) => setCompareRaw(z.join(','))} fixed={fixed} />
        </Panel>
      </div>

      <div className="grid gap-4">
        <Panel
          title="Timestamp → date"
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={() => { setTsInput(String(Math.floor(nowMs() / 1000))); setUnit('s') }}>Now (seconds)</Button>
              <Button size="sm" variant="secondary" onClick={() => { setTsInput(String(nowMs())); setUnit('ms') }}>Now (ms)</Button>
              <Button size="sm" variant="ghost" onClick={() => setTsInput('')}><Eraser className="h-3.5 w-3.5" aria-hidden /> Clear</Button>
            </>
          }
        >
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
              Unix timestamp
              <Input value={tsInput} onChange={(e) => setTsInput(e.target.value)} placeholder="1700000000 or 1700000000000" inputMode="decimal" className="font-mono text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Unit
              <Select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="text-foreground">
                <option value="auto">Auto-detect</option>
                <option value="s">Seconds</option>
                <option value="ms">Milliseconds</option>
              </Select>
            </label>
          </div>
          <Examples
            items={[
              { label: '1700000000 (s)', value: '1700000000' },
              { label: '1700000000000 (ms)', value: '1700000000000' },
              { label: '0 (epoch)', value: '0' },
            ]}
            onPick={(v) => { setTsInput(v); setUnit('auto') }}
          />
          <div className="mt-4 space-y-3">
            {!tsResult && <p className="text-sm text-muted-foreground">Enter a timestamp to see it in each timezone.</p>}
            {tsResult && !tsResult.ok && <Notice kind="error">{tsResult.error}</Notice>}
            {tsResult?.ok && (
              <>
                <Notice kind="info">
                  Interpreted as <strong>{tsResult.value.unit === 's' ? 'seconds' : 'milliseconds'}</strong>
                  {unit === 'auto' && ' (auto-detected: values of 12+ digits are treated as milliseconds)'}.
                </Notice>
                <Summary result={tsResult.value} />
                <ZoneTable result={tsResult.value} />
              </>
            )}
          </div>
        </Panel>

        <Panel
          title="Date → timestamp"
          actions={<Button size="sm" variant="ghost" onClick={() => setDateInput('')}><Eraser className="h-3.5 w-3.5" aria-hidden /> Clear</Button>}
        >
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
              Date and time (ISO 8601)
              <Input value={dateInput} onChange={(e) => setDateInput(e.target.value)} placeholder="2025-03-09 02:30:00 or 2025-03-09T02:30:00+07:00" className="font-mono text-foreground" />
            </label>
            <TimezoneSelect id="date-zone" label="Interpret as timezone" value={dateZone} onChange={setDateZone} />
          </div>
          <Examples
            items={[
              { label: 'ISO with Z', value: '2025-01-01T00:00:00Z' },
              { label: 'Bangkok wall time', value: '2025-06-15 09:30:00' },
              { label: 'DST gap (use New_York)', value: '2025-03-09 02:30:00' },
            ]}
            onPick={setDateInput}
          />
          <div className="mt-4 space-y-3">
            {!dateResult && <p className="text-sm text-muted-foreground">Enter a date. An explicit offset (Z, +07:00) overrides the timezone selector.</p>}
            {dateResult && !dateResult.ok && <Notice kind="error">{dateResult.error}</Notice>}
            {dateResult?.ok && (
              <>
                {dateResult.value.skipped && <Notice kind="warning" title="Time does not exist">That wall-clock time falls in a daylight-saving gap in {dateZone}; it was shifted forward.</Notice>}
                {dateResult.value.ambiguous && <Notice kind="warning" title="Ambiguous time">That wall-clock time occurs twice in {dateZone} (clocks go back); the earlier occurrence is used.</Notice>}
                <Summary result={dateResult.value} />
                <ZoneTable result={dateResult.value} />
              </>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
