import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const MAX_DEPTH_OPEN = 2

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="text-muted-foreground">null</span>
  if (typeof value === 'string') return <span className="break-all text-success">"{value}"</span>
  if (typeof value === 'number') return <span className="text-warning">{String(value)}</span>
  return <span className="text-primary">{String(value)}</span>
}

function Node({ name, value, depth }: { name?: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < MAX_DEPTH_OPEN)
  const isArr = Array.isArray(value)
  const isObj = value !== null && typeof value === 'object'
  const label = name !== undefined ? <span className="text-foreground">{name}: </span> : null

  if (!isObj) {
    return (
      <div className="pl-5">
        {label}
        <Primitive value={value} />
      </div>
    )
  }
  const entries = isArr ? (value as unknown[]).map((v, i) => [String(i), v] as const) : Object.entries(value as object)
  return (
    <div className="pl-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="-ml-5 inline-flex items-center gap-1 rounded text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
        {label}
        <span className="text-muted-foreground">{isArr ? `[${entries.length}]` : `{${entries.length}}`}</span>
      </button>
      {open && entries.map(([k, v]) => <Node key={k} name={k} value={v} depth={depth + 1} />)}
    </div>
  )
}

/** Renders parsed JSON as plain React text nodes (never as HTML). */
export function JsonTree({ value }: { value: unknown }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-md border bg-background p-3 font-mono text-sm" role="tree" aria-label="JSON tree">
      <Node value={value} depth={0} />
    </div>
  )
}
