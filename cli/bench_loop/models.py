"""Core data models for BenchLoop results and configuration."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class SuiteName(str, Enum):
    SPEED = "speed"
    MEMORY = "memory"
    STABILITY = "stability"
    QUALITY_RETENTION = "quality_retention"
    CODING = "coding"
    TOOL_CALLING = "tool_calling"
    REASONING = "reasoning"
    INSTRUCTION = "instruction_following"
    STRUCTURED = "structured_output"
    AGENT_LOOP = "agent_loop"


@dataclass
class MachineInfo:
    machine_id: str
    cpu: str = ""
    gpu: str = ""
    gpu_memory_gb: float = 0.0
    system_memory_gb: float = 0.0
    os: str = ""
    backend: str = ""
    is_remote: bool = False
    remote_host: str = ""
    endpoint: str = ""
    hardware_label: str = ""

    def summary(self) -> str:
        parts: list[str] = []
        if self.hardware_label:
            return self.hardware_label
        if self.gpu:
            parts.append(self.gpu)
        if self.gpu_memory_gb:
            parts.append(f"{self.gpu_memory_gb:.0f}GB VRAM")
        if self.cpu:
            parts.append(self.cpu)
        if self.system_memory_gb and self.cpu and not self.gpu:
            parts.append(f"{self.system_memory_gb:.0f}GB RAM")
        return " / ".join(parts) if parts else self.machine_id


@dataclass
class ModelInfo:
    model_id: str
    family: str = ""
    parameter_count: str = ""
    quantization: str = ""


@dataclass
class StackInfo:
    model_id: str = ""
    model_family: str = ""
    parameter_size: str = ""
    quantization: str = ""
    engine: str = ""
    engine_version: str = ""
    provider: str = ""
    runtime_config: dict[str, Any] = field(default_factory=dict)
    context_length: int = 0
    hardware_class: str = ""
    os: str = ""


@dataclass
class BenchmarkTask:
    id: str
    suite: str
    messages: list[dict[str, str]]
    title: str = ""
    difficulty: str = ""
    capability_tags: list[str] = field(default_factory=list)
    verifier_type: str = ""
    expected_turns: int | None = None
    notes: str = ""
    config: dict[str, Any] = field(default_factory=dict)
    validation: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TaskResult:
    task_id: str
    suite: str
    passed: bool
    score: float
    latency_ms: float = 0.0
    tokens_generated: int = 0
    tokens_prompt: int = 0
    error: str = ""
    output: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SuiteResult:
    suite: str
    score: float
    task_count: int = 0
    pass_count: int = 0
    fail_count: int = 0
    median_latency_ms: float = 0.0
    tasks: list[TaskResult] = field(default_factory=list)


@dataclass
class SpeedMetrics:
    ttft_ms: float = 0.0
    prompt_eval_tok_per_sec: float = 0.0
    generation_tok_per_sec: float = 0.0
    total_latency_ms: float = 0.0


@dataclass
class MemoryMetrics:
    peak_ram_gb: float = 0.0
    peak_vram_gb: float = 0.0
    model_load_memory_gb: float = 0.0
    kv_cache_growth_gb: float = 0.0
    runtime_overhead_gb: float = 0.0
    oom_rate: float = 0.0


@dataclass
class StabilityMetrics:
    success_rate: float = 0.0
    run_count: int = 0
    load_failure_rate: float = 0.0
    crash_rate: float = 0.0
    hang_rate: float = 0.0
    api_timeout_rate: float = 0.0
    memory_leak_trend_gb: float = 0.0


@dataclass
class QualityRetentionMetrics:
    score: float = 0.0
    task_count: int = 0
    pass_count: int = 0
    chinese_score: float = 0.0
    code_score: float = 0.0
    math_score: float = 0.0
    format_score: float = 0.0


@dataclass
class BenchmarkRun:
    """Top-level result for one complete benchmark run."""

    version: str = "0.1.0"
    timestamp: str = ""
    model: ModelInfo = field(default_factory=lambda: ModelInfo(model_id="unknown"))
    machine: MachineInfo = field(default_factory=lambda: MachineInfo(machine_id="unknown"))
    stack: StackInfo = field(default_factory=StackInfo)
    provider: str = "ollama"
    harness: str = "raw"
    harness_version: str = ""
    total_runtime_sec: float = 0.0
    overall_score: float = 0.0
    quality_score: float = 0.0
    speed_score: float = 0.0
    reliability_score: float = 0.0
    value_score: float = 0.0
    speed_metrics: SpeedMetrics = field(default_factory=SpeedMetrics)
    memory_metrics: MemoryMetrics = field(default_factory=MemoryMetrics)
    stability_metrics: StabilityMetrics = field(default_factory=StabilityMetrics)
    quality_retention_metrics: QualityRetentionMetrics = field(default_factory=QualityRetentionMetrics)
    can_it_run: str = ""
    is_stack_benchmark: bool = False
    legacy_model_run: bool = False
    suites: dict[str, SuiteResult] = field(default_factory=dict)

    def compute_aggregates(self) -> None:
        speed_suite = self.suites.get(SuiteName.SPEED) or self.suites.get(SuiteName.SPEED.value)
        if speed_suite:
            self.speed_score = speed_suite.score

        memory_suite = self.suites.get(SuiteName.MEMORY) or self.suites.get(SuiteName.MEMORY.value)
        memory_score = memory_suite.score if memory_suite else 0.0

        stability_suite = self.suites.get(SuiteName.STABILITY) or self.suites.get(SuiteName.STABILITY.value)
        if stability_suite:
            self.reliability_score = stability_suite.score
        else:
            total_tasks = sum(s.task_count for s in self.suites.values())
            total_passed = sum(s.pass_count for s in self.suites.values())
            self.reliability_score = (total_passed / total_tasks * 100) if total_tasks > 0 else 0.0

        quality_retention_suite = self.suites.get(SuiteName.QUALITY_RETENTION) or self.suites.get(SuiteName.QUALITY_RETENTION.value)
        if quality_retention_suite:
            self.quality_score = quality_retention_suite.score
        else:
            quality_suites = [
                suite_result
                for name, suite_result in self.suites.items()
                if name not in {SuiteName.SPEED, SuiteName.SPEED.value, SuiteName.MEMORY, SuiteName.MEMORY.value, SuiteName.STABILITY, SuiteName.STABILITY.value}
            ]
            if quality_suites:
                self.quality_score = sum(s.score for s in quality_suites) / len(quality_suites)

        has_stack_suites = bool(speed_suite and memory_suite and stability_suite and quality_retention_suite)
        self.is_stack_benchmark = has_stack_suites
        self.legacy_model_run = not has_stack_suites

        if has_stack_suites:
            self.overall_score = (
                0.35 * self.speed_score
                + 0.30 * memory_score
                + 0.20 * self.reliability_score
                + 0.15 * self.quality_score
            )
        else:
            self.overall_score = (
                0.55 * self.quality_score
                + 0.20 * self.speed_score
                + 0.25 * self.reliability_score
            )

        speed_factor = (
            min(self.speed_metrics.generation_tok_per_sec / 100, 1.0)
            if self.speed_metrics.generation_tok_per_sec > 0
            else 0.5
        )
        reliability_factor = self.reliability_score / 100
        self.value_score = self.quality_score * speed_factor * reliability_factor
        self.can_it_run = _can_it_run_label(
            overall=self.overall_score,
            stability=self.reliability_score,
            oom_rate=self.memory_metrics.oom_rate,
            generation_tok_per_sec=self.speed_metrics.generation_tok_per_sec,
        )

    def to_dict(self) -> dict[str, Any]:
        return _asdict_recursive(self)


def _asdict_recursive(obj: Any) -> Any:
    import dataclasses

    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return {key: _asdict_recursive(value) for key, value in dataclasses.asdict(obj).items()}
    if isinstance(obj, dict):
        return {key: _asdict_recursive(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [_asdict_recursive(value) for value in obj]
    if isinstance(obj, Enum):
        return obj.value
    return obj


def _can_it_run_label(*, overall: float, stability: float, oom_rate: float, generation_tok_per_sec: float) -> str:
    if oom_rate >= 0.5:
        return "OOM"
    if stability <= 0:
        return "Fails to load"
    if stability < 70:
        return "Unstable"
    if generation_tok_per_sec and generation_tok_per_sec < 4:
        return "Barely runs"
    if overall >= 80 and stability >= 95:
        return "Runs smoothly"
    if overall >= 55 and stability >= 80:
        return "Runs with tradeoffs"
    return "Barely runs"
