import { ThemeToggle } from './app/ThemeToggle'
import { useTheme } from './app/useTheme'
import { Board } from './canvas/Board'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="text-foreground h-full w-full font-sans">
      <Board theme={theme} topRight={<ThemeToggle theme={theme} onToggle={toggleTheme} />} />
    </div>
  )
}

export default App
