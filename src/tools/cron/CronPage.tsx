import { CalendarClock, Eraser } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Notice, Panel, ToolHeader } from '@/components/ToolLayout'
import { TimezoneSelect } from '@/components/TimezoneSelect'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/textarea'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { describeCron, explainFields, nextRuns, PRESETS, validateCron } from './logic'

const COMPARISON: { feature: string; unix: string; quartz: string; k8s: string }[] = [
  { feature: 'Fields', unix: '5: min hour dom month dow', quartz: '6-7: sec min hour dom month dow [year]', k8s: '5 (same as Unix)' },
  { feature: 'Seconds field', unix: 'No', quartz: 'Yes (first field)', k8s: 'No' },
  { feature: 'Names (JAN, MON)', unix: 'Yes', quartz: 'Yes', k8s: 'Yes' },
  { feature: 'Day-of-week numbers', unix: '0-7 (0 and 7 = Sunday)', quartz: '1-7 (1 = Sunday)', k8s: '0-7 (0 and 7 = Sunday)' },
  { feature: 'L, W, # and ?', unix: 'No', quartz: 'Yes', k8s: 'No ("?" is accepted as "*")' },
  { feature: 'Macros (@daily…)', unix: 'Vixie cron: yes', quartz: 'No', k8s: '@hourly, @daily, @weekly, @monthly, @yearly' },
  { feature: 'dom AND dow both set', unix: 'OR: runs if either matches', quartz: 'One of them must be ?', k8s: 'OR (as Unix)' },
  { feature: 'Timezone', unix: 'Server local time', quartz: 'Scheduler setting', k8s: 'UTC (controller time) unless spec.timeZone is set' },
]

export function CronPage() {
  const [expr, setExpr] = useState('*/15 9-17 * * 1-5')
  const [zone, setZone] = usePersistentState('techops.timezone', 'Asia/Bangkok')
  const [now, setNow] = useState(() => new Date())

  // Re-evaluate "next runs" every 30s so the list stays current while the page is open.
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const valid = useMemo(() => validateCron(expr), [expr])
  const description = useMemo(() => (valid.ok ? describeCron(valid.normalized) : null), [valid])
  const fields = useMemo(() => (valid.ok ? explainFields(valid.fields) : []), [valid])
  const runs = useMemo(() => (valid.ok ? nextRuns(valid.normalized, zone, 10, now) : null), [valid, zone, now])

  return (
    <div>
      <ToolHeader
        icon={CalendarClock}
        title="Cron & Schedule Visualizer"
        description="Standard five-field Unix cron: validation, plain-English explanation and the next 10 runs in any timezone, with daylight-saving transitions handled."
      />

      <div className="grid gap-4">
        <Panel title="Expression" actions={<><CopyButton value={expr.trim()} label="Copy expression" /><Button size="sm" variant="ghost" onClick={() => setExpr('')}><Eraser className="h-3.5 w-3.5" aria-hidden /> Clear</Button></>}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
              Cron expression (minute hour day-of-month month day-of-week)
              <Input value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="*/5 * * * *" className="h-11 font-mono text-lg text-foreground" aria-invalid={!valid.ok} aria-label="Cron expression" />
            </label>
            <TimezoneSelect id="cron-tz" label="Timezone" value={zone} onChange={setZone} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Presets">
            <span className="text-xs font-medium text-muted-foreground">Presets:</span>
            {PRESETS.map((p) => (
              <button key={p.expr} type="button" onClick={() => setExpr(p.expr)} className="rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {!valid.ok ? (
              <Notice kind="error" title="Invalid or unsupported expression">{valid.error}</Notice>
            ) : (
              <Notice kind="success" title={description ?? 'Valid expression'}>
                {description === null && 'No plain-English description available for this expression.'}
              </Notice>
            )}
          </div>
        </Panel>

        {valid.ok && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Field breakdown">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr><th scope="col" className="py-1 pr-2 font-medium">Field</th><th scope="col" className="py-1 pr-2 font-medium">Value</th><th scope="col" className="py-1 font-medium">Meaning</th></tr>
                </thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f.label} className="border-t align-top">
                      <th scope="row" className="py-2 pr-2 font-medium">{f.label}<span className="block text-xs font-normal text-muted-foreground">{f.allowed}</span></th>
                      <td className="py-2 pr-2 font-mono">{f.value}</td>
                      <td className="py-2">{f.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {valid.fields[2] !== '*' && valid.fields[4] !== '*' && (
                <Notice kind="warning" className="mt-3">Both day-of-month and day-of-week are restricted. In Unix cron the job runs when <strong>either</strong> matches (OR), not both.</Notice>
              )}
            </Panel>

            <Panel title={`Next 10 runs (${zone})`}>
              {runs && !runs.ok && <Notice kind="error">{runs.error}</Notice>}
              {runs?.ok && (
                <ol className="space-y-1.5 text-sm">
                  {runs.runs.map((r, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-1.5">
                      <span className="font-mono">{r.weekday} {r.local} <span className="text-muted-foreground">{r.offset}</span>{r.isDst && <Badge variant="warning" className="ml-2">DST</Badge>}</span>
                      <span className="font-mono text-xs text-muted-foreground">{r.utc}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                DST: a time skipped by clock changes (e.g. 02:30 on spring-forward day) fires once at the equivalent instant after the gap; a repeated hour fires once per real occurrence for wildcard hours, and once for fixed times.
              </p>
            </Panel>
          </div>
        )}

        <Panel title="Supported syntax and dialect differences">
          <p className="mb-3 text-sm text-muted-foreground">
            Supported: <code className="font-mono">*</code>, lists <code className="font-mono">1,15</code>, ranges <code className="font-mono">1-5</code>, steps <code className="font-mono">*/10</code> / <code className="font-mono">0-30/5</code>, and JAN-DEC / SUN-SAT names.
            Anything else (seconds field, <code className="font-mono">L W # ?</code>, <code className="font-mono">@macros</code>) is rejected with an error rather than guessed.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr><th scope="col" className="py-1.5 pr-3 font-medium">Feature</th><th scope="col" className="py-1.5 pr-3 font-medium">Unix cron (this tool)</th><th scope="col" className="py-1.5 pr-3 font-medium">Quartz</th><th scope="col" className="py-1.5 font-medium">Kubernetes CronJob</th></tr>
              </thead>
              <tbody>
                {COMPARISON.map((c) => (
                  <tr key={c.feature} className="border-t align-top">
                    <th scope="row" className="py-2 pr-3 font-medium">{c.feature}</th>
                    <td className="py-2 pr-3">{c.unix}</td>
                    <td className="py-2 pr-3">{c.quartz}</td>
                    <td className="py-2">{c.k8s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
