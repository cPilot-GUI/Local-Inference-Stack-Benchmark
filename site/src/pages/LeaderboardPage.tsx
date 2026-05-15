import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLeaderboard, type PublicRun } from '../hooks/useLeaderboard'
import {
  canItRunLabel,
  contextLabel,
  engineLabel,
  isStackRun,
  machineLabel,
  modelSlug,
  normalizedHardwareLabel,
  quantLabel,
  scoreOf,
  stackTuple,
  timeAgo,
  type RankMode,
} from '../lib/leaderboard'

const RANK_MODES: { id: RankMode; label: string }[] = [
  { id: 'overall', label: 'Local Score' },
  { id: 'speed', label: 'Speed' },
  { id: 'memory', label: 'Memory' },
  { id: 'stability', label: 'Stability' },
  { id: 'quality_retention', label: 'Quality retention' },
  { id: 'tok_per_sec', label: 'Decode tok/s' },
]

const VIEW_MODES = [
  { id: 'all', label: 'All stack runs' },
  { id: '16gb', label: 'Best 16GB devices' },
  { id: 'cpu', label: 'CPU-only' },
  { id: 'small-vram', label: 'Small VRAM' },
  { id: 'chinese', label: 'Chinese local models' },
  { id: '30b', label: '30B+ setups' },
] as const

type ViewMode = typeof VIEW_MODES[number]['id']

