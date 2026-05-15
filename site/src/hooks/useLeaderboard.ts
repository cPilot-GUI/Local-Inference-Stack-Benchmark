import { useEffect, useState } from 'react'

export interface PublicRun {
  id: string
  run_id?: string
  machine_id?: string
  timestamp?: string
  submitted_at?: string
  model: string
  model_family?: string
  parameter_size?: string
  quantization?: string
  engine?: string
  engine_version?: string
  stack?: {
    model_id?: string
    model_family?: string
    parameter_size?: string
    quantization?: string
    engine?: string
    engine_version?: string
    provider?: string
    runtime_config?: Record<string, unknown>
    context_length?: number
    hardware_class?: string
    os?: string
  }
  harness: string
  provider: string
  context_length?: number
  runtime_config?: Record<string, unknown>
  hardware_class?: string
  can_it_run?: string
  is_stack_benchmark?: boolean
  legacy_model_run?: boolean
  machine: string
  hardware_label?: string
  profile_name?: string
  profile_avatar_url?: string
  profile_url?: string
  command_used?: string
  cpu?: string
  gpu?: string
  gpu_memory_gb?: number
  system_memory_gb?: number
  os?: string
  overall_score: number
  quality_score: number
  speed_score: number
  memory_score?: number
  reliability_score: number
  quality_retention_score?: number
  generation_tok_per_sec: number
  prompt_eval_tok_per_sec?: number
  ttft_ms: number
  peak_ram_gb?: number
  peak_vram_gb?: number
  oom_rate?: number
  stability_success_rate?: number
  total_runtime_sec?: number | null
  is_remote?: boolean
  remote_host?: string
  endpoint?: string
  is_full_benchmark: boolean
  is_quality_full?: boolean
  is_agent_only?: boolean
  agent_score?: number | null
  agent_pass?: number | null
  agent_task_count?: number | null
  suites: Record<string, { score: number; pass_count?: number; task_count?: number }>
}

/**
 * Fetch the public leaderboard. Primary source is the Cloudflare Worker at
 * api.bench-loop.com/leaderboard, which is populated by the local BenchLoop
 * CLI auto-submitting completed runs. Falls back to the static JSON bundled
 * with the site (useful for offline / first-deploy / API outage).
 */
const API_URL = 'https://api.bench-loop.com/leaderboard'
const FALLBACK_URL = '/data/leaderboard.json'

export function useLeaderboard() {
  const [runs, setRuns] = useState<PublicRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      for (const url of [API_URL, FALLBACK_URL]) {
        try {
          const r = await fetch(url, { cache: 'no-cache' })
          if (!r.ok) continue
          const d = await r.json()
          if (cancelled) return
          const list: PublicRun[] = (d.runs || [])
            .slice()
            .map(normalizeRun)
            .sort((a: PublicRun, b: PublicRun) => (b.overall_score || 0) - (a.overall_score || 0))
          if (url === API_URL && !list.some((run) => run.is_stack_benchmark && !run.legacy_model_run)) {
            continue
          }
          setRuns(list)
          return
        } catch {
          /* try next */
        }
      }
      if (!cancelled) setError('Failed to load leaderboard')
    }
    load()
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { runs, loading, error }
}

function normalizeRun(run: PublicRun): PublicRun {
  const stack = run.stack || {}
  const engine = run.engine || stack.engine || run.provider || 'unknown engine'
  const quantization = run.quantization || stack.quantization || ''
  const contextLength = run.context_length || stack.context_length || 0
  return {
    ...run,
    stack,
    engine,
    quantization,
    model_family: run.model_family || stack.model_family || '',
    parameter_size: run.parameter_size || stack.parameter_size || '',
    context_length: contextLength,
    hardware_class: run.hardware_class || stack.hardware_class || '',
    memory_score: run.memory_score ?? run.suites?.memory?.score ?? 0,
    quality_retention_score: run.quality_retention_score ?? run.quality_score ?? 0,
    stability_success_rate: run.stability_success_rate ?? run.reliability_score ?? 0,
    can_it_run: run.can_it_run || (run.legacy_model_run ? 'Legacy run' : ''),
    is_stack_benchmark: Boolean(run.is_stack_benchmark || (run.suites?.memory && run.suites?.stability && run.suites?.quality_retention)),
    legacy_model_run: Boolean(run.legacy_model_run ?? !(run.suites?.memory && run.suites?.stability && run.suites?.quality_retention)),
  }
}
