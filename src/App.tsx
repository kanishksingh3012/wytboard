import { HashRouter, Route, Routes } from 'react-router'
import { BoardPage } from './pages/BoardPage'
import { Home } from './pages/Home'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    // Hash routing keeps deep links working on static hosts with no server rewrites.
    <HashRouter>
      <div className="text-foreground h-full w-full font-sans">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/board/:id" element={<BoardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </HashRouter>
  )
}

export default App
