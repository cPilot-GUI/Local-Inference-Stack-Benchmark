export default function MethodologyPage() {
  return (
    <div className="docs-page">
      <aside className="docs-toc">
        <a href="#score">Score</a>
        <a href="#metrics">Metrics</a>
        <a href="#stack">Stack schema</a>
        <a href="#privacy">Privacy</a>
        <a href="#legacy">Legacy runs</a>
      </aside>
      <article className="docs-content">
        <h1>Methodology</h1>
        <p>
          BenchLoop ranks complete local inference stacks. A comparable row must identify model,
          quantization, engine, hardware, OS, context length, and runtime configuration.
        </p>
        <section id="score">
          <h2>Local Inference Score</h2>
          <pre>{`Local Inference Score =
35% Speed
30% Memory Efficiency
20% Stability
15% Quality Retention`}</pre>
          <p>Raw metrics stay visible beside the aggregate score so users can sort by their own constraint.</p>
        </section>
        <section id="metrics">
          <h2>Metrics</h2>
          <ul>
            <li><strong>Speed</strong>: TTFT, prefill tok/s, decode tok/s, end-to-end latency across 1K, 4K, and 16K context. 32K is marked as stress data.</li>
            <li><strong>Memory</strong>: peak RAM, peak VRAM or unified memory, runtime overhead, KV growth when observable, and OOM rate.</li>
            <li><strong>Stability</strong>: repeated success rate, load failures, timeouts, hangs, crashes, and memory leak trend when observable.</li>
            <li><strong>Quality retention</strong>: deterministic sanity tasks for Chinese comprehension, JSON formatting, small code, math, and retrieval.</li>
          </ul>
        </section>
        <section id="stack">
          <h2>Stack schema</h2>
          <pre>{`{
  "model_id": "Qwen3-14B",
  "quantization": "Q4_K_M",
  "engine": "Ollama",
  "provider": "ollama",
  "hardware_class": "Mac 16GB",
  "context_length": 16384
}`}</pre>
        </section>
        <section id="privacy">
          <h2>Privacy</h2>
          <p>
            Public submissions include hardware summary, score aggregates, suite summaries, and optional profile fields.
            They exclude local file paths, raw prompts, raw completions, endpoint secrets, and API keys by default.
          </p>
        </section>
        <section id="legacy">
          <h2>Legacy and advanced runs</h2>
          <p>
            Earlier model/harness and agent-loop runs remain loadable for advanced analysis, but they are marked as legacy
            and hidden from the default stack leaderboard.
          </p>
        </section>
      </article>
    </div>
  )
}
