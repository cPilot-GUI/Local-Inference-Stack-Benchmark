import { useParams } from 'react-router-dom'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { contextLabel, engineLabel, isStackRun, machineLabel, quantLabel } from '../lib/leaderboard'

export default function HardwarePage() {
  const { hardware = '' } = useParams()
  const label = decodeURIComponent(hardware)
  const { runs } = useLeaderboard()
  const hardwareRuns = runs
    .filter((run) => isStackRun(run) && machineLabel(run) === label)
    .sort((a, b) => b.overall_score - a.overall_score)
  const fastest = hardwareRuns.slice().sort((a, b) => b.generation_tok_per_sec - a.generation_tok_per_sec)[0]
  const largest = hardwareRuns.slice().sort((a, b) => sizeScore(b.model) - sizeScore(a.model))[0]
  const stable = hardwareRuns.slice().sort((a, b) => (b.stability_success_rate || 0) - (a.stability_success_rate || 0))[0]

  return (
    <div className="narrow-page">
      <h1>{label}</h1>
      <p className="page-subtitle">What this machine can run locally, ranked by practical stack usability.</p>
      <div className="metric-grid metric-grid-tight">
        <Pick title="Fastest setup" run={fastest} />
        <Pick title="Largest usable model" run={largest} />
        <Pick title="Most stable setup" run={stable} />
      </div>
      <div className="card lb-card">
        <table className="lb-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Engine</th>
              <th>Quant</th>
              <th>Context</th>
              <th style={{ textAlign: 'right' }}>Score</th>
              <th style={{ textAlign: 'right' }}>TTFT</th>
              <th style={{ textAlign: 'right' }}>tok/s</th>
              <th style={{ textAlign: 'right' }}>Peak RAM</th>
            </tr>
          </thead>
          <tbody>
            {hardwareRuns.map((run) => (
              <tr key={run.id}>
                <td><strong>{run.model}</strong></td>
                <td>{engineLabel(run)}</td>
                <td>{quantLabel(run)}</td>
                <td>{contextLabel(run)}</td>
                <td style={{ textAlign: 'right' }}><span className="lb-score green">{run.overall_score.toFixed(1)}</span></td>
                <td style={{ textAlign: 'right' }}>{run.ttft_ms ? `${run.ttft_ms.toFixed(0)}ms` : '—'}</td>
                <td style={{ textAlign: 'right' }}>{run.generation_tok_per_sec.toFixed(1)}</td>
                <td style={{ textAlign: 'right' }}>{run.peak_ram_gb ? `${run.peak_ram_gb.toFixed(1)}GB` : '—'}</td>
              </tr>
            ))}
            {!hardwareRuns.length && <tr><td colSpan={8} className="empty-cell">No stack runs for this hardware yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Pick({ title, run }: { title: string; run?: ReturnType<typeof useLeaderboard>['runs'][number] }) {
  return (
    <div className="metric-card highlight-card">
      <div className="metric-label">{title}</div>
      <div className="metric-value">{run ? run.model : '—'}</div>
      <p>{run ? `${engineLabel(run)} · ${quantLabel(run)} · ${run.overall_score.toFixed(1)} score` : 'No matching run yet.'}</p>
    </div>
  )
}

function sizeScore(model: string) {
  const match = model.toLowerCase().match(/(\d+(?:\.\d+)?)\s*b/)
  return match ? Number(match[1]) : 0
}
