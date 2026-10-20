import { Eraser, Regex } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Examples, Notice, Panel, ToolHeader } from '@/components/ToolLayout'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/textarea'
import { buildSegments, REGEX_EXAMPLES, validateFlags, type RegexResult } from './logic'
import { RegexRunner } from './runner'

const FLAG_INFO: [string, string][] = [
  ['g', 'global'],
  ['i', 'ignore case'],
  ['m', 'multiline'],
  ['s', 'dotAll'],
  ['u', 'unicode'],
  ['y', 'sticky'],
]

export function RegexPage() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('')
  const [result, setResult] = useState<RegexResult | null>(null)
  const [running, setRunning] = useState(false)
  const runner = useRef<RegexRunner>()

  useEffect(() => {
    runner.current = new RegexRunner()
    return () => runner.current?.cancel()
  }, [])

  useEffect(() => {
    if (!pattern) {
      runner.current?.cancel()
      setResult(null)
      setRunning(false)
      return
    }
    setRunning(true)
    let stale = false
    const t = window.setTimeout(() => {
      runner.current?.run(pattern, flags, text).then((r) => {
        if (stale) return
        setResult(r)
        setRunning(false)
      })
    }, 200)
    return () => {
      stale = true
      window.clearTimeout(t)
    }
  }, [pattern, flags, text])

  const toggleFlag = (f: string) => setFlags((cur) => (cur.includes(f) ? cur.replace(f, '') : cur + f))
  const flagError = validateFlags(flags)
  const matches = useMemo(() => (result?.ok ? result.matches : []), [result])
  const segments = useMemo(() => buildSegments(text, matches), [text, matches])

  return (
    <div>
      <ToolHeader
        icon={Regex}
        title="Regex Tester"
        description="Uses the JavaScript (ECMAScript) regex engine. Matching runs in a background worker that is stopped after 1.5 seconds, so catastrophic patterns cannot freeze the page."
      />

      <Examples
        items={REGEX_EXAMPLES.map((e) => ({ label: e.label, value: e.label }))}
        onPick={(label) => {
          const ex = REGEX_EXAMPLES.find((e) => e.label === label)!
          setPattern(ex.pattern)
          setFlags(ex.flags)
          setText(ex.text)
        }}
      />

      <div className="mt-4 grid gap-4">
        <Panel
          title="Pattern"
          actions={<Button size="sm" variant="ghost" onClick={() => { setPattern(''); setText(''); setFlags('g') }}><Eraser className="h-3.5 w-3.5" aria-hidden /> Reset</Button>}
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
              Regular expression
              <div className="flex items-center gap-1 font-mono">
                <span className="text-lg text-muted-foreground">/</span>
                <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="(\d+)-(\w+)" className="font-mono text-foreground" aria-label="Regular expression" />
                <span className="text-lg text-muted-foreground">/</span>
              </div>
            </label>
            <label className="flex w-28 flex-col gap-1 text-xs font-medium text-muted-foreground">
              Flags
              <Input value={flags} onChange={(e) => setFlags(e.target.value)} className="font-mono text-foreground" aria-label="Flags" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Flag toggles">
            {FLAG_INFO.map(([f, label]) => (
              <Button key={f} size="sm" variant={flags.includes(f) ? 'default' : 'outline'} aria-pressed={flags.includes(f)} onClick={() => toggleFlag(f)}>
                {f} <span className="font-normal opacity-80">{label}</span>
              </Button>
            ))}
          </div>
          {(flagError || (result && !result.ok)) && (
            <Notice kind="error" title="Invalid expression" className="mt-3">
              {flagError ?? (result && !result.ok ? result.error : '')}
            </Notice>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Test text">
            <Textarea aria-label="Test text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text to test against…" />
          </Panel>
          <Panel title={`Highlighted matches${result?.ok ? ` (${result.matches.length}${result.truncated ? '+' : ''})` : ''}`}>
            {!pattern ? (
              <p className="text-sm text-muted-foreground">Enter a pattern or pick an example to see matches.</p>
            ) : running && !result ? (
              <p className="text-sm text-muted-foreground">Matching…</p>
            ) : (
              <pre className="max-h-[320px] min-h-[220px] overflow-auto whitespace-pre-wrap break-words rounded-md border bg-background p-3 font-mono text-sm" aria-label="Highlighted text">
                {segments.map((s, i) =>
                  s.match === null ? (
                    <span key={i}>{s.text}</span>
                  ) : (
                    <mark key={i} title={`Match ${s.match + 1}`} className={s.match % 2 ? 'rounded bg-primary/30 px-0.5 text-foreground' : 'rounded bg-warning/30 px-0.5 text-foreground'}>
                      {s.text}
                    </mark>
                  ),
                )}
              </pre>
            )}
            {result?.ok && result.truncated && <Notice kind="warning" className="mt-3">Showing the first 1,000 matches only.</Notice>}
          </Panel>
        </div>

        {result?.ok && pattern && (
          <Panel title="Match details">
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-1.5 pr-3 font-medium">#</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Match</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Position</th>
                      <th scope="col" className="py-1.5 font-medium">Capture groups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.slice(0, 200).map((m, i) => (
                      <tr key={i} className="border-t align-top">
                        <td className="py-2 pr-3">{i + 1}</td>
                        <td className="break-all py-2 pr-3 font-mono">{m.text === '' ? <em className="text-muted-foreground">(empty)</em> : m.text}</td>
                        <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs">{m.index}–{m.end}</td>
                        <td className="py-2">
                          {m.groups.length === 0 ? (
                            <span className="text-muted-foreground">none</span>
                          ) : (
                            <ul className="space-y-0.5 font-mono text-xs">
                              {m.groups.map((g) => (
                                <li key={g.index}>
                                  <span className="text-muted-foreground">{g.name ? `${g.index} <${g.name}>` : g.index}:</span>{' '}
                                  {g.value === undefined ? <em className="text-muted-foreground">undefined</em> : `"${g.value}"`}
                                  {g.start !== undefined && <span className="text-muted-foreground"> [{g.start}–{g.end}]</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {matches.length > 200 && <p className="mt-2 text-xs text-muted-foreground">Details limited to the first 200 matches.</p>}
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  )
}
