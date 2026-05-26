from __future__ import annotations

import argparse
import json
import pathlib
import sys

from .runner import BenchmarkError, BenchmarkOptions, run_benchmark


def parse_tokens(raw: str | list[str] | tuple[str, ...]) -> tuple[int, ...]:
    if isinstance(raw, (list, tuple)):
        raw = " ".join(raw)
    raw = raw.replace(",", " ")
    try:
        tokens = tuple(int(part.strip()) for part in raw.split() if part.strip())
    except ValueError as exc:
        raise argparse.ArgumentTypeError("tokens must be integers separated by commas and/or spaces") from exc
    if not tokens:
        raise argparse.ArgumentTypeError("tokens cannot be empty")
    invalid = [token for token in tokens if token <= 0 or token & (token - 1) != 0]
    if invalid:
        raise argparse.ArgumentTypeError(f"tokens must be positive powers of two: {invalid}")
    return tokens


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ourbench",
        description="cPilot-GUI llama.cpp benchmark wrapper.",
    )
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    run_parser = subparsers.add_parser("run", help="run the default GGUF benchmark profile")
    run_parser.add_argument("--model", required=True, help="path to a GGUF model file")
    run_parser.add_argument("--binary", help="optional llama-bench binary override")
    run_parser.add_argument("--save", help="optional path to save the JSON result")
    run_parser.add_argument("--print-commands", action="store_true", help="print commands without executing benchmark")
    run_parser.add_argument("--ngl", "-ngl", type=int, default=BenchmarkOptions.ngl, help="llama-bench -ngl value")
    run_parser.add_argument("--nkmoe", "-nkmoe", type=int, default=BenchmarkOptions.nkmoe, help="llama-bench -nkmoe value")
    run_parser.add_argument("--ncmoe", "-ncmoe", type=int, default=BenchmarkOptions.ncmoe, help="llama-bench -ncmoe value")
    run_parser.add_argument("--threads", "-t", type=int, default=BenchmarkOptions.threads, help="llama-bench -t value")
    run_parser.add_argument("--tmoe", "-tmoe", type=int, default=BenchmarkOptions.tmoe, help="llama-bench -tmoe value")
    run_parser.add_argument("--repeats", "-r", type=int, default=BenchmarkOptions.repeats, help="llama-bench -r value")
    run_parser.add_argument("--llmoe", "-llmoe", type=int, choices=[0, 1], default=BenchmarkOptions.llmoe, help="llama-bench -llmoe value")
    run_parser.add_argument("--mmp", "-mmp", type=int, choices=[0, 1], default=BenchmarkOptions.mmp, help="llama-bench -mmp value")
    run_parser.add_argument(
        "--tokens",
        nargs="+",
        default=BenchmarkOptions.tokens,
        help="token inputs separated by commas and/or spaces; defaults to 512,1024,2048,4096,8192",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.subcommand == "run":
        try:
            tokens = parse_tokens(args.tokens)
        except argparse.ArgumentTypeError as exc:
            parser.error(str(exc))
        result = run_benchmark(
            model_path=pathlib.Path(args.model).expanduser(),
            binary_override=pathlib.Path(args.binary).expanduser() if args.binary else None,
            print_commands=args.print_commands,
            options=BenchmarkOptions(
                ngl=args.ngl,
                nkmoe=args.nkmoe,
                ncmoe=args.ncmoe,
                threads=args.threads,
                tmoe=args.tmoe,
                repeats=args.repeats,
                llmoe=args.llmoe,
                mmp=args.mmp,
                tokens=tokens,
            ),
        )
        payload = json.dumps(result, indent=2)
        print(payload)
        if args.save:
            pathlib.Path(args.save).expanduser().write_text(payload + "\n", encoding="utf-8")
        return 0

    parser.error(f"unknown subcommand: {args.subcommand}")
    return 2


def run_cli() -> None:
    try:
        raise SystemExit(main())
    except BenchmarkError as exc:
        print(f"ourbench: error: {exc}", file=sys.stderr)
        raise SystemExit(1)
    except KeyboardInterrupt:
        raise SystemExit(130)


if __name__ == "__main__":
    run_cli()
