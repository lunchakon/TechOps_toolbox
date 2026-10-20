import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ToolHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
      {children}
    </header>
  )
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const noticeStyles = {
  info: { icon: Info, cls: 'border-border bg-muted/50 text-foreground' },
  success: { icon: CheckCircle2, cls: 'border-success/40 bg-success/10 text-success' },
  warning: { icon: AlertTriangle, cls: 'border-warning/40 bg-warning/10 text-warning' },
  error: { icon: AlertTriangle, cls: 'border-destructive/40 bg-destructive/10 text-destructive' },
} as const

export function Notice({
  kind = 'info',
  title,
  children,
  className,
}: {
  kind?: keyof typeof noticeStyles
  title?: string
  children?: ReactNode
  className?: string
}) {
  const { icon: Icon, cls } = noticeStyles[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border px-3 py-2.5 text-sm', cls, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'break-words')}>{children}</div>}
      </div>
    </div>
  )
}

export function Examples({ items, onPick }: { items: { label: string; value: string }[]; onPick: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Examples">
      <span className="text-xs font-medium text-muted-foreground">Examples:</span>
      {items.map((ex) => (
        <button
          key={ex.label}
          type="button"
          onClick={() => onPick(ex.value)}
          className="rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ex.label}
        </button>
      ))}
    </div>
  )
}
