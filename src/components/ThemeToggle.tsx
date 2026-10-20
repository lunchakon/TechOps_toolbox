import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Theme } from '@/hooks/use-theme'

const order: Theme[] = ['light', 'dark', 'system']
const icons = { light: Sun, dark: Moon, system: Monitor }

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const next = order[(order.indexOf(theme) + 1) % order.length]
  const Icon = icons[theme]
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onChange(next)}
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  )
}
