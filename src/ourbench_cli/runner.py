from __future__ import annotations

import datetime
import dataclasses
import os
import pathlib
import shlex
import shutil
import subprocess
import tempfile
import time

from .hardware import collect_hardware
from .parser import parse_llama_bench_output


LLAMA_CPP_ROOT = pathlib.Path("/home/fky/llama.cpp")
DEFAULT_BINARY = LLAMA_CPP_ROOT / "build" / "bin" / "llama-bench"
DEFAULT_TOKEN_COUNTS = [512, 1024, 2048, 4096, 8192]
CLK_TCK = os.sysconf(os.sysconf_names["SC_CLK_TCK"])


@dataclasses.dataclass(frozen=True)
class BenchmarkOptions:
    ngl: int = 99
    nkmoe: int = 30
    ncmoe: int = 30
    threads: int = 4
    tmoe: int = 6
    repeats: int = 1
    llmoe: int = 1
    mmp: int = 0
    tokens: tuple[int, ...] = tuple(DEFAULT_TOKEN_COUNTS)

    def base_args(self) -> list[str]:
        return [
            "-ngl", str(self.ngl),
            "-nkmoe", str(self.nkmoe),
            "-ncmoe", str(self.ncmoe),
            "-t", str(self.threads),
            "-tmoe", str(self.tmoe),
            "-r", str(self.repeats),
            "-llmoe", str(self.llmoe),
            "-mmp", str(self.mmp),
        ]


class BenchmarkError(RuntimeError):
    pass


def validate_model(model_path: pathlib.Path) -> pathlib.Path:
    model = model_path.expanduser().resolve()
    if not model.exists():
        raise BenchmarkError(f"model file does not exist: {model}")
    if not model.is_file():
        raise BenchmarkError(f"model path is not a file: {model}")
    if model.suffix.lower() != ".gguf":
        raise BenchmarkError(f"model must be a .gguf file: {model}")
    return model


def resolve_binary(binary_override: pathlib.Path | None = None) -> pathlib.Path:
    candidates: list[pathlib.Path] = []
    if binary_override is not None:
        candidates.append(binary_override.expanduser())

    env_binary = os.environ.get("OURBENCH_LLAMA_BENCH")
    if env_binary:
        candidates.append(pathlib.Path(env_binary).expanduser())

    candidates.append(DEFAULT_BINARY)

    for name in ("our_llama_bench", "llama-bench"):
        found = shutil.which(name)
        if found:
            candidates.append(pathlib.Path(found))

    for candidate in candidates:
        if candidate.exists() and os.access(candidate, os.X_OK):
            return candidate.resolve()

    searched = ", ".join(str(path) for path in candidates)
    raise BenchmarkError(f"could not find executable llama-bench binary; searched: {searched}")


def build_command(binary: pathlib.Path, model: pathlib.Path, token_count: int, options: BenchmarkOptions | None = None) -> list[str]:
    options = options or BenchmarkOptions()
    return [
        str(binary),
        "-m", str(model),
        *options.base_args(),
        "-n", str(token_count),
        "-p", str(token_count),
    ]


def _read_process_cpu_seconds(pid: int) -> float | None:
    try:
        fields = pathlib.Path(f"/proc/{pid}/stat").read_text(encoding="utf-8").split()
    except OSError:
        return None
    if len(fields) < 15:
        return None
    return (int(fields[13]) + int(fields[14])) / CLK_TCK


def _read_process_rss_mb(pid: int) -> float | None:
    try:
        for line in pathlib.Path(f"/proc/{pid}/status").read_text(encoding="utf-8").splitlines():
            if line.startswith("VmRSS:"):
                return int(line.split()[1]) / 1024
    except OSError:
        return None
    return None


def _read_system_memory_used_mb() -> float | None:
    mem_total = None
    mem_available = None
    try:
        for line in pathlib.Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
            if line.startswith("MemTotal:"):
                mem_total = int(line.split()[1])
            elif line.startswith("MemAvailable:"):
                mem_available = int(line.split()[1])
    except OSError:
        return None
    if mem_total is None or mem_available is None:
        return None
    return (mem_total - mem_available) / 1024


def _read_gpu_usage() -> dict[str, float | None]:
    try:
        completed = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=utilization.gpu,memory.used,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return {"gpu_util_percent": None, "gpu_memory_used_mb": None, "gpu_memory_total_mb": None}
    if completed.returncode != 0:
        return {"gpu_util_percent": None, "gpu_memory_used_mb": None, "gpu_memory_total_mb": None}

    util_total = 0.0
    mem_used_total = 0.0
    mem_total_total = 0.0
    count = 0
    for line in completed.stdout.splitlines():
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 3:
            continue
        try:
            util_total += float(parts[0])
            mem_used_total += float(parts[1])
            mem_total_total += float(parts[2])
            count += 1
        except ValueError:
            continue
    if count == 0:
        return {"gpu_util_percent": None, "gpu_memory_used_mb": None, "gpu_memory_total_mb": None}
    return {
        "gpu_util_percent": util_total / count,
        "gpu_memory_used_mb": mem_used_total,
        "gpu_memory_total_mb": mem_total_total,
    }


