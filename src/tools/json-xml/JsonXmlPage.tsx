import { Braces, Eraser, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Examples, Notice, Panel, ToolHeader } from '@/components/ToolLayout'
import { Button } from '@/components/ui/button'
import { Select, Textarea } from '@/components/ui/textarea'
import { detectFormat, formatJson, formatXml, minifyJson, minifyXml, parseJsonValue, validateJson, validateXml, type FormatResult } from './logic'
import { JsonTree } from './JsonTree'

type Mode = 'json' | 'xml'
type Action = 'format' | 'minify' | 'validate'

const EXAMPLES = [
  { label: 'JSON object', value: '{"name":"Ada","roles":["admin","dev"],"active":true,"profile":{"age":36,"email":null}}' },
  { label: 'Invalid JSON', value: '{"name": "Ada", "roles": [1, 2,]}' },
  { label: 'XML document', value: '<?xml version="1.0"?><order id="42"><item sku="A1">Widget</item><item sku="B2">Gadget</item></order>' },
  { label: 'Invalid XML', value: '<order><item></order>' },
]

export function JsonXmlPage() {
  const [mode, setMode] = useState<Mode>('json')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<FormatResult | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [indent, setIndent] = useState('2')
  const [showTree, setShowTree] = useState(false)

  const run = (a: Action, m: Mode = mode) => {
    setAction(a)
    const ind = indent === 'tab' ? '\t' : ' '.repeat(Number(indent))
    if (m === 'json') {
      setResult(a === 'format' ? formatJson(input, indent === 'tab' ? '\t' : Number(indent)) : a === 'minify' ? minifyJson(input) : validateJson(input))
    } else {
      setResult(a === 'format' ? formatXml(input, ind) : a === 'minify' ? minifyXml(input) : validateXml(input))
    }
  }

  const reset = () => {
    setInput('')
    setResult(null)
    setAction(null)
  }

  const tree = useMemo(() => {
    if (!showTree || mode !== 'json' || !input.trim()) return null
    const r = parseJsonValue(input)
    return r.ok ? r.value : null
  }, [showTree, mode, input])

  const output = result?.ok && action !== 'validate' ? result.output : ''

  return (
    <div>
      <ToolHeader
        icon={Braces}
        title="JSON / XML Formatter & Validator"
        description="Paste JSON or XML, then format, minify or validate it. Syntax errors report line and column where the parser provides them."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Language" className="inline-flex rounded-md border p-0.5">
          {(['json', 'xml'] as const).map((m) => (
            <Button key={m} size="sm" variant={mode === m ? 'default' : 'ghost'} aria-pressed={mode === m} onClick={() => { setMode(m); setResult(null) }}>
              {m.toUpperCase()}
            </Button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Indent
          <Select value={indent} onChange={(e) => setIndent(e.target.value)} className="text-foreground">
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </Select>
        </label>
        {mode === 'json' && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={showTree} onChange={(e) => setShowTree(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Tree viewer
          </label>
        )}
      </div>

      <Examples
        items={EXAMPLES}
        onPick={(v) => {
          const m = detectFormat(v)
          setMode(m)
          setInput(v)
          setResult(null)
        }}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Input"
          actions={
            <>
              <Button size="sm" onClick={() => run('format')}>Format</Button>
              <Button size="sm" variant="secondary" onClick={() => run('minify')}>Minify</Button>
              <Button size="sm" variant="secondary" onClick={() => run('validate')}>Validate</Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput(''); setResult(null) }} aria-label="Clear input">
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} aria-label="Reset tool">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
              </Button>
            </>
          }
        >
          <Textarea
            aria-label="Input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'json' ? '{"paste": "JSON here"}' : '<paste>XML here</paste>'}
          />
        </Panel>

        <Panel title="Output" actions={<CopyButton value={output} />}>
          {result && !result.ok ? (
            <Notice kind="error" title="Invalid input">
              <p>{result.error.message}</p>
              {result.error.line !== undefined && (
                <p className="mt-1 font-mono text-xs">Line {result.error.line}{result.error.column !== undefined && `, column ${result.error.column}`}</p>
              )}
            </Notice>
          ) : result?.ok && action === 'validate' ? (
            <Notice kind="success" title={result.output} />
          ) : output ? (
            <Textarea aria-label="Output" readOnly value={output} />
          ) : (
            <p className="text-sm text-muted-foreground">Output appears here. Pick an example above or paste your own data, then press Format, Minify or Validate.</p>
          )}
        </Panel>
      </div>

      {tree !== null && (
        <div className="mt-4">
          <Panel title="Tree viewer">
            <JsonTree value={tree} />
          </Panel>
        </div>
      )}
    </div>
  )
}
