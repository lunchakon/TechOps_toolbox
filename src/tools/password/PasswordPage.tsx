import { Dices, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Notice, Panel, ToolHeader } from '@/components/ToolLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/textarea'
import { DEFAULT_OPTIONS, entropyBits, generateMany, MAX_LENGTH, MIN_LENGTH, strengthOf, validateOptions, type PasswordOptions } from './logic'

const TYPES: { key: 'lower' | 'upper' | 'digits' | 'symbols'; label: string; sample: string }[] = [
  { key: 'upper', label: 'Uppercase', sample: 'A-Z' },
  { key: 'lower', label: 'Lowercase', sample: 'a-z' },
  { key: 'digits', label: 'Digits', sample: '0-9' },
  { key: 'symbols', label: 'Symbols', sample: '!@#$…' },
]

export function PasswordPage() {
  // Options only. Generated passwords live in memory, are never stored, logged or sent anywhere.
  const [opts, setOpts] = useState<PasswordOptions>(DEFAULT_OPTIONS)
  const [count, setCount] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [draft, setDraft] = useState<string | null>(null) // raw text while typing in the length box

  const error = validateOptions(opts)
  // `nonce` forces a fresh draw when the user presses Generate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => generateMany(opts, count), [opts, count, nonce])
  const bits = entropyBits(opts)
  const strength = strengthOf(bits)

  const set = (patch: Partial<PasswordOptions>) => setOpts((o) => ({ ...o, ...patch }))
  const setLength = (n: number) => set({ length: Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.round(n) || MIN_LENGTH)) })

  return (
    <div>
      <ToolHeader
        icon={Dices}
        title="Password Generator"
        description="Create random passwords with your browser's cryptographically secure random number generator. Nothing is stored, logged or sent anywhere."
      />

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Panel title="Options">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="pw-length" className="text-sm font-medium">Length</label>
                <Input
                  type="number"
                  aria-label="Length (number)"
                  min={MIN_LENGTH}
                  max={MAX_LENGTH}
                  value={draft ?? opts.length}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    if (e.target.value.trim() !== '' && Number.isFinite(Number(e.target.value))) setLength(Number(e.target.value))
                  }}
                  onBlur={() => setDraft(null)}
                  className="h-8 w-20 text-right"
                />
              </div>
              <input
                id="pw-length"
                type="range"
                min={MIN_LENGTH}
                max={MAX_LENGTH}
                value={opts.length}
                onChange={(e) => {
                  setDraft(null)
                  setLength(Number(e.target.value))
                }}
                className="mt-2 w-full accent-[hsl(var(--primary))]"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Characters</legend>
              <div className="space-y-2">
                {TYPES.map((t) => (
                  <label key={t.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={opts[t.key]} onChange={(e) => set({ [t.key]: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                    {t.label} <span className="font-mono text-xs text-muted-foreground">{t.sample}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={opts.excludeAmbiguous} onChange={(e) => set({ excludeAmbiguous: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                  Avoid look-alikes <span className="font-mono text-xs text-muted-foreground">I l 1 | O 0 o</span>
                </label>
              </div>
            </fieldset>

            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              How many
              <Select value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="How many passwords">
                {[1, 5, 10, 20].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </label>
          </div>
        </Panel>

        <Panel
          title={count === 1 ? 'Password' : 'Passwords'}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => setHidden((h) => !h)} aria-pressed={hidden}>
                {hidden ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                {hidden ? 'Show' : 'Hide'}
              </Button>
              <Button size="sm" onClick={() => setNonce((n) => n + 1)} disabled={!!error}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Generate
              </Button>
            </>
          }
        >
          {error || !result.ok ? (
            <Notice kind="error" title="Cannot generate">{error ?? (result.ok ? '' : result.error)}</Notice>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={strength === 'Weak' ? 'destructive' : strength === 'Fair' ? 'warning' : 'success'}>{strength}</Badge>
                <span className="text-muted-foreground">≈ {bits} bits of entropy</span>
              </div>
              <ul className="space-y-2" aria-label="Generated passwords">
                {result.passwords.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                    <code className="min-w-0 break-all font-mono text-base" data-testid="password">
                      {hidden ? '•'.repeat(p.length) : p}
                    </code>
                    <CopyButton value={p} />
                  </li>
                ))}
              </ul>
            </>
          )}
          <Notice kind="info" className="mt-4">
            Passwords are drawn uniformly with <code className="font-mono">crypto.getRandomValues</code> and always include at least one character of each selected type.
            Use a password manager to store them, and avoid generating real credentials on shared or untrusted devices.
          </Notice>
        </Panel>
      </div>
    </div>
  )
}
