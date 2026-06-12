"""
RAGAs evaluation harness for ExpertIQ Copilot.

Scores the ExpertDiscoveryAgent pipeline on 3 RAGAs metrics:
  1. Answer Relevancy — Is the executive summary relevant to the query?
  2. Faithfulness — Does the summary only assert facts grounded in retrieved contexts?
  3. Context Precision — Are the most relevant contexts ranked highest?

Results are logged to LangSmith as experiment feedback for dashboard visibility.

Usage:
    from app.core.ragas_evaluator import RagasEvaluator
    evaluator = RagasEvaluator()
    results = evaluator.run_evaluation(dataset_path="tests/eval/eval_dataset.json")
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from langsmith import traceable

from app.config import get_settings
from app.core.agent import get_agent

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class EvalExample:
    """A single evaluation example from the golden dataset."""

    id: str
    question: str
    ground_truth_expert_names: List[str]
    expected_topics: List[str]
    expected_industry: str


@dataclass
class EvalResult:
    """Result of evaluating a single example across all RAGAs metrics."""

    example_id: str
    question: str
    answer_relevancy: Optional[float] = None
    faithfulness: Optional[float] = None
    context_precision: Optional[float] = None
    error: Optional[str] = None
    langsmith_run_id: Optional[str] = None
    processing_time_ms: float = 0.0


@dataclass
class EvalSuiteResult:
    """Aggregate results from the full evaluation suite."""

    examples: List[EvalResult] = field(default_factory=list)
    avg_answer_relevancy: float = 0.0
    avg_faithfulness: float = 0.0
    avg_context_precision: float = 0.0
    total_examples: int = 0
    successful_examples: int = 0
    total_time_ms: float = 0.0
    experiment_name: str = ""


def _load_dataset(dataset_path: str) -> List[EvalExample]:
    """Load and parse the golden evaluation dataset JSON."""
    path = Path(dataset_path)
    if not path.is_absolute():
        # Resolve relative to backend root
        path = Path(__file__).parent.parent.parent / path

    with open(path, "r") as f:
        data = json.load(f)

    examples = []
    for item in data.get("examples", []):
        examples.append(
            EvalExample(
                id=item["id"],
                question=item["question"],
                ground_truth_expert_names=item.get("ground_truth_expert_names", []),
                expected_topics=item.get("expected_topics", []),
                expected_industry=item.get("expected_industry", ""),
            )
        )
    return examples


def _extract_contexts(response: Dict[str, Any]) -> List[str]:
    """
    Extract retrieved context strings from the agent response.

    Pulls from grounding_sources attached to each expert result — these
    are the document chunks the Reranker node retrieved for RAG grounding.
    """
    contexts = []
    for result in response.get("results", []):
        for source in result.get("grounding_sources", []):
            content = source.get("content", "")
            if content and len(content) > 10:
                contexts.append(content)
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for ctx in contexts:
        if ctx not in seen:
            seen.add(ctx)
            unique.append(ctx)
    return unique


class RagasEvaluator:
    """
    RAGAs evaluation harness that runs the ExpertIQ agent pipeline,
    computes 3 RAGAs metrics, and logs results to LangSmith.
    """

    # Minimum viable thresholds for each metric
    THRESHOLDS = {
        "answer_relevancy": 0.5,
        "faithfulness": 0.5,
        "context_precision": 0.4,
    }

    def __init__(self) -> None:
        self._agent = get_agent()
        self._ragas_available = False
        self._metrics = None
        self._llm = None
        self._embeddings = None

        try:
            self._setup_ragas()
            self._ragas_available = True
            logger.info("✓ RAGAs evaluation harness initialized successfully")
        except ImportError as e:
            logger.warning(
                "RAGAs or langchain-groq not installed. "
                "Install with: pip install ragas langchain-groq. "
                f"Error: {e}"
            )
        except Exception as e:
            logger.warning(f"RAGAs setup failed: {e}")

    def _setup_ragas(self) -> None:
        """Initialize RAGAs metrics with ChatGroq as the evaluator LLM."""
        from ragas.metrics import (
            answer_relevancy,
            context_precision,
            faithfulness,
        )
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper

        from langchain_groq import ChatGroq
        from langchain_core.embeddings import Embeddings
        from app.core.embeddings import get_embedding_service

        # Use the same Groq model the agent uses for evaluation judging
        groq_api_key = settings.GROQ_API_KEY
        model_name = settings.GROQ_MODEL

        if not groq_api_key or groq_api_key == "your_groq_api_key_here":
            raise ValueError(
                "GROQ_API_KEY is required for RAGAs evaluation. "
                "Set it in your .env file."
            )

        llm = ChatGroq(
            model=model_name,
            api_key=groq_api_key,
            temperature=0.0,
            max_tokens=2048,
        )

        class FastEmbedLangchainEmbeddings(Embeddings):
            """LangChain compatible wrapper around the local FastEmbed EmbeddingService."""
            def __init__(self, service) -> None:
                self.service = service

            def embed_documents(self, texts: List[str]) -> List[List[float]]:
                return self.service.embed_texts(texts)

            def embed_query(self, text: str) -> List[float]:
                return self.service.embed_text(text)

        # Use lightweight local embeddings (same model the app already uses)
        embeddings = FastEmbedLangchainEmbeddings(get_embedding_service())

        self._llm = LangchainLLMWrapper(llm, bypass_n=True)
        self._embeddings = LangchainEmbeddingsWrapper(embeddings)

        # Configure metrics with our LLM and embeddings
        self._metrics = [answer_relevancy, faithfulness, context_precision]

    @traceable(name="RAGAsEvaluator.run_single")
    def _run_single_example(self, example: EvalExample) -> Dict[str, Any]:
        """
        Run the agent on a single example and collect the response
        along with question, answer, and contexts for RAGAs.
        """
        response = self._agent.run(
            query=example.question,
            top_k=10,
            include_graph=False,
        )

        answer = response.get("executive_summary") or ""
        contexts = _extract_contexts(response)

        # If no executive summary was generated (LLM unavailable),
        # build a fallback from the top results
        if not answer and response.get("results"):
            parts = []
            for r in response["results"][:3]:
                parts.append(
                    f"{r.get('name', 'Unknown')} — {r.get('ai_reasoning', 'Strong match')}"
                )
            answer = "; ".join(parts)

        # If no contexts were retrieved, use expert bios as fallback
        if not contexts and response.get("results"):
            contexts = [
                r.get("bio", "") for r in response["results"][:5] if r.get("bio")
            ]

        return {
            "question": example.question,
            "answer": answer,
            "contexts": contexts,
            "ground_truths": [
                f"Expected experts: {', '.join(example.ground_truth_expert_names)}. "
                f"Expected topics: {', '.join(example.expected_topics)}. "
                f"Expected industry: {example.expected_industry}."
            ],
            "response": response,
        }

    def _evaluate_with_ragas(
        self, collected_data: List[Dict[str, Any]]
    ) -> List[Dict[str, float]]:
        """
        Run RAGAs evaluate() on collected question/answer/context triples.
        Returns per-example metric scores.
        """
        from ragas import evaluate
        from ragas.dataset_schema import SingleTurnSample, EvaluationDataset

        samples = []
        for item in collected_data:
            sample = SingleTurnSample(
                user_input=item["question"],
                response=item["answer"],
                retrieved_contexts=item["contexts"],
                reference=item["ground_truths"][0] if item["ground_truths"] else "",
            )
            samples.append(sample)

        dataset = EvaluationDataset(samples=samples)

        result = evaluate(
            dataset=dataset,
            metrics=self._metrics,
            llm=self._llm,
            embeddings=self._embeddings,
        )

        # Extract per-row scores from the result DataFrame
        df = result.to_pandas()
        per_example_scores = []

        for _, row in df.iterrows():
            scores = {
                "answer_relevancy": float(row.get("answer_relevancy", 0.0)),
                "faithfulness": float(row.get("faithfulness", 0.0)),
                "context_precision": float(row.get("context_precision", 0.0)),
            }
            # Replace NaN with 0.0
            for key in scores:
                if scores[key] != scores[key]:  # NaN check
                    scores[key] = 0.0
            per_example_scores.append(scores)

        return per_example_scores

    def _log_to_langsmith(self, suite_result: EvalSuiteResult) -> None:
        """Log individual and aggregate scores to LangSmith as feedback."""
        try:
            from langsmith import Client

            ls_client = Client()

            # Log aggregate scores as a dataset run
            for example_result in suite_result.examples:
                if example_result.langsmith_run_id and not example_result.error:
                    # Attach per-metric feedback to each agent trace
                    for metric_name in [
                        "answer_relevancy",
                        "faithfulness",
                        "context_precision",
                    ]:
                        score = getattr(example_result, metric_name, None)
                        if score is not None:
                            try:
                                ls_client.create_feedback(
                                    run_id=example_result.langsmith_run_id,
                                    key=f"ragas_{metric_name}",
                                    score=score,
                                    comment=(
                                        f"RAGAs {metric_name} score for: "
                                        f"{example_result.question[:80]}"
                                    ),
                                )
                            except Exception as fb_err:
                                logger.warning(
                                    f"Failed to push {metric_name} feedback: {fb_err}"
                                )

            logger.info(
                "✓ RAGAs scores logged to LangSmith — check Feedback tab on each trace"
            )

        except Exception as e:
            logger.warning(f"LangSmith logging failed (non-fatal): {e}")

    def run_evaluation(
        self,
        dataset_path: str = "tests/eval/eval_dataset.json",
        experiment_name: Optional[str] = None,
    ) -> EvalSuiteResult:
        """
        Run the full RAGAs evaluation suite.

        1. Load golden dataset
        2. Run each example through the agent
        3. Compute RAGAs metrics
        4. Log results to LangSmith
        5. Return aggregate scores

        Args:
            dataset_path: Path to the evaluation dataset JSON.
            experiment_name: Optional LangSmith experiment name prefix.

        Returns:
            EvalSuiteResult with per-example and aggregate scores.
        """
        if not self._ragas_available:
            logger.error(
                "RAGAs is not available. Install with: pip install ragas langchain-groq"
            )
            return EvalSuiteResult(experiment_name="ragas-unavailable")

        suite_start = time.time()
        exp_name = experiment_name or f"ragas-eval-{int(time.time())}"

        logger.info(f"🔬 Starting RAGAs evaluation: {exp_name}")
        logger.info(f"   Dataset: {dataset_path}")
        logger.info(f"   Metrics: answer_relevancy, faithfulness, context_precision")

        # ── Ensure database is initialized and seeded ──────────────────
        from app.database import Base, engine, SessionLocal
        from app.data.seed_experts import seed_experts
        from app.core.rag_pipeline import seed_document_chunks
        from app.core.lightweight_search import get_lightweight_search_engine
        from app.models.expert import Expert

        # Create tables
        Base.metadata.create_all(bind=engine)

        db_session = SessionLocal()
        try:
            # Seed experts to populate 'experts' table
            seed_experts(db_session)
            # Seed document chunks for context retrieval grounding
            seed_document_chunks(db_session)
            
            # Force refresh search engine to avoid stale in-memory index
            search_engine = get_lightweight_search_engine()
            experts = [expert.to_dict() for expert in db_session.query(Expert).all()]
            search_engine.refresh(experts)
            logger.info("✓ Database and local search index initialized for evaluation")
        except Exception as seed_err:
            logger.warning(f"⚠ Database seeding during evaluation: {seed_err}")
        finally:
            db_session.close()

        # Step 1: Load dataset
        examples = _load_dataset(dataset_path)
        logger.info(f"   Loaded {len(examples)} evaluation examples")

        # Step 2: Run agent on each example and collect data
        collected_data: List[Dict[str, Any]] = []
        example_run_ids: List[Optional[str]] = []
        example_times: List[float] = []

        for i, example in enumerate(examples, 1):
            logger.info(f"   [{i}/{len(examples)}] Running: {example.question[:60]}...")
            ex_start = time.time()

            try:
                data = self._run_single_example(example)
                collected_data.append(data)

                # Extract the LangSmith run ID from the agent response
                run_id = data["response"].get("request_id")
                example_run_ids.append(run_id)

            except Exception as e:
                logger.error(f"   ✗ Example {example.id} failed: {e}")
                collected_data.append(
                    {
                        "question": example.question,
                        "answer": "",
                        "contexts": [],
                        "ground_truths": [],
                        "response": {},
                    }
                )
                example_run_ids.append(None)

            example_times.append((time.time() - ex_start) * 1000)

        # Step 3: Run RAGAs evaluation on all collected data
        logger.info("   Computing RAGAs metrics (this may take a minute)...")
        try:
            per_example_scores = self._evaluate_with_ragas(collected_data)
        except Exception as e:
            logger.error(f"RAGAs evaluation failed: {e}", exc_info=True)
            # Return results with zero scores
            suite_result = EvalSuiteResult(
                examples=[
                    EvalResult(
                        example_id=ex.id,
                        question=ex.question,
                        error=str(e),
                        processing_time_ms=example_times[i]
                        if i < len(example_times)
                        else 0,
                    )
                    for i, ex in enumerate(examples)
                ],
                total_examples=len(examples),
                experiment_name=exp_name,
            )
            return suite_result

        # Step 4: Build results
        eval_results: List[EvalResult] = []
        for i, (example, scores) in enumerate(zip(examples, per_example_scores)):
            result = EvalResult(
                example_id=example.id,
                question=example.question,
                answer_relevancy=scores.get("answer_relevancy", 0.0),
                faithfulness=scores.get("faithfulness", 0.0),
                context_precision=scores.get("context_precision", 0.0),
                langsmith_run_id=example_run_ids[i] if i < len(example_run_ids) else None,
                processing_time_ms=example_times[i] if i < len(example_times) else 0,
            )
            eval_results.append(result)

        # Step 5: Compute aggregates
        successful = [r for r in eval_results if r.error is None]
        suite_result = EvalSuiteResult(
            examples=eval_results,
            avg_answer_relevancy=(
                sum(r.answer_relevancy or 0 for r in successful) / len(successful)
                if successful
                else 0.0
            ),
            avg_faithfulness=(
                sum(r.faithfulness or 0 for r in successful) / len(successful)
                if successful
                else 0.0
            ),
            avg_context_precision=(
                sum(r.context_precision or 0 for r in successful) / len(successful)
                if successful
                else 0.0
            ),
            total_examples=len(examples),
            successful_examples=len(successful),
            total_time_ms=(time.time() - suite_start) * 1000,
            experiment_name=exp_name,
        )

        # Step 6: Log to LangSmith
        self._log_to_langsmith(suite_result)

        # Step 7: Print summary table
        self._print_summary(suite_result)

        return suite_result

    def _print_summary(self, result: EvalSuiteResult) -> None:
        """Print a formatted summary table of evaluation results."""
        border = "═" * 90
        logger.info("")
        logger.info(f"╔{border}╗")
        logger.info(f"║  RAGAs Evaluation Results: {result.experiment_name:<61}║")
        logger.info(f"╠{border}╣")
        logger.info(
            f"║  {'Example':<12} {'Answer Rel.':>12} {'Faithfulness':>14} "
            f"{'Ctx Precision':>15} {'Time (ms)':>12}   ║"
        )
        logger.info(f"╠{border}╣")

        for r in result.examples:
            if r.error:
                logger.info(
                    f"║  {r.example_id:<12} {'ERROR':>12} {'ERROR':>14} "
                    f"{'ERROR':>15} {r.processing_time_ms:>10.0f}   ║"
                )
            else:
                logger.info(
                    f"║  {r.example_id:<12} {r.answer_relevancy or 0:>12.4f} "
                    f"{r.faithfulness or 0:>14.4f} "
                    f"{r.context_precision or 0:>15.4f} "
                    f"{r.processing_time_ms:>10.0f}   ║"
                )

        logger.info(f"╠{border}╣")
        logger.info(
            f"║  {'AVERAGE':<12} {result.avg_answer_relevancy:>12.4f} "
            f"{result.avg_faithfulness:>14.4f} "
            f"{result.avg_context_precision:>15.4f} "
            f"{result.total_time_ms:>10.0f}   ║"
        )
        logger.info(f"╠{border}╣")
        logger.info(
            f"║  Thresholds:  AR ≥ {self.THRESHOLDS['answer_relevancy']:.1f}  "
            f"│  F ≥ {self.THRESHOLDS['faithfulness']:.1f}  "
            f"│  CP ≥ {self.THRESHOLDS['context_precision']:.1f}"
            f"{'':>32}║"
        )

        # Check pass/fail
        all_pass = (
            result.avg_answer_relevancy >= self.THRESHOLDS["answer_relevancy"]
            and result.avg_faithfulness >= self.THRESHOLDS["faithfulness"]
            and result.avg_context_precision >= self.THRESHOLDS["context_precision"]
        )
        status = "✅ ALL METRICS PASS" if all_pass else "❌ SOME METRICS BELOW THRESHOLD"
        logger.info(f"║  Status: {status:<78}║")
        logger.info(f"╚{border}╝")
        logger.info("")

    def check_thresholds(self, result: EvalSuiteResult) -> bool:
        """Return True if all aggregate metrics meet minimum thresholds."""
        return (
            result.avg_answer_relevancy >= self.THRESHOLDS["answer_relevancy"]
            and result.avg_faithfulness >= self.THRESHOLDS["faithfulness"]
            and result.avg_context_precision >= self.THRESHOLDS["context_precision"]
        )
