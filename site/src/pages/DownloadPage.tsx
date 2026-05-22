import { Link } from 'react-router-dom'
import CliInstall from '../components/CliInstall'

const cliInstalls = [
  {
    title: 'pipx (recommended)',
    body: 'Isolated Python install, exposes the `benchloop` and `bench-loop` commands on PATH. The PyPI distribution is named `benchloop-cli`.',
    code: 'pipx install benchloop-cli',
  },
  {
    title: 'pip',
    body: 'For environments that already have a Python venv.',
    code: 'pip install benchloop-cli',
  },
  {
    title: 'From source',
    body: 'Clone the repo and install in editable mode — best if you want to hack on suites.',
    code: 'git clone https://github.com/cPilot-GUI/Local-Inference-Stack-Benchmark\ncd Local-Inference-Stack-Benchmark/cli\npip install -e .',
  },
]

const cloneInstalls = [
  {
    title: '1. Install the CLI',
    body: 'Dashboard is bundled into the wheel — no separate clone needed.',
    code: 'pipx install benchloop-cli',
  },
  {
    title: '2. Launch the dashboard',
    body: 'Single command. API + UI on one port. Browser opens automatically.',
    code: 'benchloop dashboard',
  },
  {
    title: '3. (Optional) Dev mode',
    body: 'For hot-reload while hacking on the public UI, run the Vite site from this repository.',
    code: 'git clone https://github.com/cPilot-GUI/Local-Inference-Stack-Benchmark\ncd Local-Inference-Stack-Benchmark/site\nnpm install\nnpm run dev',
  },
]

export default function DownloadPage() {
  return (
    <div>
      <div className="page-kicker">Download</div>
      <h1>Install the benchmark.</h1>
      <p className="page-subtitle">
        The stack benchmark ships as a CLI plus a React public site for visualization. Pick whichever fits.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>Quickstart</h2>
        <p className="page-subtitle">One pipx command, then run a benchmark.</p>
        <div style={{ marginTop: 16 }}>
          <CliInstall />
        </div>
      </section>

      <section style={{ marginTop: 48 }}>
        <h2>CLI install methods</h2>
        <div className="download-grid">
          {cliInstalls.map((m) => (
            <div className="download-card" key={m.title}>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
              <pre>{m.code}</pre>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 48 }}>
        <h2>Run the full stack locally</h2>
        <p className="page-subtitle">
          The CLI is enough on its own. If you also want to work on the public leaderboard UI, run
          the Vite site locally from the same repository.
        </p>
        <div className="download-grid">
          {cloneInstalls.map((m) => (
            <div className="download-card" key={m.title}>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
              <pre>{m.code}</pre>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 14, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          After <code>npm run dev</code>: open <a href="http://127.0.0.1:5181" target="_blank" rel="noreferrer">http://127.0.0.1:5181</a>.
        </p>
      </section>

      <section style={{ marginTop: 48 }}>
        <h2>Source code</h2>
        <div className="download-grid">
          <div className="download-card">
            <h3>CLI &amp; suites</h3>
            <p>Python package with all benchmark suites, harnesses, scorers, and the orchestrator.</p>
            <pre>{`github.com/cPilot-GUI/Local-Inference-Stack-Benchmark`}</pre>
          </div>
          <div className="download-card">
            <h3>Web dashboard</h3>
            <p>React/Vite public leaderboard site with static seed data and optional hosted API support.</p>
            <pre>{`Local-Inference-Stack-Benchmark/site`}</pre>
          </div>
          <div className="download-card">
            <h3>PyPI package</h3>
            <p>Published as <code>benchloop-cli</code>. License MIT.</p>
            <pre>{`pypi.org/project/benchloop-cli`}</pre>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 48 }}>
        <h2>What you get</h2>
        <div className="feature-grid">
          <div className="feature-card card">
            <div className="feature-icon">⌘</div>
            <h3><code>benchloop</code> CLI</h3>
            <p>Single-command benchmark runner with JSON output, persisted runs, and scriptable defaults.</p>
          </div>
          <div className="feature-card card">
            <div className="feature-icon">▦</div>
            <h3>Local web app</h3>
            <p>Models, Benchmark, Leaderboard, Compare, and Chat tabs running on <code>127.0.0.1:5180</code>.</p>
          </div>
          <div className="feature-card card">
            <div className="feature-icon">↗</div>
            <h3>Auto-publish</h3>
            <p>Completed benchmark runs can publish aggregate data to a public leaderboard API. Opt out with <code>BENCHLOOP_NO_SUBMIT=1</code>.</p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 48, marginBottom: 16 }}>
        <h2>Next steps</h2>
        <p className="page-subtitle">
          New to the benchmark? Run a fast smoke test, then read the docs to understand scoring and suites.
        </p>
        <div className="landing-actions" style={{ marginTop: 16 }}>
          <Link to="/docs" className="btn btn-primary">Read the docs</Link>
          <Link to="/leaderboard" className="btn btn-secondary">See published runs</Link>
        </div>
      </section>
    </div>
  )
}
