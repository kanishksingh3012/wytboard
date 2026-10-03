import { TopBar } from './app/TopBar'
import { useTheme } from './app/useTheme'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="dot-grid text-foreground relative h-full w-full font-sans">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex h-full items-center justify-center p-6">
        <p className="text-muted text-sm">The canvas goes here.</p>
      </main>
    </div>
  )
}

export default App
