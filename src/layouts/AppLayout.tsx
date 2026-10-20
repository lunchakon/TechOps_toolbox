import { ExternalLink, LayoutDashboard, Menu, ShieldCheck, Terminal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useCustomTools } from '@/hooks/use-custom-tools'
import { useTheme } from '@/hooks/use-theme'
import { TOOLS } from '@/lib/tools'
import { cn } from '@/lib/utils'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { sections } = useCustomTools()
  return (
    <nav aria-label="Tools" className="flex flex-col gap-1">
      <NavLink to="/" end className={linkClass} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4" aria-hidden /> Dashboard
      </NavLink>
      <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools</p>
      {TOOLS.map((t) => (
        <NavLink key={t.id} to={t.path} className={linkClass} onClick={onNavigate}>
          <t.icon className="h-4 w-4" aria-hidden /> {t.short}
        </NavLink>
      ))}
      {sections.map((s) => (
        <div key={s.title} className="flex flex-col gap-1">
          <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.title}</p>
          {s.tools.map((t) => (
            <a
              key={t.url + t.name}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
              className={linkClass({ isActive: false })}
            >
              <t.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{t.name}</span>
              <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-60" aria-hidden />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          ))}
        </div>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Terminal className="h-4 w-4" aria-hidden />
      </span>
      TechOps Toolbox
    </NavLink>
  )
}

export function AppLayout() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="min-h-screen md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
        </div>
        <NavList />
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Runs in your browser
          </span>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-2.5 backdrop-blur md:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            <ThemeToggle theme={theme} onChange={setTheme} />
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </Button>
          </div>
        </header>
        {open && (
          <div id="mobile-nav" className="border-b bg-card p-3 md:hidden">
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        )}

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
          All processing happens locally in your browser. Avoid pasting production secrets on shared or untrusted devices.
        </footer>
      </div>
    </div>
  )
}
