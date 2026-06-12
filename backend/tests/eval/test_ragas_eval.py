"""
RAGAs evaluation pytest suite.

Run with:
    cd backend && venv/bin/pytest tests/eval/test_ragas_eval.py -v -m ragas

This suite is excluded from default test runs (requires -m ragas) because
it makes real LLM calls and takes ~2-3 minutes to complete.
"""

import json
import logging
import os
from pathlib import Path

import pytest

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Mark all tests in this module with the "ragas" marker so they're opt-in only
# ──────────────────────────────────────────────────────────────────────────────
pytestmark = pytest.mark.ragas


def _check_ragas_deps() -> bool:
    """Check if RAGAs and langchain-groq are installed."""
    try:
        import ragas  # noqa: F401
        import langchain_groq  # noqa: F401
        return True
    except ImportError:
        return False


def _check_groq_key() -> bool:
    """Check if GROQ_API_KEY is configured."""
    from app.config import get_settings
    s = get_settings()
    return bool(s.GROQ_API_KEY and s.GROQ_API_KEY != "your_groq_api_key_here")


# Skip entire module if dependencies are missing or if not explicitly enabled
if not _check_ragas_deps():
    pytest.skip(
        "RAGAs evaluation requires: pip install ragas langchain-groq",
        allow_module_level=True,
    )

if not _check_groq_key():
    pytest.skip(
        "GROQ_API_KEY not configured — required for RAGAs LLM evaluation",
        allow_module_level=True,
    )

if os.environ.get("RUN_RAGAS_EVAL") != "true":
    pytest.skip(
        "RAGAs evaluation is slow and disabled by default. Set RUN_RAGAS_EVAL=true to run.",
        allow_module_level=True,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def eval_results():
    """
    Run the full RAGAs evaluation suite once per module.

    This is scoped to `module` so all test functions share the same
    evaluation run — we don't want to re-run the agent 8x per test.
    """
    from app.core.ragas_evaluator import RagasEvaluator

    evaluator = RagasEvaluator()

    dataset_path = str(
        Path(__file__).parent / "eval_dataset.json"
    )

    result = evaluator.run_evaluation(
        dataset_path=dataset_path,
        experiment_name="pytest-ragas-eval",
    )

    return result, evaluator


# ──────────────────────────────────────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestRagasMetrics:
    """RAGAs metric threshold tests."""

    def test_answer_relevancy_above_threshold(self, eval_results) -> None:
        """Average answer relevancy meets minimum threshold."""
        result, evaluator = eval_results
        threshold = evaluator.THRESHOLDS["answer_relevancy"]
        assert result.avg_answer_relevancy >= threshold, (
            f"Answer relevancy {result.avg_answer_relevancy:.4f} "
            f"below threshold {threshold}"
        )

    def test_faithfulness_above_threshold(self, eval_results) -> None:
        """Average faithfulness meets minimum threshold."""
        result, evaluator = eval_results
        threshold = evaluator.THRESHOLDS["faithfulness"]
        assert result.avg_faithfulness >= threshold, (
            f"Faithfulness {result.avg_faithfulness:.4f} "
            f"below threshold {threshold}"
        )

    def test_context_precision_above_threshold(self, eval_results) -> None:
        """Average context precision meets minimum threshold."""
        result, evaluator = eval_results
        threshold = evaluator.THRESHOLDS["context_precision"]
        assert result.avg_context_precision >= threshold, (
            f"Context precision {result.avg_context_precision:.4f} "
            f"below threshold {threshold}"
        )

    def test_all_examples_executed(self, eval_results) -> None:
        """All examples in the dataset were evaluated."""
        result, _ = eval_results

        # Load dataset to check expected count
        dataset_path = Path(__file__).parent / "eval_dataset.json"
        with open(dataset_path) as f:
            dataset = json.load(f)
        expected_count = len(dataset.get("examples", []))

        assert result.total_examples == expected_count, (
            f"Expected {expected_count} examples, got {result.total_examples}"
        )

    def test_no_example_errors(self, eval_results) -> None:
        """No individual examples encountered errors during evaluation."""
        result, _ = eval_results
        errors = [r for r in result.examples if r.error]
        assert len(errors) == 0, (
            f"{len(errors)} examples had errors: "
            + "; ".join(f"{r.example_id}: {r.error}" for r in errors)
        )

    def test_all_thresholds_pass(self, eval_results) -> None:
        """All aggregate metrics meet their respective thresholds."""
        result, evaluator = eval_results
        assert evaluator.check_thresholds(result), (
            f"Metric thresholds not met — "
            f"AR: {result.avg_answer_relevancy:.4f} (≥{evaluator.THRESHOLDS['answer_relevancy']}), "
            f"F: {result.avg_faithfulness:.4f} (≥{evaluator.THRESHOLDS['faithfulness']}), "
            f"CP: {result.avg_context_precision:.4f} (≥{evaluator.THRESHOLDS['context_precision']})"
        )
