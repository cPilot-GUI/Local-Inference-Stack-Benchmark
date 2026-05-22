import { Link } from 'react-router-dom'

export default function SubmitPage() {
  return (
    <div className="narrow-page">
      <h1>Submit a local stack run</h1>
      <p className="page-subtitle">
        Run the benchmark against a local model endpoint. Completed stack benchmarks can publish aggregate results to the public board unless you opt out.
      </p>
      <div className="card command-card">
        <pre>{`pipx install benchloop-cli

benchloop run \\
  --model qwen3:14b \\
  --endpoint http://localhost:11434 \\
  --provider ollama \\
  --engine Ollama \\
  --quantization Q4_K_M \\
  --context-length 16384`}</pre>
      </div>
      <div className="stack-bands">
        <Info title="Compare full stacks" body="Keep model, quantization, context length, output length, and concurrency aligned before comparing engines or launch flags." />
        <Info title="Stamp remote hardware" body="Use --hardware, --gpu, --gpu-memory-gb, and --system-memory-gb when benchmarking through tunnels or remote endpoints." />
        <Info title="Opt out any time" body="Set BENCHLOOP_NO_SUBMIT=1 to keep a run local while still writing run.json under ~/.bench-loop/runs/." />
      </div>
      <div className="hero-actions">
        <Link to="/methodology" className="btn btn-secondary">Read methodology</Link>
        <a href="https://github.com/cPilot-GUI/Local-Inference-Stack-Benchmark" target="_blank" rel="noreferrer" className="btn btn-primary">GitHub</a>
      </div>
    </div>
  )
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div className="info-band">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}
