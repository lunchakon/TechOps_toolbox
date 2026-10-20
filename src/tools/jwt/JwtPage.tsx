import { Eraser, KeyRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Examples, Notice, Panel, ToolHeader } from '@/components/ToolLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { decodeJwt, summarizeClaims } from './logic'

// Sample token (HS256, fake secret, expired). Contains no real data.
const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiJ1c2VyLTEyMyIsImF1ZCI6WyJhcGkiLCJ3ZWIiXSwiaWF0IjoxNzAwMDAwMDAwLCJuYmYiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMCwibmFtZSI6IkFkYSJ9.c2lnbmF0dXJlLW5vdC12ZXJpZmllZA'

export function JwtPage() {
  // Token lives only in component state: never persisted, never logged, never sent.
  const [token, setToken] = useState('')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const t = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(t)
  }, [])

  const decoded = useMemo(() => (token.trim() ? decodeJwt(token) : null), [token])
  const claims = useMemo(() => (decoded?.ok ? summarizeClaims(decoded.payload, now) : null), [decoded, now])

  const statusBadge = claims && (
    <Badge variant={claims.status === 'valid' ? 'success' : claims.status === 'no-expiry' ? 'secondary' : 'destructive'}>
      {claims.status === 'valid' ? 'Not expired' : claims.status === 'expired' ? 'Expired' : claims.status === 'not-yet-valid' ? 'Not yet valid' : 'No exp claim'}
    </Badge>
  )

  return (
    <div>
      <ToolHeader icon={KeyRound} title="JWT Decoder" description="Decode a JSON Web Token's header and claims entirely in your browser." />
      <Notice kind="warning" title="Decoding is not verification" className="mb-4">
        This tool does <strong>not</strong> verify the signature. A decoded token may be forged or tampered with; never trust its claims without verifying the signature server-side. The token is never sent anywhere, stored or logged, and is cleared when you leave the page.
      </Notice>

      <Examples items={[{ label: 'Sample (expired)', value: SAMPLE }, { label: 'Malformed', value: 'abc.def' }]} onPick={setToken} />

      <div className="mt-4 grid gap-4">
        <Panel title="Encoded token" actions={<Button size="sm" variant="ghost" onClick={() => setToken('')}><Eraser className="h-3.5 w-3.5" aria-hidden /> Clear</Button>}>
          <Textarea aria-label="JWT" value={token} onChange={(e) => setToken(e.target.value)} placeholder="eyJhbGciOi… (a leading “Bearer ” is fine)" className="min-h-[120px] break-all" />
        </Panel>

        {!decoded && <p className="text-sm text-muted-foreground">Paste a token above to inspect its contents.</p>}
        {decoded && !decoded.ok && <Notice kind="error" title="Cannot decode token">{decoded.error}</Notice>}

        {decoded?.ok && claims && (
          <>
            <Panel title="Key claims" actions={statusBadge}>
              {claims.remainingText && (
                <p className="mb-3 text-sm font-medium" aria-live="polite">Token {claims.remainingText}.</p>
              )}
              {claims.status === 'not-yet-valid' && <Notice kind="warning" className="mb-3">The nbf (not before) time is in the future.</Notice>}
              {claims.invalidTimeClaims.length > 0 && <Notice kind="warning" className="mb-3">Claim(s) {claims.invalidTimeClaims.join(', ')} are not valid NumericDate values (seconds since epoch).</Notice>}
              <dl className="grid gap-3 sm:grid-cols-2">
                {(['iss', 'sub'] as const).map((k) => claims[k] !== undefined && (
                  <div key={k} className="rounded-md border p-3"><dt className="text-xs font-medium text-muted-foreground">{k} {k === 'iss' ? '(issuer)' : '(subject)'}</dt><dd className="mt-1 break-all font-mono text-sm">{claims[k]}</dd></div>
                ))}
                {claims.aud && <div className="rounded-md border p-3"><dt className="text-xs font-medium text-muted-foreground">aud (audience)</dt><dd className="mt-1 break-all font-mono text-sm">{claims.aud.join(', ')}</dd></div>}
                {claims.times.map((t) => (
                  <div key={t.name} className="rounded-md border p-3">
                    <dt className="text-xs font-medium text-muted-foreground">{t.name} ({t.label.toLowerCase()})</dt>
                    <dd className="mt-1 font-mono text-sm">{t.iso}<span className="block text-xs text-muted-foreground">{t.seconds} · local {new Date(t.seconds * 1000).toLocaleString()}</span></dd>
                  </div>
                ))}
              </dl>
              {claims.iss === undefined && claims.sub === undefined && !claims.aud && claims.times.length === 0 && <p className="text-sm text-muted-foreground">No registered claims (iss, sub, aud, iat, exp, nbf) present.</p>}
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Header" actions={<CopyButton value={JSON.stringify(decoded.header, null, 2)} />}>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-all rounded-md border bg-background p-3 font-mono text-sm">{JSON.stringify(decoded.header, null, 2)}</pre>
              </Panel>
              <Panel title="Payload" actions={<CopyButton value={JSON.stringify(decoded.payload, null, 2)} />}>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-all rounded-md border bg-background p-3 font-mono text-sm">{JSON.stringify(decoded.payload, null, 2)}</pre>
              </Panel>
            </div>
            <Panel title="Signature (not verified)">
              <p className="break-all font-mono text-xs text-muted-foreground">{decoded.signature || '(empty: unsecured token)'}</p>
              {decoded.header.alg === 'none' && <Notice kind="error" className="mt-3">alg is "none": this token is unsigned and must never be accepted as authentication.</Notice>}
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}
