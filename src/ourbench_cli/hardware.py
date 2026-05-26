from __future__ import annotations

import collections
import re
import subprocess


def _run_text(argv: list[str]) -> str:
    try:
        completed = subprocess.run(argv, capture_output=True, text=True, check=False)
    except FileNotFoundError:
        return ""
    if completed.returncode != 0:
        return ""
    return completed.stdout.strip()


def _summarize_counts(values: list[str]) -> str:
    counts = collections.Counter(value for value in values if value)
    if not counts:
        return "unknown"
    return ", ".join(f"{count}x {name}" for name, count in counts.items())


def detect_gpu() -> str:
    text = _run_text(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"])
    if not text:
        return "unknown"

    gpus: list[str] = []
    for line in text.splitlines():
        parts = [part.strip() for part in line.split(",")]
        if len(parts) < 2:
            continue
        name, memory_mib = parts[0], parts[1]
        try:
            gpus.append(f"{name} {round(int(memory_mib) / 1024)}GB")
        except ValueError:
            gpus.append(name)
    return _summarize_counts(gpus)


def detect_cpu() -> str:
    text = _run_text(["lscpu"])
    if not text:
        return "unknown"

    model_name = ""
    sockets = 1
    for line in text.splitlines():
        if line.startswith("Model name:"):
            model_name = line.split(":", 1)[1].strip()
        elif line.startswith("Socket(s):"):
            try:
                sockets = int(line.split(":", 1)[1].strip())
            except ValueError:
                sockets = 1
    if not model_name:
        return "unknown"
    return f"{sockets}x {model_name}"


def detect_memory() -> str:
    text = _run_text(["free", "-h"])
    for line in text.splitlines():
        if line.startswith("Mem:"):
            parts = line.split()
            if len(parts) >= 2:
                return parts[1]
    return "unknown"


def detect_pcie() -> str:
    text = _run_text(["lspci", "-vv"])
    speeds = [float(match) for match in re.findall(r"LnkCap:.*?Speed\s+([0-9.]+)GT/s", text)]
    if not speeds:
        return "unknown"
    max_speed = max(speeds)
    if max_speed >= 32:
        return "PCIe 5.0"
    if max_speed >= 16:
        return "PCIe 4.0"
    if max_speed >= 8:
        return "PCIe 3.0"
    if max_speed >= 5:
        return "PCIe 2.0"
    return "PCIe 1.0"


def collect_hardware() -> dict[str, str]:
    return {
        "gpu": detect_gpu(),
        "cpu": detect_cpu(),
        "memory": detect_memory(),
        "pcie": detect_pcie(),
    }
