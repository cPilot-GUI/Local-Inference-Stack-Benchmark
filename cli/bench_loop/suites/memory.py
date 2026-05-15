"""Memory efficiency suite for local inference stacks."""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

import psutil

from bench_loop.config import TASKS_DIR
from bench_loop.models import BenchmarkTask, MemoryMetrics, TaskResult
from bench_loop.suites.base import BenchmarkSuite


class MemorySuite(BenchmarkSuite):
    name = "memory"
    task_file = Path(TASKS_DIR) / "memory" / "tasks.yaml"

    async def run_task(
        self,
        provider_module: Any,
        endpoint: str,
        model: str,
        task: BenchmarkTask,
        harness: Any | None = None,
        provider_name: str = "ollama",
    ) -> TaskResult:
        ram_before = _used_ram_gb()
        vram_before = _used_vram_gb()
        response: dict[str, Any]
        try:
            response = await super().run_task(provider_module, endpoint, model, task, harness, provider_name)
            if isinstance(response, TaskResult):
                return response
        except Exception as exc:  # noqa: BLE001
            ram_after = _used_ram_gb()
            vram_after = _used_vram_gb()
            metrics = MemoryMetrics(
                peak_ram_gb=max(ram_before, ram_after),
                peak_vram_gb=max(vram_before, vram_after),
                runtime_overhead_gb=max(0.0, ram_after - ram_before),
                oom_rate=1.0 if _looks_like_oom(str(exc)) else 0.0,
            )
            return self.build_result(
                task=task,
                passed=False,
                score=0.0,
                response={"total_ms": 0, "tokens_generated": 0, "tokens_prompt": 0},
                output="",
                error=str(exc),
                metadata={"memory_metrics": metrics.__dict__},
            )
        raise RuntimeError("unreachable")

    def evaluate(self, task: BenchmarkTask, response: dict[str, Any]) -> TaskResult:
        ram_used = _used_ram_gb()
        vram_used = _used_vram_gb()
        system_total = psutil.virtual_memory().total / (1024**3)
        load_memory_gb = _ns_to_sec(response.get("load_duration")) * 0.0
        runtime_overhead_gb = max(0.0, ram_used - float(task.metadata.get("baseline_ram_gb", 0.0) or 0.0))
        oom = _looks_like_oom(str(response.get("error", "")))
        metrics = MemoryMetrics(
            peak_ram_gb=round(ram_used, 3),
            peak_vram_gb=round(vram_used, 3),
            model_load_memory_gb=round(load_memory_gb, 3),
            kv_cache_growth_gb=0.0,
            runtime_overhead_gb=round(runtime_overhead_gb, 3),
            oom_rate=1.0 if oom else 0.0,
        )
        memory_fraction = min(ram_used / system_total, 1.0) if system_total else 1.0
        score = max(0.0, 100.0 - (memory_fraction * 70.0) - (metrics.oom_rate * 100.0))
        passed = bool(response.get("content", "").strip()) and not oom
        return self.build_result(
            task=task,
            passed=passed,
            score=round(score, 2),
            response=response,
            output=self.response_text(response),
            error=str(response.get("error", "")),
            metadata={"memory_metrics": metrics.__dict__},
        )


def _used_ram_gb() -> float:
    vm = psutil.virtual_memory()
    return round((vm.total - vm.available) / (1024**3), 3)


def _used_vram_gb() -> float:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
    except Exception:
        return 0.0
    total_mb = 0.0
    for line in (result.stdout or "").splitlines():
        try:
            total_mb += float(line.strip())
        except ValueError:
            continue
    return round(total_mb / 1024, 3)


def _looks_like_oom(message: str) -> bool:
    lowered = message.lower()
    return "out of memory" in lowered or "oom" in lowered or "cuda error" in lowered


def _ns_to_sec(value: object) -> float:
    try:
        return float(value or 0) / 1_000_000_000
    except (TypeError, ValueError):
        return 0.0
