from bench_loop.models import (
    BenchmarkRun,
    MemoryMetrics,
    ModelInfo,
    QualityRetentionMetrics,
    SpeedMetrics,
    StabilityMetrics,
    StackInfo,
    SuiteResult,
)


def test_stack_score_uses_local_inference_weights():
    run = BenchmarkRun(
        model=ModelInfo(model_id="qwen3:14b", family="Qwen", parameter_count="14B", quantization="Q4_K_M"),
        stack=StackInfo(
            model_id="qwen3:14b",
            model_family="Qwen",
            parameter_size="14B",
            quantization="Q4_K_M",
            engine="Ollama",
            provider="ollama",
            context_length=16384,
            hardware_class="Mac 32GB",
            os="Darwin",
        ),
        speed_metrics=SpeedMetrics(generation_tok_per_sec=25),
        memory_metrics=MemoryMetrics(peak_ram_gb=12, oom_rate=0),
        stability_metrics=StabilityMetrics(success_rate=90, run_count=10),
        quality_retention_metrics=QualityRetentionMetrics(score=80, task_count=5, pass_count=4),
        suites={
            "speed": SuiteResult(suite="speed", score=70, task_count=3, pass_count=3),
            "memory": SuiteResult(suite="memory", score=80, task_count=2, pass_count=2),
            "stability": SuiteResult(suite="stability", score=90, task_count=1, pass_count=1),
            "quality_retention": SuiteResult(suite="quality_retention", score=80, task_count=5, pass_count=4),
        },
    )

    run.compute_aggregates()

    assert run.is_stack_benchmark is True
    assert run.legacy_model_run is False
    assert run.overall_score == 78.5
    assert run.can_it_run == "Runs with tradeoffs"


def test_legacy_run_keeps_old_quality_speed_reliability_formula():
    run = BenchmarkRun(
        suites={
            "speed": SuiteResult(suite="speed", score=50, task_count=1, pass_count=1),
            "toolcall": SuiteResult(suite="toolcall", score=80, task_count=1, pass_count=1),
        }
    )

    run.compute_aggregates()

    assert run.is_stack_benchmark is False
    assert run.legacy_model_run is True
    assert run.overall_score == 79.0
