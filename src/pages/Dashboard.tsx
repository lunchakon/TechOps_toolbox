import { ArrowRight, ExternalLink, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Notice } from '@/components/ToolLayout'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomTools } from '@/hooks/use-custom-tools'
import { TOOLS } from '@/lib/tools'

export function Dashboard() {
  const { sections, warnings } = useCustomTools()
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">TechOps Toolbox</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Everyday utilities for technical support, engineering and DevOps troubleshooting.
      </p>
      <p className="mt-3 inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm">
        <Lock className="h-4 w-4 text-success" aria-hidden />
        Nothing you enter is sent anywhere. All tools run locally in your browser.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((t) => (
          <li key={t.id}>
            <Link
              to={t.path}
              className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors group-hover:border-primary/60 group-hover:bg-accent/30">
                <CardHeader>
                  <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <t.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <CardTitle className="flex items-center justify-between">
                    {t.title}
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {warnings.length > 0 && (
        <Notice kind="warning" title="Some custom tool entries were ignored" className="mt-8">
          <ul className="list-disc space-y-0.5 pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs">Fix <code className="font-mono">config/custom-tools.json</code> and reload the page.</p>
        </Notice>
      )}

      {sections.map((s) => (
        <section key={s.title} className="mt-10" aria-label={s.title}>
          <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">External applications. These open in a new tab and are not part of the toolbox.</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {s.tools.map((t) => (
              <li key={t.url + t.name}>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full transition-colors group-hover:border-primary/60 group-hover:bg-accent/30">
                    <CardHeader>
                      <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <t.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <CardTitle className="flex items-center justify-between">
                        {t.name}
                        <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden />
                        <span className="sr-only">(opens in new tab)</span>
                      </CardTitle>
                      {t.description && <CardDescription>{t.description}</CardDescription>}
                      <p className="truncate font-mono text-xs text-muted-foreground">{t.host}</p>
                    </CardHeader>
                  </Card>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