def _empty_usage() -> dict[str, float | None]:
    return {
        "cpu_peak_percent": None,
        "process_memory_peak_mb": None,
        "system_memory_used_peak_mb": None,
        "gpu_peak_percent": None,
        "gpu_memory_used_peak_mb": None,
        "gpu_memory_total_mb": None,
        "elapsed_seconds": None,
    }


def _sample_usage(pid: int, previous_cpu_seconds: float | None, previous_time: float | None) -> tuple[dict[str, float | None], float | None, float]:
    now = time.monotonic()
    cpu_seconds = _read_process_cpu_seconds(pid)
    usage = _empty_usage()

    if previous_cpu_seconds is not None and previous_time is not None and cpu_seconds is not None:
        elapsed = now - previous_time
        if elapsed > 0:
            usage["cpu_peak_percent"] = max(0.0, (cpu_seconds - previous_cpu_seconds) / elapsed * 100)

    usage["process_memory_peak_mb"] = _read_process_rss_mb(pid)
    usage["system_memory_used_peak_mb"] = _read_system_memory_used_mb()
    gpu = _read_gpu_usage()
    usage["gpu_peak_percent"] = gpu["gpu_util_percent"]
    usage["gpu_memory_used_peak_mb"] = gpu["gpu_memory_used_mb"]
    usage["gpu_memory_total_mb"] = gpu["gpu_memory_total_mb"]
    return usage, cpu_seconds, now


def _merge_usage_peak(current: dict[str, float | None], sample: dict[str, float | None]) -> None:
    for key, value in sample.items():
        if value is None:
            continue
        if current[key] is None or value > current[key]:
            current[key] = value


def _run_command(argv: list[str]) -> tuple[str, dict[str, float | None]]:
    with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as stdout_file:
        with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as stderr_file:
            proc = subprocess.Popen(
                argv,
                cwd=LLAMA_CPP_ROOT,
                stdout=stdout_file,
                stderr=stderr_file,
                text=True,
            )
            started_at = time.monotonic()
            usage = _empty_usage()
            previous_cpu_seconds = _read_process_cpu_seconds(proc.pid)
            previous_time = time.monotonic()

            while proc.poll() is None:
                sample, previous_cpu_seconds, previous_time = _sample_usage(proc.pid, previous_cpu_seconds, previous_time)
                _merge_usage_peak(usage, sample)
                time.sleep(0.25)

            final_sample, _, _ = _sample_usage(proc.pid, previous_cpu_seconds, previous_time)
            _merge_usage_peak(usage, final_sample)
            usage["elapsed_seconds"] = time.monotonic() - started_at

            stdout_file.seek(0)
            stderr_file.seek(0)
            output = stdout_file.read() + stderr_file.read()

            if proc.returncode != 0:
                command = shlex.join(argv)
                raise BenchmarkError(f"benchmark command failed with exit code {proc.returncode}: {command}\n{output}")
            return output, usage


def _run_command_output_only(argv: list[str]) -> str:
    completed = subprocess.run(
        argv,
        cwd=LLAMA_CPP_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    output = completed.stdout + completed.stderr
    if completed.returncode != 0:
        command = shlex.join(argv)
        raise BenchmarkError(f"benchmark command failed with exit code {completed.returncode}: {command}\n{output}")
    return output


def _empty_metrics(tokens: tuple[int, ...]) -> dict[str, dict[str, float | None]]:
    return {
        "prefill": {str(token): None for token in tokens},
        "decode": {str(token): None for token in tokens},
    }


def _empty_usage_by_token(tokens: tuple[int, ...]) -> dict[str, dict[str, float | None]]:
    return {str(token): _empty_usage() for token in tokens}


def _timestamp() -> str:
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def run_benchmark(
    model_path: pathlib.Path,
    binary_override: pathlib.Path | None = None,
    print_commands: bool = False,
    options: BenchmarkOptions | None = None,
) -> dict[str, object]:
    options = options or BenchmarkOptions()
    model = validate_model(model_path)
    binary = resolve_binary(binary_override)
    metrics = _empty_metrics(options.tokens)
    usage_by_token = _empty_usage_by_token(options.tokens)

    for token_count in options.tokens:
        command = build_command(binary, model, token_count, options)
        if print_commands:
            print(shlex.join(command))
            continue

        output, usage = _run_command(command)
        parsed = parse_llama_bench_output(output, token_count)
        if parsed["prefill"] is None or parsed["decode"] is None:
            raise BenchmarkError(f"could not parse prefill/decode metrics for token count {token_count}")
        metrics["prefill"][str(token_count)] = parsed["prefill"]
        metrics["decode"][str(token_count)] = parsed["decode"]
        usage_by_token[str(token_count)] = usage

    return {
        "model": str(model),
        "backend": "llama.cpp",
        "config": {
            "ngl": options.ngl,
            "nkmoe": options.nkmoe,
            "ncmoe": options.ncmoe,
            "threads": options.threads,
            "tmoe": options.tmoe,
            "repeats": options.repeats,
            "llmoe": options.llmoe,
            "mmp": options.mmp,
            "tokens": list(options.tokens),
        },
        "hardware": collect_hardware(),
        "metrics": metrics,
        "usage": usage_by_token,
        "timestamp": _timestamp(),
    }
