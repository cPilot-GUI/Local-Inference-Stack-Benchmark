import { Link } from 'react-router-dom'
import { useLeaderboard } from '../hooks/useLeaderboard'
import {
  canItRunLabel,
  contextLabel,
  engineLabel,
  isStackRun,
  lowMemoryFrontierScore,
  machineLabel,
  modelDensityLabel,
  quantLabel,
} from '../lib/leaderboard'

export default function LandingPage() {
  const { runs } = useLeaderboard()
  const stackRuns = runs.filter(isStackRun)
  const leaders = stackRuns.slice().sort((a, b) => b.overall_score - a.overall_score).slice(0, 5)
  const fastest = stackRuns.slice().sort((a, b) => b.generation_tok_per_sec - a.generation_tok_per_sec)[0]
  const memoryBest = stackRuns.slice().sort((a, b) => (b.memory_score || 0) - (a.memory_score || 0))[0]
  const frontierBest = stackRuns.slice().sort((a, b) => lowMemoryFrontierScore(b) - lowMemoryFrontierScore(a))[0]
  const stableBest = stackRuns.slice().sort((a, b) => (b.stability_success_rate || 0) - (a.stability_success_rate || 0))[0]

  return (
    <div className="home-stack">
      <section className="leaderboard-hero home-hero">
        <div>
          <h1>Find the best way to run open models locally.</h1>
          <p>
            Local Inference Stack Benchmark ranks the full local setup: model, quantization,
            engine, hardware, OS, context length, and runtime config. The goal is practical:
            help every device find the largest useful model it can run.
          </p>
          <div className="hero-actions">
            <Link to="/leaderboard" className="btn btn-primary btn-lg">View stack leaderboard</Link>
            <Link to="/submit" className="btn btn-secondary btn-lg">Run locally</Link>
          </div>
        </div>
        <div className="stack-summary-panel">
          <div className="metric-label">Ranking tuple</div>
          <strong>Model × Quant × Engine × Hardware</strong>
          <span>Speed, memory, stability, quality retention, and low-memory frontier metrics stay visible for every run.</span>
          <div className="formula-grid">
            <span>35% Speed</span>
            <span>30% Memory</span>
            <span>20% Stability</span>
            <span>15% Quality</span>
          </div>
        </div>
      </section>

      <div className="metric-grid metric-grid-tight">
        <Highlight title="Fastest usable" run={fastest} metric={fastest ? `${fastest.generation_tok_per_sec.toFixed(1)} tok/s` : '—'} />
        <Highlight title="Most memory efficient" run={memoryBest} metric={memoryBest ? `${(memoryBest.memory_score || 0).toFixed(1)} memory` : '—'} />
        <Highlight title="Low-memory frontier" run={frontierBest} metric={frontierBest ? modelDensityLabel(frontierBest) : '—'} />
        <Highlight title="Most stable" run={stableBest} metric={stableBest ? `${(stableBest.stability_success_rate || stableBest.reliability_score).toFixed(0)}% stable` : '—'} />
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Local Inference Stack Leaderboard</h2>
          <Link to="/leaderboard" className="btn btn-secondary">See all</Link>
        </div>
        <div className="card lb-card stack-table-card">
          <table className="lb-table stack-table compact">
            <thead>
              <tr>
                <th>#</th>
                <th>Model</th>
                <th>Quant</th>
                <th>Engine</th>
                <th>Hardware</th>
                <th>Can it run?</th>
                <th style={{ textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {(leaders.length ? leaders : []).map((run, index) => (
                <tr key={run.id}>
                  <td className="lb-score">{index + 1}</td>
                  <td>
                    <strong>{run.model}</strong>
                    <div className="stack-subline">{contextLabel(run)}</div>
                  </td>
                  <td>{quantLabel(run)}</td>
                  <td>{engineLabel(run)}</td>
                  <td>{machineLabel(run)}</td>
                  <td><span className="run-label good">{canItRunLabel(run)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="lb-score green">{run.overall_score.toFixed(1)}</span></td>
                </tr>
              ))}
              {!leaders.length && (
                <tr>
                  <td colSpan={7} className="empty-cell">Official seed data has not loaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack-bands">
        <InfoBand title="Full-stack, not model-only" body="The same model can feel completely different across quantization, engine, hardware, OS, context length, and launch flags." />
        <InfoBand title="Low-memory runs matter" body="The board exposes peak RAM, peak VRAM, OOM rate, and model-density-per-GB so large-model-on-small-hardware wins are visible." />
        <InfoBand title="Built for setup decisions" body="Filter for 16GB devices, CPU-only machines, small VRAM GPUs, 30B+ local setups, and Chinese local models." />
      </section>
    </div>
  )
}

function Highlight({ title, run, metric }: { title: string; run: ReturnType<typeof useLeaderboard>['runs'][number] | undefined; metric: string }) {
  return (
    <div className="metric-card highlight-card">
      <div className="metric-label">{title}</div>
      <div className="metric-value">{metric}</div>
      <p>{run ? `${run.model} · ${engineLabel(run)} · ${machineLabel(run)}` : 'Waiting for a matching stack run.'}</p>
    </div>
  )
}

function InfoBand({ title, body }: { title: string; body: string }) {
  return (
    <div className="info-band">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}
