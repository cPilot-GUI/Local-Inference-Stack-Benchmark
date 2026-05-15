# Local Inference Stack Benchmark

Find the best way to run open models locally.

This repository contains the first-stage **Local Inference Stack Benchmark** implementation:

```text
Model × Quantization × Inference Engine × Hardware × OS × Runtime Config
```

It does not rank agent behavior, cloud APIs, or model intelligence in isolation. It ranks whether a full local stack is fast, memory-efficient, stable, and still producing sane output.

## Repository Layout

| Path | Purpose |
|---|---|
| `cli/` | BenchLoop CLI, runner, stack schema, scoring, suites, submission/export logic |
| `site/` | React/Vite public benchmark site and stack leaderboard |
| `docs/` | Submission contract and product/spec notes |

## Score

```text
Local Inference Score =
35% Speed
30% Memory Efficiency
20% Stability
15% Quality Retention
```

The leaderboard also exposes raw metrics: TTFT, prefill tok/s, decode tok/s, peak RAM/VRAM, OOM rate, stability success rate, quality retention, and `Can it run?`.

## Run The CLI

```bash
cd cli
pipx install -e .

benchloop run \
  --model qwen3:14b \
  --endpoint http://localhost:11434 \
  --provider ollama \
  --engine Ollama \
  --quantization Q4_K_M \
  --context-length 16384
```

Default suites are:

```text
speed,memory,stability,quality_retention
```

Advanced harness and agent-loop suites are still available, but they are treated as legacy/advanced runs and hidden from the main stack leaderboard by default.

## Run The Site

```bash
cd site
npm install
npm run dev
```

Open `http://127.0.0.1:5181/`.

Production build:

```bash
npm run build
```

## Public Pages

| Path | Purpose |
|---|---|
| `/` | First-screen stack benchmark summary |
| `/leaderboard` | Local Inference Stack Leaderboard |
| `/engines` | Best local inference engines |
| `/models/:model` | Model-specific recommendations |
| `/hardware/:hardware` | Hardware-specific recommendations |
| `/methodology` | Scoring, privacy, and schema |
| `/submit` | CLI submission instructions |

## Status

This is the initial implementation for the cPilot-GUI Local Inference Stack Benchmark repository. The included seed leaderboard data is preview data; official controlled hardware runs should replace it as soon as the seed benchmark campaign starts.
