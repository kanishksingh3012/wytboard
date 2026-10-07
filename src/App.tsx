import { HashRouter, Route, Routes } from 'react-router'
import { FeedbackButton } from './feedback/FeedbackButton'
import { BoardPage } from './pages/BoardPage'
import { Home } from './pages/Home'
import { LearnPage } from './pages/LearnPage'
import { SharedPage } from './pages/SharedPage'
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
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/shared/:data" element={<SharedPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <FeedbackButton />
      </div>
    </HashRouter>
  )
}

export default App
