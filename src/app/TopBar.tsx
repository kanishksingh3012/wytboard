import { Button, Tooltip } from '@heroui/react'
import { Moon, Sun } from 'lucide-react'
import type { Theme } from './useTheme'

interface TopBarProps {
  theme: Theme
  onToggleTheme: () => void
}

export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3 sm:p-4">
      <div className="bg-surface shadow-float pointer-events-auto flex h-11 items-center gap-2.5 rounded-2xl pr-4 pl-2.5">
        <img src="/favicon.svg" alt="" className="size-6" />
        <span className="text-foreground text-sm font-semibold tracking-tight">Wytboard</span>
      </div>

      <div className="bg-surface shadow-float pointer-events-auto flex h-11 items-center rounded-2xl px-1">
        <Tooltip delay={400}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={`Switch to ${nextTheme} theme`}
            onPress={onToggleTheme}
          >
            {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </Button>
          <Tooltip.Content>Switch to {nextTheme} theme</Tooltip.Content>
        </Tooltip>
      </div>
    </header>
  )
}
