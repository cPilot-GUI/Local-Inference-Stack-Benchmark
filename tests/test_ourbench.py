from __future__ import annotations

import pathlib
import sys
import tempfile
import unittest
from unittest import mock

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from ourbench_cli import hardware, runner
from ourbench_cli.parser import parse_llama_bench_output


SAMPLE_OUTPUT = """
| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads | mmap | llmoe |  tmoe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | ---: | ----: | ----: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  14.30 GiB |    25.27 B | CUDA       |   0 |         30 |       4 |    0 |     1 |     6 |           pp512 |       1234.50 ± 0.42 |
| qwen35moe 35B.A3B Q4_K - Medium |  14.30 GiB |    25.27 B | CUDA       |   0 |         30 |       4 |    0 |     1 |     6 |           tg512 |        567.80 ± 0.03 |
"""


class ParserTests(unittest.TestCase):
    def test_parse_llama_bench_output_extracts_prefill_and_decode(self) -> None:
        metrics = parse_llama_bench_output(SAMPLE_OUTPUT, 512)

        self.assertEqual(metrics["prefill"], 1234.5)
        self.assertEqual(metrics["decode"], 567.8)


class RunnerTests(unittest.TestCase):
    def test_build_command_uses_company_defaults(self) -> None:
        command = runner.build_command(
            pathlib.Path("/home/fky/llama.cpp/build/bin/llama-bench"),
            pathlib.Path("/tmp/model.gguf"),
            512,
        )

        self.assertEqual(command[0], "/home/fky/llama.cpp/build/bin/llama-bench")
        self.assertIn("-nkmoe", command)
        self.assertIn("30", command)
        self.assertEqual(command[-4:], ["-n", "512", "-p", "512"])

    def test_build_command_accepts_custom_options(self) -> None:
        command = runner.build_command(
            pathlib.Path("/home/fky/llama.cpp/build/bin/llama-bench"),
            pathlib.Path("/tmp/model.gguf"),
            1024,
            runner.BenchmarkOptions(ngl=0, nkmoe=12, ncmoe=13, threads=8, tmoe=9, repeats=2, llmoe=0, mmp=1),
        )

        self.assertIn("-ngl", command)
        self.assertEqual(command[command.index("-ngl") + 1], "0")
        self.assertEqual(command[command.index("-nkmoe") + 1], "12")
        self.assertEqual(command[command.index("-ncmoe") + 1], "13")
        self.assertEqual(command[command.index("-t") + 1], "8")
        self.assertEqual(command[command.index("-tmoe") + 1], "9")
        self.assertEqual(command[command.index("-r") + 1], "2")
        self.assertEqual(command[command.index("-llmoe") + 1], "0")
        self.assertEqual(command[command.index("-mmp") + 1], "1")

    def test_run_benchmark_returns_json_shape(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            model = pathlib.Path(tmpdir) / "model.gguf"
            binary = pathlib.Path(tmpdir) / "llama-bench"
            model.write_text("gguf", encoding="utf-8")
            binary.write_text("#!/bin/sh\n", encoding="utf-8")
            binary.chmod(0o755)

            def fake_run(argv: list[str]) -> str:
                token_count = int(argv[-1])
                output = SAMPLE_OUTPUT.replace("pp512", f"pp{token_count}").replace("tg512", f"tg{token_count}")
                usage = {
                    "cpu_peak_percent": 100.0,
                    "process_memory_peak_mb": 512.0,
                    "system_memory_used_peak_mb": 4096.0,
                    "gpu_peak_percent": 90.0,
                    "gpu_memory_used_peak_mb": 1024.0,
                    "gpu_memory_total_mb": 24576.0,
                    "elapsed_seconds": 1.25,
                }
                return output, usage

            with mock.patch("ourbench_cli.runner._run_command", side_effect=fake_run):
                with mock.patch("ourbench_cli.runner.collect_hardware", return_value={"gpu": "unknown", "cpu": "unknown", "memory": "unknown", "pcie": "unknown"}):
                    result = runner.run_benchmark(model, binary_override=binary)

        self.assertEqual(result["backend"], "llama.cpp")
        self.assertEqual(result["metrics"]["prefill"]["512"], 1234.5)
        self.assertEqual(result["metrics"]["decode"]["8192"], 567.8)
        self.assertEqual(result["usage"]["512"]["gpu_memory_used_peak_mb"], 1024.0)
        self.assertEqual(result["config"]["tokens"], [512, 1024, 2048, 4096, 8192])

    def test_run_benchmark_uses_custom_token_list(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            model = pathlib.Path(tmpdir) / "model.gguf"
            binary = pathlib.Path(tmpdir) / "llama-bench"
            model.write_text("gguf", encoding="utf-8")
            binary.write_text("#!/bin/sh\n", encoding="utf-8")
            binary.chmod(0o755)

            def fake_run(argv: list[str]) -> tuple[str, dict[str, float]]:
                token_count = int(argv[-1])
                return SAMPLE_OUTPUT.replace("pp512", f"pp{token_count}").replace("tg512", f"tg{token_count}"), {}

            with mock.patch("ourbench_cli.runner._run_command", side_effect=fake_run):
                with mock.patch("ourbench_cli.runner.collect_hardware", return_value={"gpu": "unknown", "cpu": "unknown", "memory": "unknown", "pcie": "unknown"}):
                    result = runner.run_benchmark(
                        model,
                        binary_override=binary,
                        options=runner.BenchmarkOptions(tokens=(512, 1024)),
                    )

        self.assertEqual(list(result["metrics"]["prefill"]), ["512", "1024"])
        self.assertEqual(result["config"]["tokens"], [512, 1024])

class HardwareTests(unittest.TestCase):
    def test_detect_gpu_summarizes_identical_gpus(self) -> None:
        output = "NVIDIA RTX 5090, 32768\nNVIDIA RTX 5090, 32768"

        with mock.patch("ourbench_cli.hardware._run_text", return_value=output):
            self.assertEqual(hardware.detect_gpu(), "2x NVIDIA RTX 5090 32GB")

    def test_detect_pcie_maps_link_speed(self) -> None:
        with mock.patch("ourbench_cli.hardware._run_text", return_value="LnkCap: Port #0, Speed 32GT/s, Width x16"):
            self.assertEqual(hardware.detect_pcie(), "PCIe 5.0")


if __name__ == "__main__":
    unittest.main()
