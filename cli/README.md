# BenchLoop

<p align="center">
  <img src="https://raw.githubusercontent.com/outsourc-e/bench-loop-web/main/site/public/og-image.png" alt="BenchLoop" width="640" />
</p>

<p align="center">
  <a href="https://bench-loop.com"><img src="https://img.shields.io/badge/site-bench--loop.com-2dd47f?style=flat-square" alt="site" /></a>
  <a href="https://pypi.org/project/benchloop-cli/"><img src="https://img.shields.io/pypi/v/benchloop-cli?style=flat-square&color=2dd47f" alt="pypi" /></a>  <a href="https://github.com/outsourc-e/bench-loop/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-2dd47f?style=flat-square" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/status-beta-eab308?style=flat-square" alt="beta" />
</p>

**The benchmark for local inference stacks.**

BenchLoop helps developers find the best way to run open models locally. It does not rank a model in isolation. It ranks the full stack:

```text
Model × Quantization × Inference Engine × Hardware × OS × Runtime Config
```

The first public leaderboard focuses on four dimensions that decide whether a local setup is actually usable: speed, memory efficiency, stability, and quality retention.

No accounts, no telemetry, no API keys. Your model, your machine, your numbers.

```
$ benchloop run --model qwen3:14b --engine Ollama --quantization Q4_K_M
... 1K/4K/16K speed, memory probe, 10-run stability, quality-retention checks ...

Local Score  80.9
Speed        78.0
Memory       80.5
Stability    94.0
Quality Ret. 86.5
Can it run?  Runs with tradeoffs
```

Published runs live at <https://bench-loop.com/leaderboard>. Every completed local benchmark auto-publishes there.
## Why

Hosted LLM leaderboards answer *"which model wins on a server farm someone else paid for?"* BenchLoop answers *"same model, same machine: which engine and quantization actually runs best locally?"*

It is repeatable on purpose: every run persists to disk, the task set is frozen, the scorer is deterministic, and the stack tuple is explicit. If you say "Qwen3-14B Q4_K_M on Ollama scored 80.9 on a 32GB Mac", anyone can install BenchLoop and verify it.

BenchLoop is intentionally not an Agent benchmark, cloud API benchmark, or pure model intelligence leaderboard. Advanced harness and agent-loop suites still exist, but the main board is the local inference stack leaderboard.

## Install

### pipx (recommended)

```bash
pipx install benchloop-cli
benchloop --version
```

> The PyPI distribution is named `benchloop-cli` (the bare `benchloop` name was taken by an unrelated dataset library). The installed commands are still `benchloop` and `bench-loop`.

### pip

```bash
pip install benchloop-cli
```

### From source

```bash
git clone https://github.com/outsourc-e/bench-loop
cd bench-loop
pip install -e .
```

## Run your first benchmark

Make sure you have a local LLM endpoint running. Anything OpenAI-compatible or Ollama-flavored works:

- Ollama at `http://localhost:11434` (default)
- LM Studio at `http://localhost:1234` (`--provider openai_compat`)
- MLX / Osaurus at `http://localhost:8000` (`--provider openai_compat`)
- vLLM, Jan, llama-server, etc.

Then:

```bash
benchloop run \
  --model qwen3:14b \
  --endpoint http://localhost:11434 \
  --provider ollama \
  --engine Ollama \
  --quantization Q4_K_M \
  --context-length 16384
```

This runs the default stack suites, scores them, prints a console report, and persists the full run to `~/.bench-loop/runs/`.

### Run a subset

```bash
benchloop run --model qwen3:14b --suites speed,memory
```

### Scoring

```text
Local Inference Score =
35% Speed
30% Memory Efficiency
20% Stability
15% Quality Retention
```

The leaderboard also exposes raw metrics: TTFT, prefill tok/s, decode tok/s, peak memory, OOM rate, stability success rate, and a `Can it run?` label.

### Advanced prompting harnesses

Harnesses remain available for tool-calling and agent-loop research, but they are no longer the default public leaderboard surface:

```bash
benchloop run --model qwen3:8b --harness raw      # native tool calling
benchloop run --model qwen3:8b --harness hermes   # <tool_call>{...}</tool_call>
benchloop run --model qwen3:8b --harness qwen     # <function_call>{...}</function_call>
benchloop run --model qwen3:8b --harness pi       # <think>...</think> + Hermes tags
```

