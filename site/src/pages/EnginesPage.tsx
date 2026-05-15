import { useMemo } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { engineLabel, isStackRun } from '../lib/leaderboard'

export default function EnginesPage() {
  const { runs } = useLeaderboard()
  const engines = useMemo(() => {
    const grouped = new Map<string, typeof runs>()
    runs.filter(isStackRun).forEach((run) => {
      const key = engineLabel(run)
      grouped.set(key, [...(grouped.get(key) || []), run])
    })
    return Array.from(grouped.entries())
      .map(([engine, items]) => ({
        engine,
        runs: items.length,
        score: avg(items.map((run) => run.overall_score)),
        speed: avg(items.map((run) => run.speed_score)),
        memory: avg(items.map((run) => run.memory_score || 0)),
        stability: avg(items.map((run) => run.stability_success_rate || run.reliability_score)),
        quality: avg(items.map((run) => run.quality_retention_score || run.quality_score)),
      }))
      .sort((a, b) => b.score - a.score)
  }, [runs])

  return (
    <div className="narrow-page">
      <h1>Best Local Engines</h1>
      <p className="page-subtitle">
        Compare consumer local inference engines on the same stack score: speed, memory efficiency,
        stability, and quality retention.
      </p>
      <div className="card lb-card">
        <table className="lb-table">
          <thead>
            <tr>
              <th>Engine</th>
              <th style={{ textAlign: 'right' }}>Runs</th>
              <th style={{ textAlign: 'right' }}>Local Score</th>
              <th style={{ textAlign: 'right' }}>Speed</th>
              <th style={{ textAlign: 'right' }}>Memory</th>
              <th style={{ textAlign: 'right' }}>Stability</th>
              <th style={{ textAlign: 'right' }}>Quality</th>
            </tr>
          </thead>
          <tbody>
            {engines.map((item) => (
              <tr key={item.engine}>
                <td><strong>{item.engine}</strong></td>
                <td style={{ textAlign: 'right' }}>{item.runs}</td>
                <td style={{ textAlign: 'right' }}><span className="lb-score green">{item.score.toFixed(1)}</span></td>
                <td style={{ textAlign: 'right' }}>{item.speed.toFixed(1)}</td>
                <td style={{ textAlign: 'right' }}>{item.memory.toFixed(1)}</td>
                <td style={{ textAlign: 'right' }}>{item.stability.toFixed(1)}</td>
                <td style={{ textAlign: 'right' }}>{item.quality.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function avg(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value))
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0
}
