import type { PublicRun } from '../hooks/useLeaderboard'

export type RankMode =
  | 'overall'
  | 'frontier'
  | 'speed'
  | 'memory'
  | 'stability'
  | 'quality_retention'
  | 'tok_per_sec'

export function scoreOf(run: PublicRun, mode: RankMode): number {
  switch (mode) {
    case 'quality_retention':
      return run.quality_retention_score ?? run.quality_score
    case 'memory':
      return run.memory_score ?? 0
    case 'stability':
      return run.stability_success_rate ?? run.reliability_score
    case 'speed':
      return run.speed_score
    case 'tok_per_sec':
      return run.generation_tok_per_sec
    case 'frontier':
      return lowMemoryFrontierScore(run)
    default:
      return run.overall_score
  }
}

export function engineLabel(run: PublicRun): string {
  return (run.engine || run.stack?.engine || run.provider || 'unknown engine').replace(/_/g, ' ')
}

export function quantLabel(run: PublicRun): string {
  return run.quantization || run.stack?.quantization || 'unknown quant'
}

export function contextLabel(run: PublicRun): string {
  const ctx = run.context_length || run.stack?.context_length || 0
  if (!ctx) return 'context n/a'
  return ctx >= 1000 ? `${Math.round(ctx / 1000)}K ctx` : `${ctx} ctx`
}

export function canItRunLabel(run: PublicRun): string {
  return run.can_it_run || (run.legacy_model_run ? 'Legacy run' : 'Unknown')
}

export function isStackRun(run: PublicRun): boolean {
  return Boolean(run.is_stack_benchmark && !run.legacy_model_run)
}

export function modelSlug(model: string): string {
  return encodeURIComponent(model.replace(/\//g, '__slash__'))
}

export function decodeModelSlug(slug = ''): string {
  return decodeURIComponent(slug).replace(/__slash__/g, '/')
}

export function endpointPort(endpoint?: string): string {
  if (!endpoint) return ''
  try {
    return new URL(endpoint).port || ''
  } catch {
    return ''
  }
}

export function machineLabel(run: PublicRun): string {
  if (run.hardware_label) return run.hardware_label
  if (run.gpu) return run.gpu
  if (run.cpu && run.system_memory_gb) return `${run.cpu} (${run.system_memory_gb.toFixed(0)}GB RAM)`
  if (run.cpu) return run.cpu

  if (run.is_remote) {
    const port = endpointPort(run.endpoint)
    if (port === '11435') return 'PC1 remote hardware'
    if (port === '11436') return 'Studio remote hardware'
    return `Remote hardware${port ? ` (:${port})` : ''}`
  }

  if (run.machine && run.machine !== 'localhost') return run.machine
  return 'unknown hardware'
}

export function normalizedHardwareLabel(run: PublicRun): string {
  const label = machineLabel(run).trim()
  return label || 'unknown hardware'
}

export function providerLabel(run: PublicRun): string {
  const provider = (run.provider || '').trim()
  if (!provider) return 'unknown provider'
  return provider.replace(/_/g, ' ')
}

export function stackTuple(run: PublicRun): string {
  return [
    run.model,
    quantLabel(run),
    engineLabel(run),
    normalizedHardwareLabel(run),
    contextLabel(run),
  ].join(' × ')
}

export function parameterBillions(run: PublicRun): number {
  const raw = run.parameter_size || run.model || ''
  const match = raw.toLowerCase().match(/(\d+(?:\.\d+)?)\s*b/)
  return match ? Number(match[1]) : 0
}

export function peakMemoryGb(run: PublicRun): number {
  const ram = run.peak_ram_gb || 0
  const vram = run.peak_vram_gb || 0
  if (ram && vram) return Math.max(ram, vram)
  return ram || vram || 0
}

export function modelDensityLabel(run: PublicRun): string {
  const density = modelDensity(run)
  return density ? `${density.toFixed(2)}B/GB` : 'n/a'
}

export function modelDensity(run: PublicRun): number {
  const params = parameterBillions(run)
  const memory = peakMemoryGb(run)
  if (!params || !memory) return 0
  return params / memory
}

export function lowMemoryFrontierScore(run: PublicRun): number {
  const params = parameterBillions(run)
  const memory = peakMemoryGb(run)
  const quality = run.quality_retention_score ?? run.quality_score ?? 0
  const stability = run.stability_success_rate ?? run.reliability_score ?? 0
  const speed = run.speed_score || 0
  if (!params || !memory) {
    return 0.45 * (run.memory_score || 0) + 0.3 * quality + 0.25 * stability
  }
  const density = params / memory
  const densityScore = Math.max(0, Math.min(100, 42 * Math.log2(1 + density)))
  const largeModelBonus = Math.max(0, Math.min(12, params / 5))
  return Math.min(100, 0.38 * densityScore + 0.24 * quality + 0.22 * stability + 0.12 * speed + largeModelBonus)
}

export function publisherName(run: PublicRun): string {
  return (run.profile_name || '').trim()
}

export function publisherLabel(run: PublicRun): string {
  return publisherName(run) || 'anonymous'
}

export function hasMeaningfulQuality(run: PublicRun, floor: number): boolean {
  return (run.quality_score || 0) >= floor
}

export function timeAgo(iso?: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (isNaN(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function suiteSummary(run: PublicRun): string {
  const names = Object.keys(run.suites || {})
  if (!names.length) return 'No suites recorded'
  return names.join(', ')
}
