from __future__ import annotations

import re


THROUGHPUT_RE = re.compile(r"([-+]?\d+(?:\.\d+)?)")


def _split_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def _parse_throughput(value: str) -> float | None:
    match = THROUGHPUT_RE.search(value)
    if not match:
        return None
    return float(match.group(1))


def parse_llama_bench_output(output: str, token_count: int) -> dict[str, float | None]:
    metrics: dict[str, float | None] = {"prefill": None, "decode": None}
    headers: list[str] | None = None

    for line in output.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|") or set(stripped.replace("|", "").replace(":", "").strip()) <= {"-"}:
            continue

        cells = _split_table_row(stripped)
        if "test" in cells and "t/s" in cells:
            headers = cells
            continue
        if headers is None or len(cells) != len(headers):
            continue

        row = dict(zip(headers, cells))
        test_name = row.get("test", "")
        throughput = _parse_throughput(row.get("t/s", ""))
        if throughput is None:
            continue
        if test_name == f"pp{token_count}":
            metrics["prefill"] = throughput
        elif test_name == f"tg{token_count}":
            metrics["decode"] = throughput

    return metrics
