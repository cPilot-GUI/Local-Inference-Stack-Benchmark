# BenchLoop Submission Contract

Schema version: `benchloop.submission.v2`

## Goal

Define the canonical payload that a local BenchLoop run can submit to a future hosted leaderboard without backend guesswork.

## Top-level shape

```json
{
  "schemaVersion": "benchloop.submission.v1",
  "submittedAt": "2026-04-15T23:00:00Z",
  "run": {
    "id": "20260415-225901-qwen2.5-7b-local-ollama",
    "timestamp": "2026-04-15T22:59:01Z",
    "provider": "ollama",
    "harness": "raw",
    "harnessVersion": "1.0.0",
    "stack": {
      "model_id": "qwen2.5:7b",
      "model_family": "Qwen",
      "parameter_size": "7B",
      "quantization": "Q4_K_M",
      "engine": "Ollama",
      "engine_version": "0.6.0",
      "provider": "ollama",
      "runtime_config": {
        "harness": "raw",
        "suites": ["speed", "memory", "stability", "quality_retention"]
      },
      "context_length": 16384,
      "hardware_class": "Mac 16GB",
      "os": "Darwin"
    },
    "model": {
      "model_id": "qwen2.5:7b"
    },
    "machine": {
      "machine_id": "0x1234abcd",
      "cpu": "Apple M3 Max",
      "gpu": "Apple M3 Max",
      "gpu_memory_gb": 48,
      "system_memory_gb": 64,
      "os": "Darwin",
      "backend": "ollama"
    },
    "scores": {
      "localInference": 82.4,
      "qualityRetention": 79.2,
      "speed": 88.1,
      "memory": 81.0,
      "reliability": 96.0,
      "value": 67.3
    },
    "speedMetrics": {
      "ttft_ms": 243.1,
      "prompt_eval_tok_per_sec": 812.2,
      "generation_tok_per_sec": 61.8,
      "total_latency_ms": 1930.5
    },
    "memoryMetrics": {
      "peak_ram_gb": 12.4,
      "peak_vram_gb": 0,
      "runtime_overhead_gb": 1.2,
      "oom_rate": 0
    },
    "stabilityMetrics": {
      "success_rate": 100,
      "run_count": 10,
      "api_timeout_rate": 0
    },
    "qualityRetentionMetrics": {
      "score": 79.2,
      "task_count": 5,
      "pass_count": 4
    },
    "canItRun": "Runs smoothly",
    "runtimeSec": 64.2,
    "suites": [
      {
        "suite": "toolcall",
        "score": 84.0,
        "taskCount": 12,
        "passCount": 10,
        "failCount": 2,
        "medianLatencyMs": 1440.2
      }
    ]
  },
  "privacy": {
    "includesHardware": true,
    "includesPrompts": false,
    "includesRawOutputs": false,
    "includesLocalPaths": false,
    "note": "Submission preview excludes local filesystem paths, raw prompts, and raw model outputs."
  }
}
```

## Included

- model id
- provider
- stack tuple: model, quantization, engine, runtime config, context length, hardware class
- harness + harness version for advanced/legacy suites
- machine hardware summary
- top-level score summary
- speed, memory, stability, and quality-retention metrics
- per-suite aggregate metrics
- total runtime

## Excluded by default

- local filesystem paths
- raw prompts
- raw completions / outputs
- task-by-task raw transcripts
- endpoint secrets / API keys

## Versioning policy

- breaking payload changes must bump `schemaVersion`
- additive fields may be introduced within the same major version if old consumers can ignore them
- hosted backend should reject unknown future major versions explicitly

## Why this shape

This is enough to:

- rank local inference stack runs on a hosted leaderboard
- group by model + quantization + engine + hardware + context length
- preserve privacy by default
- keep the hosted backend decoupled from local implementation details
