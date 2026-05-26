# ourbench-cli

Lightweight cPilot-GUI CLI wrapper for the company llama.cpp benchmark binary.

## Install

```bash
pipx install /home/fky/our_bench
```

## Run

```bash
ourbench run --model /path/to/model.gguf
```

The model path is the only required input. The wrapper runs the default
cPilot-GUI benchmark profile against `/home/fky/llama.cpp/build/bin/llama-bench`
and prints JSON with hardware and prefill/decode metrics for token lengths
512, 1024, 2048, 4096, and 8192.

Default benchmark arguments:

```text
-ngl 99 -nkmoe 30 -ncmoe 30 -t 4 -tmoe 6 -r 1 -llmoe 1 -mmp 0
```

For each token length, the wrapper adds `-n <tokens> -p <tokens>`.

Optional overrides keep the same llama-bench names:

```bash
ourbench run --model /path/to/model.gguf --tokens 512,1024 -ngl 0 -t 8 -tmoe 9 -r 2
```

The JSON result includes `usage` for each token input:

- `cpu_peak_percent`
- `process_memory_peak_mb`
- `system_memory_used_peak_mb`
- `gpu_peak_percent`
- `gpu_memory_used_peak_mb`
- `gpu_memory_total_mb`
- `elapsed_seconds`

## MVP Web Demo

Open the static demo page:

```bash
/home/fky/our_bench/web/index.html
```

Paste the JSON printed by `ourbench run`, click Submit, and the page will show
the latest submission, metric table, hardware summary, and local submission
history. This MVP is frontend-only; submit is a local demo action and does not
upload to a server yet.
