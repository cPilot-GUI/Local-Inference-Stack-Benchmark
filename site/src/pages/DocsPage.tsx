const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'principles', label: 'Benchmark principles' },
  { id: 'install', label: 'Install CLI' },
  { id: 'backends', label: 'Backends' },
  { id: 'run', label: 'Run a stack test' },
  { id: 'suites', label: 'Suites' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'links', label: 'Links' },
]

export default function DocsPage() {
  return (
    <div>
      <div className="page-kicker">Docs</div>
      <h1>Local Inference Stack Benchmark.</h1>
      <p className="page-subtitle">
        A reproducible way to measure which local model stack works best on real consumer hardware,
        especially when memory is the limiting factor.
      </p>

      <div className="docs-layout" style={{ marginTop: 32 }}>
        <nav className="docs-toc" aria-label="Docs sections">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className="docs-content">
          <section id="overview">
            <h2>Overview</h2>
            <p>
              This benchmark ranks the complete inference stack, not the model in isolation. Every comparable
              row must include the model, quantization, inference engine, hardware, OS, context length, launch
              flags, and the measured speed, memory, stability, and quality-retention results.
            </p>
            <p>
              The public board is designed for setup decisions: which model should I download, which quantization
              should I use, which engine should serve it, and what tradeoffs should I expect on my own machine?
            </p>
          </section>

          <section id="principles">
            <h2>Benchmark principles</h2>
            <ul>
              <li><strong>Full-stack rows</strong>: model-only rankings are not enough for local deployment decisions.</li>
              <li><strong>Memory is first-class</strong>: peak RAM, peak VRAM, OOM rate, and model-density-per-GB are shown beside tok/s.</li>
              <li><strong>Quality must not collapse</strong>: speed and memory wins only count when deterministic sanity tasks still pass.</li>
              <li><strong>Reproducible claims</strong>: every run records the runtime tuple and workload shape, following the same spirit as KTransformers' benchmark guidance.</li>
              <li><strong>Real local backends</strong>: Ollama, llama.cpp, LM Studio, MLX, vLLM, Jan, and any OpenAI-compatible endpoint can be tested.</li>
            </ul>
          </section>

          <section id="install">
            <h2>Install the CLI</h2>
            <pre>{`cd cli
pipx install -e .
benchloop --version`}</pre>
            <p>For development without pipx:</p>
            <pre>{`cd cli
python -m pip install -e .`}</pre>
          </section>

          <section id="backends">
            <h2>Backends</h2>
            <ul>
              <li><strong>Ollama</strong>: <code>--provider ollama --endpoint http://localhost:11434</code></li>
              <li><strong>llama.cpp / llama-server</strong>: <code>--provider openai_compat --endpoint http://127.0.0.1:8080</code></li>
              <li><strong>LM Studio</strong>: <code>--provider openai_compat --endpoint http://localhost:1234</code></li>
              <li><strong>MLX / vLLM / Jan</strong>: use the OpenAI-compatible <code>/v1/chat/completions</code> endpoint.</li>
            </ul>
          </section>

          <section id="run">
            <h2>Run a stack test</h2>
            <pre>{`benchloop run \\
  --model qwen3:14b \\
  --endpoint http://localhost:11434 \\
  --provider ollama \\
  --engine Ollama \\
  --quantization Q4_K_M \\
  --context-length 16384`}</pre>
            <p>
              For low-memory frontier comparisons, run the same model across two or more engines or quantizations
              while keeping hardware, context length, output length, and concurrency aligned.
            </p>
          </section>

          <section id="suites">
            <h2>Suites</h2>
            <ul>
              <li><strong>speed</strong>: TTFT, prefill tok/s, decode tok/s, and end-to-end latency.</li>
              <li><strong>memory</strong>: peak RAM, peak VRAM or unified memory, runtime overhead, KV growth when observable, and failed-load/OOM behavior.</li>
              <li><strong>stability</strong>: repeated success rate, timeout rate, crash/hang rate, and long-run health.</li>
              <li><strong>quality_retention</strong>: deterministic Chinese comprehension, JSON extraction, small coding, math, and retrieval sanity checks.</li>
            </ul>
            <p>
              Agent, tool-call, coding, extraction, and instruction-following suites can still be used for advanced
              model behavior studies, but the default public board keeps the stack benchmark focused.
            </p>
          </section>

          <section id="scoring">
            <h2>Scoring</h2>
            <pre>{`Local Inference Score =
35% Speed
30% Memory Efficiency
20% Stability
15% Quality Retention`}</pre>
            <p>
              The leaderboard also exposes a low-memory frontier score. It rewards running larger models with less
              peak memory while preserving quality, stability, and usable speed. It is a discovery lens, not a
              replacement for the main score.
            </p>
          </section>

          <section id="metadata">
            <h2>Metadata required for comparison</h2>
            <ul>
              <li>Model id, checkpoint source, parameter size, quantization, and context length.</li>
              <li>Engine name and version, provider mode, endpoint type, and launch command.</li>
              <li>CPU SKU, GPU SKU, GPU memory, system memory, OS, and whether the endpoint is local or remote.</li>
              <li>Input tokens, output tokens, concurrency, batch behavior, and whether the metric is prefill, decode, or end-to-end.</li>
              <li>Peak CPU RAM, peak GPU VRAM or unified memory, OOM rate, and stability pass rate.</li>
            </ul>
          </section>

          <section id="privacy">
            <h2>Privacy</h2>
            <p>
              Public submissions should include aggregate scores, hardware summaries, and suite summaries. They should
              exclude local file paths, raw prompts, raw completions, endpoint secrets, API keys, and private machine names
              unless the submitter opts in.
            </p>
            <pre>{`export BENCHLOOP_NO_SUBMIT=1
benchloop run --model qwen3:14b --suites speed,memory,stability,quality_retention`}</pre>
          </section>

          <section id="links">
            <h2>Links</h2>
            <ul>
              <li>Repository: <a href="https://github.com/cPilot-GUI/Local-Inference-Stack-Benchmark" target="_blank" rel="noreferrer">github.com/cPilot-GUI/Local-Inference-Stack-Benchmark</a></li>
              <li>Leaderboard: <a href="/leaderboard">/leaderboard</a></li>
              <li>Methodology: <a href="/methodology">/methodology</a></li>
              <li>License: MIT</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