### Stamp custom hardware (e.g. when benchmarking through a tunnel)

```bash
benchloop run \
  --model qwen3:8b \
  --endpoint http://localhost:11435 \
  --hardware "NVIDIA RTX 4090 24GB" \
  --gpu "NVIDIA RTX 4090" \
  --gpu-memory-gb 24
```

### Launch the local dashboard

v0.2.0+ ships the full FastAPI + React dashboard inside the wheel. After `pipx install benchloop-cli`:

```bash
benchloop dashboard
# → open http://127.0.0.1:8877
```

Need it to survive browser/terminal churn? Print a service template instead of keeping the dashboard tied to one shell:

```bash
benchloop dashboard --service-template launchd
benchloop dashboard --service-template systemd
benchloop dashboard --service-template windows-task
```

This serves the Models, Benchmark, Leaderboard, Compare, and Chat tabs on a single port, with auto-discovered local providers (Ollama, LM Studio, MLX/Osaurus, vLLM, Jan).

For hot-reload development against a clone of [`bench-loop-web`](https://github.com/outsourc-e/bench-loop-web):

```bash
benchloop dashboard --dev
```

## Suites

| Suite | What it scores |
|---|---|
| `speed` | Latency, throughput, TTFT, generation tok/s across short/medium/long contexts |
| `toolcall` | Structured tool-call correctness across realistic tasks (weather, stocks, email, search) |
| `coding` | Executable Python tasks verified in a sandboxed subprocess (10s timeout) |
| `dataextract` | JSON / structured extraction from messy natural language |
| `instructfollow` | Constraint following, formatting, exactness |
| `reasonmath` | Small reasoning + math tasks with deterministic checks |
| `agent` | **Multi-turn agentic tool use.** BenchLoop drives a real loop: model emits a tool call, BenchLoop executes it locally, feeds the result back, model iterates until done. Scores correctness, efficiency, no-hallucination, required-tool coverage. |

## Scoring

```
Overall = 0.55 · quality + 0.20 · speed + 0.25 · reliability
```

- **Quality** = mean of non-speed suite scores (size-fair).
- **Speed** = `12.54 · log2(tok/s) + 0.9`, clamped to 0–100.
- **Reliability** = pass rate across all tasks.
- **Agent** = `correct_final + efficient + no_hallucinated_tools + all_required_called`, 25 pts each, averaged across tasks.

## Local web app

A FastAPI backend + React frontend bundle ships alongside the CLI for visualizing runs:

```bash
benchloop dashboard   # starts the local web app on :5180
```

Tabs: Models, Benchmark, Leaderboard, Compare runs, Chat, agent trace viewer.

## Publish a run

Every completed benchmark auto-publishes to <https://bench-loop.com/leaderboard> via `https://api.bench-loop.com/submit`. Runs are deduped by `(machine_id, run_id)` so the same run from the same machine won't be double-counted.

Opt out:

```bash
export BENCHLOOP_NO_SUBMIT=1
```

You can still manually export a snapshot for sharing / archiving:

```bash
benchloop export --output my-runs.json
```

## Architecture

```
bench-loop/                    ← this repo, the CLI + suites + scorers
  bench_loop/
    cli.py                     ← `benchloop` entrypoint
    suites/                    ← speed, toolcall, coding, agent, ...
    harness.py                 ← raw / hermes / qwen / pi adapters
    providers/                 ← ollama, openai_compat
    runner/orchestrator.py     ← drives suites + harnesses
    tasks/                     ← frozen task YAML fixtures
bench-loop-web/                ← the web app (separate repo)
  api/                         ← FastAPI wrapper around bench_loop
  ui/                          ← local dashboard
  site/                        ← public bench-loop.com static site
```

## Status

BenchLoop is **v0.1 beta**. The benchmark surface, scoring, web app, agent loop, and four harnesses all work end-to-end. Stuff still on the roadmap:

- Streaming TTFT for OpenAI-compatible providers (currently 0 on those backends — ollama TTFT is fine)
- Bigger task fixtures (each suite is intentionally small and frozen for v1)
- Hosted submission flow for community runs
- More provider adapters (TGI, Bedrock, etc. if there's demand)

## License

MIT. See `LICENSE`.
