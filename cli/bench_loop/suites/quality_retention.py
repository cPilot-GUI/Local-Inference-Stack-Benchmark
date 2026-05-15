"""Lightweight deterministic quality-retention checks."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from bench_loop.config import TASKS_DIR
from bench_loop.models import BenchmarkTask, QualityRetentionMetrics, TaskResult
from bench_loop.suites.base import BenchmarkSuite


class QualityRetentionSuite(BenchmarkSuite):
    name = "quality_retention"
    task_file = Path(TASKS_DIR) / "quality_retention" / "tasks.yaml"

    def aggregate_score(self, task_results: list[TaskResult]) -> float:
        score = super().aggregate_score(task_results)
        categories: dict[str, list[float]] = {}
        for result in task_results:
            category = str(result.metadata.get("category", "general"))
            categories.setdefault(category, []).append(result.score)
        metrics = QualityRetentionMetrics(
            score=score,
            task_count=len(task_results),
            pass_count=sum(1 for result in task_results if result.passed),
            chinese_score=_avg(categories.get("chinese", [])),
            code_score=_avg(categories.get("code", [])),
            math_score=_avg(categories.get("math", [])),
            format_score=_avg(categories.get("format", [])),
        )
        for result in task_results:
            result.metadata.setdefault("quality_retention_metrics", metrics.__dict__)
        return score

    def evaluate(self, task: BenchmarkTask, response: dict[str, Any]) -> TaskResult:
        text = self.response_text(response).strip()
        validation = task.validation or {}
        kind = validation.get("kind", "contains")
        score = 0.0
        passed = False
        error = ""

        if response.get("error"):
            error = str(response.get("error"))
        elif kind == "contains_all":
            required = [str(item).lower() for item in validation.get("contains", [])]
            lowered = text.lower()
            hits = sum(1 for item in required if item in lowered)
            score = hits / len(required) * 100 if required else 0.0
            passed = hits == len(required)
        elif kind == "regex":
            pattern = str(validation.get("pattern", ""))
            passed = bool(pattern and re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL))
            score = 100.0 if passed else 0.0
        elif kind == "json_fields":
            try:
                parsed = json.loads(_extract_json(text))
                required_fields = validation.get("fields", {})
                hits = 0
                for key, expected in required_fields.items():
                    if str(parsed.get(key, "")).strip().lower() == str(expected).strip().lower():
                        hits += 1
                score = hits / len(required_fields) * 100 if required_fields else 0.0
                passed = hits == len(required_fields)
            except Exception as exc:  # noqa: BLE001
                error = f"invalid json: {exc}"
        else:
            passed = bool(text)
            score = 100.0 if passed else 0.0

        return self.build_result(
            task=task,
            passed=passed,
            score=round(score, 2),
            response=response,
            output=text,
            error=error,
            metadata={"category": validation.get("category", "general")},
        )


def _extract_json(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end >= start:
        return text[start : end + 1]
    return text


def _avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0
