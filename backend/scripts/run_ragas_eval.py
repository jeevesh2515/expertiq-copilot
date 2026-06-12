#!/usr/bin/env python3
"""
Standalone RAGAs evaluation runner for ExpertIQ Copilot.

Runs the full RAGAs evaluation suite (answer_relevancy, faithfulness,
context_precision) against the golden dataset and logs results to LangSmith.

Usage:
    cd backend
    venv/bin/python -m scripts.run_ragas_eval
    venv/bin/python -m scripts.run_ragas_eval --dataset tests/eval/eval_dataset.json
    venv/bin/python -m scripts.run_ragas_eval --name my-experiment-v2

Exit codes:
    0 — All metrics above thresholds
    1 — One or more metrics below threshold
    2 — Fatal error (missing deps, config, etc.)
"""

import argparse
import logging
import os
import sys

# Bootstrap Python path for running as standalone script
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Ensure .env is loaded before anything else
try:
    from dotenv import load_dotenv

    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_paths = [
        os.path.join(script_dir, "..", "..", ".env"),
        os.path.join(script_dir, "..", ".env"),
        os.path.abspath(".env"),
        os.path.abspath("../.env"),
    ]
    for p in env_paths:
        if os.path.exists(p):
            load_dotenv(p, override=False)
            break
except Exception:
    pass

# Set up structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ragas_eval")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run RAGAs evaluation on ExpertIQ agent pipeline"
    )
    parser.add_argument(
        "--dataset",
        default="tests/eval/eval_dataset.json",
        help="Path to the evaluation dataset JSON (default: tests/eval/eval_dataset.json)",
    )
    parser.add_argument(
        "--name",
        default=None,
        help="LangSmith experiment name prefix (default: auto-generated with timestamp)",
    )
    args = parser.parse_args()

    # ── Pre-flight checks ──────────────────────────────────────────────────
    logger.info("═══════════════════════════════════════════════════════════")
    logger.info("  ExpertIQ Copilot — RAGAs Evaluation Runner")
    logger.info("═══════════════════════════════════════════════════════════")

    # 1. Check dependencies
    try:
        import ragas  # noqa: F401
        import langchain_groq  # noqa: F401

        logger.info(f"✓ RAGAs version: {ragas.__version__}")
    except ImportError as e:
        logger.error(
            f"✗ Missing dependency: {e}\n"
            "  Install with: venv/bin/pip install ragas langchain-groq"
        )
        return 2

    # 2. Check Groq API key
    from app.config import get_settings

    settings = get_settings()
    if not settings.groq_available:
        logger.error(
            "✗ GROQ_API_KEY not configured. RAGAs needs an LLM for evaluation.\n"
            "  Set GROQ_API_KEY in your .env file."
        )
        return 2
    logger.info(f"✓ Groq model: {settings.GROQ_MODEL}")

    # 3. Check LangSmith (optional, warn if missing)
    langchain_key = os.environ.get("LANGCHAIN_API_KEY", "")
    if not langchain_key or langchain_key == "your_langsmith_api_key_here":
        logger.warning(
            "⚠ LANGCHAIN_API_KEY not set — results will NOT be logged to LangSmith.\n"
            "  Set LANGCHAIN_API_KEY and LANGCHAIN_TRACING_V2=true to enable."
        )
    else:
        project = os.environ.get("LANGCHAIN_PROJECT", "default")
        logger.info(f"✓ LangSmith project: {project}")

    # 4. Check dataset exists
    dataset_path = args.dataset
    if not os.path.isabs(dataset_path):
        # Resolve relative to backend root
        backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        dataset_path = os.path.join(backend_root, dataset_path)

    if not os.path.exists(dataset_path):
        logger.error(f"✗ Dataset not found: {dataset_path}")
        return 2
    logger.info(f"✓ Dataset: {dataset_path}")

    # ── Run evaluation ─────────────────────────────────────────────────────
    logger.info("")
    try:
        from app.core.ragas_evaluator import RagasEvaluator

        evaluator = RagasEvaluator()

        if not evaluator._ragas_available:
            logger.error("✗ RAGAs evaluator failed to initialize")
            return 2

        result = evaluator.run_evaluation(
            dataset_path=dataset_path,
            experiment_name=args.name,
        )

        # ── Exit code based on threshold check ─────────────────────────────
        if evaluator.check_thresholds(result):
            logger.info("🎉 All RAGAs metrics pass! Evaluation complete.")
            return 0
        else:
            logger.warning("⚠ Some metrics are below threshold.")
            return 1

    except Exception as e:
        logger.error(f"✗ Evaluation failed: {e}", exc_info=True)
        return 2


if __name__ == "__main__":
    sys.exit(main())
