import { ArrowLeftRight, Eraser, Link2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Examples, Notice, Panel, ToolHeader } from '@/components/ToolLayout'
import { Button } from '@/components/ui/button'
import { Select, Textarea } from '@/components/ui/textarea'
import { decodeUrl, encodeUrl, parseQuery, type UrlMode } from './logic'

const MODE_HELP: Record<UrlMode, string> = {
  component: 'encodeURIComponent: escapes everything except A-Z a-z 0-9 - _ . ! ~ * \' ( ). Use for a single path segment or query value.',
  full: 'encodeURI: keeps URL structure characters (: / ? # & = @) intact. Use for a whole URL that may contain spaces or non-ASCII.',
  form: 'application/x-www-form-urlencoded: like component, but space becomes "+". Used by HTML forms and many query strings.',
}

export function UrlPage() {
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode')
  const [mode, setMode] = useState<UrlMode>('component')
  const [input, setInput] = useState('')

  const result = useMemo(() => {
    if (!input) return null
    return direction === 'encode' ? encodeUrl(input, mode) : decodeUrl(input, mode)
  }, [input, direction, mode])
  const output = result?.ok ? result.output : ''
  const params = useMemo(() => (direction === 'decode' && input.includes('=') ? parseQuery(input) : null), [direction, input])

  const swap = () => {
    setInput(output)
    setDirection((d) => (d === 'encode' ? 'decode' : 'encode'))
  }

  return (
    <div>
      <ToolHeader icon={Link2} title="URL Encoder / Decoder" description="Percent-encode and decode URL components, whole URLs and form-style query values." />

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Direction" className="inline-flex rounded-md border p-0.5">
          <Button size="sm" variant={direction === 'encode' ? 'default' : 'ghost'} aria-pressed={direction === 'encode'} onClick={() => setDirection('encode')}>Encode</Button>
          <Button size="sm" variant={direction === 'decode' ? 'default' : 'ghost'} aria-pressed={direction === 'decode'} onClick={() => setDirection('decode')}>Decode</Button>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Mode
          <Select value={mode} onChange={(e) => setMode(e.target.value as UrlMode)} className="text-foreground">
            <option value="component">Component (encodeURIComponent)</option>
            <option value="full">Full URL (encodeURI)</option>
            <option value="form">Form / query (+ for space)</option>
          </Select>
        </label>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{MODE_HELP[mode]}</p>

      <Examples
        items={[
          { label: 'Query value', value: 'name=Ada Lovelace & co/ünï' },
          { label: 'Encoded', value: 'name%3DAda%20Lovelace%20%26%20co%2F%C3%BCn%C3%AF' },
          { label: 'Malformed', value: '100%25 sure, 50% off' },
          { label: 'Full URL', value: 'https://example.com/search?q=hello world&lang=th' },
        ]}
        onPick={(v) => { setInput(v); setDirection(v.includes('%') ? 'decode' : 'encode') }}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Input"
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={swap} disabled={!output}><ArrowLeftRight className="h-3.5 w-3.5" aria-hidden /> Swap</Button>
              <Button size="sm" variant="ghost" onClick={() => setInput('')}><Eraser className="h-3.5 w-3.5" aria-hidden /> Clear</Button>
            </>
          }
        >
          <Textarea aria-label="Input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type or paste text…" />
        </Panel>
        <Panel title="Output" actions={<CopyButton value={output} />}>
          {result && !result.ok ? (
            <Notice kind="error" title="Cannot process">{result.error}</Notice>
          ) : output ? (
            <Textarea aria-label="Output" readOnly value={output} />
          ) : (
            <p className="text-sm text-muted-foreground">Output appears here as you type.</p>
          )}
        </Panel>
      </div>

      {params?.ok && params.params.length > 0 && (
        <div className="mt-4">
          <Panel title="Decoded query parameters">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-1 pr-3 font-medium">Key</th><th scope="col" className="py-1 font-medium">Value</th></tr></thead>
              <tbody>
                {params.params.map((p, i) => (
                  <tr key={i} className="border-t"><td className="py-1.5 pr-3 font-mono">{p.key}</td><td className="break-all py-1.5 font-mono">{p.value}</td></tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
    </div>
  )
}