export default function LeaderboardPage() {
  const { runs, loading, error } = useLeaderboard()
  const [mode, setMode] = useState<RankMode>('overall')
  const [view, setView] = useState<ViewMode>('all')
  const [search, setSearch] = useState('')
  const [engineFilter, setEngineFilter] = useState('all')
  const [hardwareFilter, setHardwareFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const stackRuns = useMemo(() => runs.filter(isStackRun), [runs])

  const engines = useMemo(() => {
    return Array.from(new Set(stackRuns.map(engineLabel))).sort((a, b) => a.localeCompare(b))
  }, [stackRuns])

  const hardware = useMemo(() => {
    return Array.from(new Set(stackRuns.map(normalizedHardwareLabel))).sort((a, b) => a.localeCompare(b))
  }, [stackRuns])

  const ranked = useMemo(() => {
    const query = search.trim().toLowerCase()
    return stackRuns
      .filter((run) => {
        const haystack = [
          run.model,
          run.model_family,
          quantLabel(run),
          engineLabel(run),
          normalizedHardwareLabel(run),
          run.hardware_class,
          canItRunLabel(run),
        ]
          .join(' ')
          .toLowerCase()
        if (query && !haystack.includes(query)) return false
        if (engineFilter !== 'all' && engineLabel(run) !== engineFilter) return false
        if (hardwareFilter !== 'all' && normalizedHardwareLabel(run) !== hardwareFilter) return false
        if (view === '16gb' && !`${run.hardware_class} ${machineLabel(run)}`.toLowerCase().includes('16gb')) return false
        if (view === 'cpu' && !`${run.hardware_class} ${machineLabel(run)}`.toLowerCase().includes('cpu')) return false
        if (view === 'small-vram' && !((run.peak_vram_gb || run.gpu_memory_gb || 0) <= 8 && (run.peak_vram_gb || run.gpu_memory_gb || 0) > 0)) return false
        if (view === 'chinese' && !`${run.model} ${run.model_family}`.toLowerCase().match(/qwen|deepseek|yi|glm/)) return false
        if (view === '30b' && !`${run.parameter_size || ''} ${run.model}`.toLowerCase().match(/3[0-9]b|4[0-9]b|70b|72b|120b/)) return false
        return true
      })
      .slice()
      .sort((a, b) => scoreOf(b, mode) - scoreOf(a, mode))
  }, [stackRuns, mode, view, search, engineFilter, hardwareFilter])

  const stats = useMemo(() => {
    return {
      stackRuns: stackRuns.length,
      engines: new Set(stackRuns.map(engineLabel)).size,
      models: new Set(stackRuns.map((run) => run.model)).size,
      hardware: new Set(stackRuns.map(normalizedHardwareLabel)).size,
      legacyRuns: runs.filter((run) => run.legacy_model_run).length,
    }
  }, [runs, stackRuns])

  const top = ranked[0] || null

  return (
    <div className="stack-page">
      <section className="leaderboard-hero">
        <div>
          <h1>Local Inference Stack Leaderboard</h1>
          <p>
            Rank the full local stack, not just the model: model, quantization, inference engine,
            hardware, OS, and runtime configuration.
          </p>
          <div className="hero-actions">
            <Link to="/submit" className="btn btn-primary">Run the benchmark</Link>
            <Link to="/methodology" className="btn btn-secondary">Methodology</Link>
          </div>
        </div>
        <div className="stack-summary-panel">
          <div className="metric-label">Current leader</div>
          <strong>{top ? top.model : 'No stack run yet'}</strong>
          <span>{top ? stackTuple(top) : 'Official seed data will appear here.'}</span>
          <div className="summary-score">{top ? top.overall_score.toFixed(1) : '—'}</div>
          <small>Local Inference Score</small>
        </div>
      </section>

      <div className="metric-grid metric-grid-tight">
        <Stat label="Stack runs" value={String(stats.stackRuns)} />
        <Stat label="Engines" value={String(stats.engines)} />
        <Stat label="Models" value={String(stats.models)} />
        <Stat label="Hardware classes" value={String(stats.hardware)} />
      </div>

      <section className="card lb-filters stack-filters">
        <div className="lb-filters-header">
          <div>
            <div className="page-kicker lb-kicker">Stack selection</div>
            <div className="lb-filter-summary">
              Showing <strong>{ranked.length}</strong> stack runs. Legacy model/harness runs hidden from this board: <strong>{stats.legacyRuns}</strong>.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost lb-reset-btn"
            onClick={() => {
              setMode('overall')
              setView('all')
              setSearch('')
              setEngineFilter('all')
              setHardwareFilter('all')
            }}
          >
            Reset filters
          </button>
        </div>
        <div className="lb-rank-modes">
          {RANK_MODES.map((rankMode) => (
            <button
              key={rankMode.id}
              type="button"
              onClick={() => setMode(rankMode.id)}
              className={`btn ${mode === rankMode.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {rankMode.label}
            </button>
          ))}
        </div>
        <div className="lb-rank-modes">
          {VIEW_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`btn ${view === item.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="lb-filter-controls">
          <input
            type="search"
            placeholder="Search model, quant, engine, hardware…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="lb-search"
          />
          <select value={engineFilter} onChange={(event) => setEngineFilter(event.target.value)}>
            <option value="all">All engines</option>
            {engines.map((engine) => <option key={engine} value={engine}>{engine}</option>)}
          </select>
          <select value={hardwareFilter} onChange={(event) => setHardwareFilter(event.target.value)}>
            <option value="all">All hardware</option>
            {hardware.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </section>

      {loading && <div className="card">Loading stack runs…</div>}
      {error && <div className="card">Could not load leaderboard: {error}</div>}
      {!loading && !error && ranked.length === 0 && (
        <div className="card empty-board">
          <strong>No stack runs match this filter.</strong>
          <p>Try all stack runs or clear the engine and hardware filters.</p>
        </div>
      )}

      {!loading && !error && ranked.length > 0 && (
        <div className="card lb-card stack-table-card">
          <table className="lb-table stack-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Stack</th>
                <th>Engine</th>
                <th>Hardware</th>
                <th>Can it run?</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th style={{ textAlign: 'right' }}>TTFT</th>
                <th style={{ textAlign: 'right' }}>Decode</th>
                <th style={{ textAlign: 'right' }}>Prefill</th>
                <th style={{ textAlign: 'right' }}>Peak Mem</th>
                <th style={{ textAlign: 'right' }}>Stable</th>
                <th style={{ textAlign: 'right' }}>Quality</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((run, index) => {
                const expanded = expandedId === run.id
                return (
                  <Fragment key={run.id}>
                    <tr className="lb-row-clickable" onClick={() => setExpandedId(expanded ? null : run.id)}>
                      <td className="lb-score">{index + 1}</td>
                      <td>
                        <Link to={`/models/${modelSlug(run.model)}`} onClick={(event) => event.stopPropagation()}>
                          <strong>{run.model}</strong>
                        </Link>
                        <div className="stack-subline">
                          {quantLabel(run)} · {contextLabel(run)} · {run.parameter_size || 'size n/a'}
                        </div>
                      </td>
                      <td><Link to="/engines" onClick={(event) => event.stopPropagation()}>{engineLabel(run)}</Link></td>
                      <td>
                        <Link to={`/hardware/${encodeURIComponent(normalizedHardwareLabel(run))}`} onClick={(event) => event.stopPropagation()}>
                          {machineLabel(run)}
                        </Link>
                        <div className="stack-subline">{run.hardware_class || run.os || 'hardware class n/a'}</div>
                      </td>
                      <td><span className={`run-label ${statusClass(canItRunLabel(run))}`}>{canItRunLabel(run)}</span></td>
                      <td style={{ textAlign: 'right' }}><span className={`lb-score ${scoreClass(run.overall_score)}`}>{run.overall_score.toFixed(1)}</span></td>
                      <td style={{ textAlign: 'right' }} className="lb-score">{run.ttft_ms ? `${run.ttft_ms.toFixed(0)}ms` : '—'}</td>
                      <td style={{ textAlign: 'right' }} className="lb-score">{run.generation_tok_per_sec ? `${run.generation_tok_per_sec.toFixed(1)}` : '—'}</td>
                      <td style={{ textAlign: 'right' }} className="lb-score">{run.prompt_eval_tok_per_sec ? `${run.prompt_eval_tok_per_sec.toFixed(0)}` : '—'}</td>
                      <td style={{ textAlign: 'right' }} className="lb-score">{formatMem(run)}</td>
                      <td style={{ textAlign: 'right' }}><span className={`lb-score ${scoreClass(run.stability_success_rate ?? run.reliability_score)}`}>{(run.stability_success_rate ?? run.reliability_score).toFixed(0)}%</span></td>
                      <td style={{ textAlign: 'right' }}><span className={`lb-score ${scoreClass(run.quality_retention_score ?? run.quality_score)}`}>{(run.quality_retention_score ?? run.quality_score).toFixed(1)}</span></td>
                    </tr>
                    {expanded && (
                      <tr className="lb-details-row">
                        <td colSpan={12}>
                          <div className="lb-details-grid">
                            <Detail label="Stack tuple" value={stackTuple(run)} />
                            <Detail label="Run ID" value={run.run_id || run.id} mono />
                            <Detail label="Engine version" value={run.engine_version || 'not reported'} />
                            <Detail label="Provider" value={run.provider || 'not reported'} mono />
                            <Detail label="Harness" value={run.harness || 'raw'} mono />
                            <Detail label="Peak RAM" value={run.peak_ram_gb ? `${run.peak_ram_gb.toFixed(1)}GB` : 'not reported'} />
                            <Detail label="Peak VRAM" value={run.peak_vram_gb ? `${run.peak_vram_gb.toFixed(1)}GB` : 'not reported'} />
                            <Detail label="OOM rate" value={run.oom_rate ? `${(run.oom_rate * 100).toFixed(0)}%` : '0%'} />
                            <Detail label="Submitted" value={run.submitted_at || run.timestamp || '—'} mono />
                            <Detail label="Age" value={timeAgo(run.timestamp)} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card stat-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="lb-detail-item">
      <div className="lb-detail-label">{label}</div>
      <div className={mono ? 'lb-detail-value mono' : 'lb-detail-value'}>{value}</div>
    </div>
  )
}

function scoreClass(score: number): string {
  return score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red'
}

function statusClass(status: string): string {
  const lowered = status.toLowerCase()
  if (lowered.includes('smooth')) return 'good'
  if (lowered.includes('tradeoff') || lowered.includes('barely')) return 'warn'
  return 'bad'
}

function formatMem(run: PublicRun): string {
  const ram = run.peak_ram_gb || 0
  const vram = run.peak_vram_gb || 0
  if (ram && vram) return `${ram.toFixed(1)}R/${vram.toFixed(1)}V`
  if (ram) return `${ram.toFixed(1)}GB`
  if (vram) return `${vram.toFixed(1)}GB VRAM`
  return '—'
}
