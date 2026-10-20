import { ArrowLeftRight, Eraser, FileCode2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Examples, Notice, Panel, ToolHeader } from '@/components/ToolLayout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { decodeBase64, encodeBase64 } from './logic'

export function Base64Page() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [urlSafe, setUrlSafe] = useState(false)
  const [input, setInput] = useState('')

  const result = useMemo(() => {
    if (!input) return null
    return mode === 'encode' ? ({ ok: true, output: encodeBase64(input, urlSafe) } as const) : decodeBase64(input)
  }, [input, mode, urlSafe])

  const output = result?.ok ? result.output : ''

  const swap = () => {
    setInput(output)
    setMode((m) => (m === 'encode' ? 'decode' : 'encode'))
  }

  return (
    <div>
      <ToolHeader
        icon={FileCode2}
        title="Base64 Encoder / Decoder"
        description="Encode UTF-8 text to Base64 or decode it back. Conversion happens instantly as you type."
      />
      <Notice kind="warning" title="Base64 is encoding, not encryption" className="mb-4">
        Anyone can decode Base64. Never treat it as a way to protect secrets.
      </Notice>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Direction" className="inline-flex rounded-md border p-0.5">
          <Button size="sm" variant={mode === 'encode' ? 'default' : 'ghost'} aria-pressed={mode === 'encode'} onClick={() => setMode('encode')}>Encode</Button>
          <Button size="sm" variant={mode === 'decode' ? 'default' : 'ghost'} aria-pressed={mode === 'decode'} onClick={() => setMode('decode')}>Decode</Button>
        </div>
        {mode === 'encode' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            URL-safe alphabet (no padding)
          </label>
        )}
      </div>

      <Examples
        items={[
          { label: 'Hello', value: mode === 'encode' ? 'Hello, World!' : 'SGVsbG8sIFdvcmxkIQ==' },
          { label: 'Unicode', value: mode === 'encode' ? 'สวัสดี 🌏 café' : '4Liq4Lin4Lix4Liq4LiU4Li1IPCfjI8gY2Fmw6k=' },
          { label: 'Malformed', value: 'SGVsbG8$' },
        ]}
        onPick={(v) => { setInput(v); if (v === 'SGVsbG8$') setMode('decode') }}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title={mode === 'encode' ? 'Text input' : 'Base64 input'}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={swap} disabled={!output}><ArrowLeftRight className="h-3.5 w-3.5" aria-hidden /> Swap</Button>
              <Button size="sm" variant="ghost" onClick={() => setInput('')}><Eraser className="h-3.5 w-3.5" aria-hidden /> Clear</Button>
            </>
          }
        >
          <Textarea aria-label="Input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === 'encode' ? 'Type or paste text…' : 'Paste Base64…'} />
        </Panel>
        <Panel title={mode === 'encode' ? 'Base64 output' : 'Text output'} actions={<CopyButton value={output} />}>
          {result && !result.ok ? (
            <Notice kind="error" title="Cannot decode">{result.error}</Notice>
          ) : output ? (
            <Textarea aria-label="Output" readOnly value={output} />
          ) : (
            <p className="text-sm text-muted-foreground">{input ? 'Empty result.' : 'Output appears here as you type.'}</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
