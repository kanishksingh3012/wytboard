import { Button, Tooltip } from '@heroui/react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from './useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <Tooltip delay={400}>
      <Button
        isIconOnly
        variant="ghost"
        aria-label={`Switch to ${nextTheme} theme`}
        onPress={toggleTheme}
      >
        {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </Button>
      <Tooltip.Content>Switch to {nextTheme} theme</Tooltip.Content>
    </Tooltip>
  )
}
