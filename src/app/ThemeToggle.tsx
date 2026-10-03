import { Button, Tooltip } from '@heroui/react'
import { Moon, Sun } from 'lucide-react'
import type { Theme } from './useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <div className="bg-surface shadow-float flex h-9 items-center rounded-xl">
      <Tooltip delay={400}>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={`Switch to ${nextTheme} theme`}
          onPress={onToggle}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Tooltip.Content>Switch to {nextTheme} theme</Tooltip.Content>
      </Tooltip>
    </div>
  )
}
