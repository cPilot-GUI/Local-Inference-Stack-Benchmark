import { useParams } from 'react-router-dom'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { canItRunLabel, contextLabel, decodeModelSlug, engineLabel, isStackRun, machineLabel, quantLabel } from '../lib/leaderboard'

export default function ModelPage() {
  const { model = '' } = useParams()
  const modelName = decodeModelSlug(model)
  const { runs } = useLeaderboard()
  const modelRuns = runs.filter((run) => isStackRun(run) && run.model === modelName).sort((a, b) => b.overall_score - a.overall_score)
  const bestMac = modelRuns.find((run) => `${run.hardware_class} ${machineLabel(run)}`.toLowerCase().includes('mac'))
  const bestCpu = modelRuns.find((run) => `${run.hardware_class} ${machineLabel(run)}`.toLowerCase().includes('cpu'))
  const bestSmallGpu = modelRuns.find((run) => (run.gpu_memory_gb || run.peak_vram_gb || 0) <= 8 && (run.gpu_memory_gb || run.peak_vram_gb || 0) > 0)

  return (
    <div className="narrow-page">
      <h1>{modelName}</h1>
      <p className="page-subtitle">Recommended local inference stacks for this model across engines, quantization, context length, and hardware.</p>
      <div className="metric-grid metric-grid-tight">
        <Recommendation title="Best engine on Mac" run={bestMac} />
        <Recommendation title="Best CPU-only setup" run={bestCpu} />
        <Recommendation title="Best small-VRAM setup" run={bestSmallGpu} />
      </div>
      <div className="card lb-card">
        <table className="lb-table">
          <thead>
            <tr>
              <th>Engine</th>
              <th>Quant</th>
              <th>Hardware</th>
              <th>Context</th>
              <th>Can it run?</th>
              <th style={{ textAlign: 'right' }}>Score</th>
              <th style={{ textAlign: 'right' }}>tok/s</th>
              <th style={{ textAlign: 'right' }}>Peak Mem</th>
            </tr>
          </thead>
          <tbody>
            {modelRuns.map((run) => (
              <tr key={run.id}>
                <td>{engineLabel(run)}</td>
                <td>{quantLabel(run)}</td>
                <td>{machineLabel(run)}</td>
                <td>{contextLabel(run)}</td>
                <td><span className="run-label good">{canItRunLabel(run)}</span></td>
                <td style={{ textAlign: 'right' }}><span className="lb-score green">{run.overall_score.toFixed(1)}</span></td>
                <td style={{ textAlign: 'right' }}>{run.generation_tok_per_sec.toFixed(1)}</td>
                <td style={{ textAlign: 'right' }}>{run.peak_ram_gb ? `${run.peak_ram_gb.toFixed(1)}GB` : '—'}</td>
              </tr>
            ))}
            {!modelRuns.length && <tr><td colSpan={8} className="empty-cell">No stack runs for this model yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Recommendation({ title, run }: { title: string; run?: ReturnType<typeof useLeaderboard>['runs'][number] }) {
  return (
    <div className="metric-card highlight-card">
      <div className="metric-label">{title}</div>
      <div className="metric-value">{run ? run.overall_score.toFixed(1) : '—'}</div>
      <p>{run ? `${engineLabel(run)} · ${quantLabel(run)} · ${machineLabel(run)}` : 'No matching run yet.'}</p>
    </div>
  )
}
