import { Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DocsPage from './pages/DocsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import DownloadPage from './pages/DownloadPage'
import EnginesPage from './pages/EnginesPage'
import HardwarePage from './pages/HardwarePage'
import MethodologyPage from './pages/MethodologyPage'
import ModelPage from './pages/ModelPage'
import SubmitPage from './pages/SubmitPage'
import LoopLogo from './components/LoopLogo'

export default function App() {
  const navigate = useNavigate()

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/engines', label: 'Engines' },
    { to: '/methodology', label: 'Methodology' },
    { to: '/submit', label: 'Submit' },
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <LoopLogo size={32} />
            <span className="logo-text">Local Stack Bench</span>
          </div>
          <nav className="nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <a
              href="https://github.com/cPilot-GUI/Local-Inference-Stack-Benchmark"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              GitHub ↗
            </a>
            <Link to="/submit" className="btn btn-primary">
              Run locally
            </Link>
          </div>
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/engines" element={<EnginesPage />} />
          <Route path="/models/:model" element={<ModelPage />} />
          <Route path="/hardware/:hardware" element={<HardwarePage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/download" element={<DownloadPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <LoopLogo size={22} />
            <strong>Local Inference Stack Benchmark</strong>
            <span>© 2026 cPilot-GUI</span>
          </div>
          <div className="site-footer-links">
            <a href="https://github.com/cPilot-GUI/Local-Inference-Stack-Benchmark" target="_blank" rel="noreferrer">GitHub</a>
            <Link to="/methodology">Methodology</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <Link to="/submit">Submit</Link>
            <a href="https://github.com/cPilot-GUI/Local-Inference-Stack-Benchmark/issues" target="_blank" rel="noreferrer">Issues</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
