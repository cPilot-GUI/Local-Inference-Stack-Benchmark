"""Stability suite for repeated local inference checks."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from bench_loop.config import TASKS_DIR
from bench_loop.models import BenchmarkTask, StabilityMetrics, TaskResult
from bench_loop.suites.base import BenchmarkSuite


class StabilitySuite(BenchmarkSuite):
    name = "stability"
    task_file = Path(TASKS_DIR) / "stability" / "tasks.yaml"

    async def run_task(
        self,
        provider_module: Any,
        endpoint: str,
        model: str,
        task: BenchmarkTask,
        harness: Any | None = None,
        provider_name: str = "ollama",
    ) -> TaskResult:
        attempts = int(task.config.get("attempts") or 10)
        request_task = BenchmarkTask(
            id=task.id,
            suite=task.suite,
            messages=task.messages,
            config={k: v for k, v in task.config.items() if k != "attempts"},
            validation=task.validation,
            metadata=task.metadata,
        )
        successes = 0
        failures: list[str] = []
        latencies: list[float] = []
        timeout_count = 0
        load_failures = 0
        hangs = 0
        for _ in range(attempts):
            try:
                result = await super().run_task(
                    provider_module,
                    endpoint,
                    model,
                    request_task,
                    harness,
                    provider_name,
                )
            except TimeoutError as exc:
                timeout_count += 1
                failures.append(str(exc))
                continue
            except Exception as exc:  # noqa: BLE001
                message = str(exc)
                failures.append(message)
                if "not found" in message.lower() or "load" in message.lower():
                    load_failures += 1
                if "timeout" in message.lower() or "timed out" in message.lower():
                    timeout_count += 1
                continue
            if result.passed:
                successes += 1
            else:
                failures.append(result.error or "empty response")
            if result.latency_ms:
                latencies.append(result.latency_ms)
            if result.latency_ms > float(task.config.get("hang_ms") or 120_000):
                hangs += 1

        success_rate = successes / attempts * 100 if attempts else 0.0
        metrics = StabilityMetrics(
            success_rate=round(success_rate, 2),
            run_count=attempts,
            load_failure_rate=round(load_failures / attempts * 100, 2) if attempts else 0.0,
            crash_rate=0.0,
            hang_rate=round(hangs / attempts * 100, 2) if attempts else 0.0,
            api_timeout_rate=round(timeout_count / attempts * 100, 2) if attempts else 0.0,
            memory_leak_trend_gb=0.0,
        )
        return TaskResult(
            task_id=task.id,
            suite=self.name,
            passed=successes == attempts,
            score=round(success_rate, 2),
            latency_ms=sum(latencies) / len(latencies) if latencies else 0.0,
            tokens_generated=0,
            tokens_prompt=0,
            error="; ".join(failures[:3]),
            output=f"{successes}/{attempts} successful runs",
            metadata={"stability_metrics": metrics.__dict__},
        )

    def evaluate(self, task: BenchmarkTask, response: dict[str, Any]) -> TaskResult:
        passed = bool(response.get("content", "").strip()) and not response.get("error")
        return self.build_result(
            task=task,
            passed=passed,
            score=100.0 if passed else 0.0,
            response=response,
            output=self.response_text(response),
            error=str(response.get("error", "")),
        )
