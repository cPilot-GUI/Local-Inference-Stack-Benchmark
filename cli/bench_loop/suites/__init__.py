"""Benchmark suite registry."""
from __future__ import annotations

from bench_loop.suites.agent import AgentSuite
from bench_loop.suites.coding import CodingSuite
from bench_loop.suites.dataextract import DataExtractSuite
from bench_loop.suites.instructfollow import InstructFollowSuite
from bench_loop.suites.memory import MemorySuite
from bench_loop.suites.quality_retention import QualityRetentionSuite
from bench_loop.suites.reasonmath import ReasonMathSuite
from bench_loop.suites.speed import SpeedSuite
from bench_loop.suites.stability import StabilitySuite
from bench_loop.suites.toolcall import ToolCallSuite

# Stack suites are the v1 public leaderboard default. Agent/harness suites remain
# available for advanced comparisons, but no longer define the main board.
SUITE_REGISTRY = {
    "speed": SpeedSuite,
    "memory": MemorySuite,
    "stability": StabilitySuite,
    "quality_retention": QualityRetentionSuite,
    "toolcall": ToolCallSuite,
    "dataextract": DataExtractSuite,
    "instructfollow": InstructFollowSuite,
    "reasonmath": ReasonMathSuite,
    "coding": CodingSuite,
    "agent": AgentSuite,
}

DEFAULT_SUITES = [
    "speed",
    "memory",
    "stability",
    "quality_retention",
]

__all__ = [
    "AgentSuite",
    "CodingSuite",
    "DataExtractSuite",
    "DEFAULT_SUITES",
    "InstructFollowSuite",
    "MemorySuite",
    "QualityRetentionSuite",
    "ReasonMathSuite",
    "SpeedSuite",
    "StabilitySuite",
    "SUITE_REGISTRY",
    "ToolCallSuite",
]
