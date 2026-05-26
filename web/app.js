const submissions = [];

const sampleResult = {
  model: "/home/fky/Qwen3.5-35B-A3B-Q4_K_M.gguf",
  backend: "llama.cpp",
  config: {
    ngl: 99,
    nkmoe: 30,
    ncmoe: 30,
    threads: 4,
    tmoe: 6,
    repeats: 1,
    llmoe: 1,
    mmp: 0,
    tokens: [128, 256, 512, 1024]
  },
  hardware: {
    gpu: "4x Tesla V100-SXM2-16GB 16GB",
    cpu: "1x Intel(R) Xeon(R) CPU @ 2.30GHz",
    memory: "94Gi",
    pcie: "unknown"
  },
  metrics: {
    prefill: {
      "128": 1880.2,
      "256": 1642.7,
      "512": 1234.5,
      "1024": 1098.9
    },
    decode: {
      "128": 724.4,
      "256": 652.1,
      "512": 567.8,
      "1024": 521.3
    }
  },
  usage: {
    "128": {
      cpu_peak_percent: 372.4,
      process_memory_peak_mb: 14222.1,
      system_memory_used_peak_mb: 18400.8,
      gpu_peak_percent: 19.5,
      gpu_memory_used_peak_mb: 8120,
      gpu_memory_total_mb: 65536,
      elapsed_seconds: 25.1
    },
    "256": {
      cpu_peak_percent: 390.8,
      process_memory_peak_mb: 14880.2,
      system_memory_used_peak_mb: 19012.4,
      gpu_peak_percent: 22.2,
      gpu_memory_used_peak_mb: 8750,
      gpu_memory_total_mb: 65536,
      elapsed_seconds: 32.4
    },
    "512": {
      cpu_peak_percent: 404.8,
      process_memory_peak_mb: 15371.9,
      system_memory_used_peak_mb: 19763.7,
      gpu_peak_percent: 25.5,
      gpu_memory_used_peak_mb: 9316,
      gpu_memory_total_mb: 65536,
      elapsed_seconds: 41.2
    },
    "1024": {
      cpu_peak_percent: 411.6,
      process_memory_peak_mb: 16102.7,
      system_memory_used_peak_mb: 20551.3,
      gpu_peak_percent: 28.1,
      gpu_memory_used_peak_mb: 10022,
      gpu_memory_total_mb: 65536,
      elapsed_seconds: 58.7
    }
  },
  timestamp: "2026-05-18T12:00:00Z"
};

const jsonInput = document.getElementById("jsonInput");
const message = document.getElementById("message");
const statusPill = document.getElementById("statusPill");
const submissionCount = document.getElementById("submissionCount");
const bestPrefill = document.getElementById("bestPrefill");
const bestDecode = document.getElementById("bestDecode");
const backendName = document.getElementById("backendName");
const details = document.getElementById("details");
const metricsBody = document.getElementById("metricsBody");
const history = document.getElementById("history");

document.getElementById("loadSampleButton").addEventListener("click", () => {
  jsonInput.value = JSON.stringify(sampleResult, null, 2);
  setMessage("Sample loaded.");
});

document.getElementById("submitButton").addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    validateSubmission(parsed);
    submissions.unshift(parsed);
    render();
    setMessage("Submitted locally. This MVP does not upload to a server.");
  } catch (error) {
    setMessage(error.message, true);
  }
});

function validateSubmission(data) {
  if (!data || typeof data !== "object") {
    throw new Error("JSON must be an object.");
  }
  if (!data.model) {
    throw new Error("Missing model.");
  }
  if (!data.metrics || !data.metrics.prefill || !data.metrics.decode) {
    throw new Error("Missing metrics.prefill or metrics.decode.");
  }
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
  statusPill.textContent = isError ? "needs fix" : "local demo";
}

function render() {
  const latest = submissions[0];
  submissionCount.textContent = String(submissions.length);
  bestPrefill.textContent = formatThroughput(maxMetric("prefill"));
  bestDecode.textContent = formatThroughput(maxMetric("decode"));
  backendName.textContent = latest?.backend || "-";

  renderDetails(latest);
  renderMetrics(latest);
  renderHistory();
}

function renderDetails(result) {
  if (!result) {
    details.innerHTML = "";
    return;
  }

  const hardware = result.hardware || {};
  const config = result.config || {};
  const rows = [
    ["Model", result.model],
    ["Timestamp", result.timestamp || "-"],
    ["GPU", hardware.gpu || "-"],
    ["CPU", hardware.cpu || "-"],
    ["Memory", hardware.memory || "-"],
    ["PCIe", hardware.pcie || "-"],
    ["Config", formatConfig(config)]
  ];

  details.innerHTML = rows.map(([label, value]) => `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(String(value || "-"))}</dd>
    </div>
  `).join("");
}

function renderMetrics(result) {
  if (!result) {
    metricsBody.innerHTML = '<tr><td colspan="6" class="empty">No submissions yet</td></tr>';
    return;
  }

  const tokens = collectTokens(result);
  metricsBody.innerHTML = tokens.map((token) => {
    const usage = result.usage?.[token] || {};
    return `
      <tr>
        <td>${escapeHtml(token)}</td>
        <td>${formatNumber(result.metrics?.prefill?.[token])}</td>
        <td>${formatNumber(result.metrics?.decode?.[token])}</td>
        <td>${formatNumber(usage.gpu_memory_used_peak_mb)}</td>
        <td>${formatPercent(usage.cpu_peak_percent)}</td>
        <td>${formatSeconds(usage.elapsed_seconds)}</td>
      </tr>
    `;
  }).join("");
}

function renderHistory() {
  if (submissions.length === 0) {
    history.className = "history empty";
    history.textContent = "Submitted results will appear here.";
    return;
  }

  history.className = "history";
  history.innerHTML = submissions.map((item, index) => {
    const tokens = collectTokens(item).join(", ");
    return `
      <div class="history-item">
        <strong>${escapeHtml(shortModelName(item.model))}</strong>
        <span>${escapeHtml(tokens)} tokens</span>
        <span>#${submissions.length - index}</span>
      </div>
    `;
  }).join("");
}

function maxMetric(kind) {
  return submissions.reduce((best, item) => {
    const values = Object.values(item.metrics?.[kind] || {}).filter((value) => typeof value === "number");
    const itemBest = values.length ? Math.max(...values) : null;
    return itemBest === null ? best : Math.max(best ?? itemBest, itemBest);
  }, null);
}

function collectTokens(result) {
  const fromConfig = result.config?.tokens || [];
  const fromMetrics = Object.keys(result.metrics?.prefill || {});
  return Array.from(new Set([...fromConfig.map(String), ...fromMetrics])).sort((a, b) => Number(a) - Number(b));
}

function formatConfig(config) {
  if (!config || Object.keys(config).length === 0) {
    return "-";
  }
  return [
    `ngl=${config.ngl ?? "-"}`,
    `threads=${config.threads ?? "-"}`,
    `tmoe=${config.tmoe ?? "-"}`,
    `r=${config.repeats ?? "-"}`,
    `tokens=${(config.tokens || []).join(",") || "-"}`
  ].join("  ");
}

function shortModelName(path) {
  return String(path || "-").split("/").filter(Boolean).pop() || path || "-";
}

function formatThroughput(value) {
  return value === null || value === undefined ? "-" : `${formatNumber(value)} t/s`;
}

function formatNumber(value) {
  return typeof value === "number" ? value.toFixed(1) : "-";
}

function formatPercent(value) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "-";
}

function formatSeconds(value) {
  return typeof value === "number" ? `${value.toFixed(1)}s` : "-";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
