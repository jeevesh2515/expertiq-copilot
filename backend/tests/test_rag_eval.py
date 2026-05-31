"""
Automated RAG Triad evaluation and benchmark test suite.

Evaluates:
1. Context Precision: Relevancy of retrieved experts against queries with explicit constraints.
2. Faithfulness / Hallucination Detection: Verifies LLM executive summaries do not reference nonexistent experts.
3. Parent-Child Resolution: Asserts child chunks map cleanly to parent biography paragraphs.
"""

import pytest
from app.database import Base, engine, SessionLocal
from app.models.expert import Expert
from app.core.rag_pipeline import get_rag_pipeline, seed_document_chunks
from app.core.agent import get_agent


@pytest.fixture(autouse=True)
def setup_db():
    """Isolate testing inside fresh SQLite tables and clean vector collections."""
    from app.core.vector_store import get_vector_store
    vs = get_vector_store()
    try:
        vs._client.delete_collection(vs.EXPERT_COLLECTION)
    except Exception:
        pass
    try:
        vs._client.delete_collection(vs.DOCUMENT_COLLECTION)
    except Exception:
        pass

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed concrete test profiles matching specific query filters
        experts = [
            Expert(
                id="exp-rag-1",
                name="Dr. Sarah Connor",
                title="Director of Fintech Security",
                company="Cyberdyne Pay",
                industry="FinTech",
                seniority="Director",
                bio="An experienced principal security architect specializing in fraud detection, AML compliance, and cryptographic banking protocols. Designed real-time fraud mitigation engines.",
                years_experience=18,
                availability="available",
                publications=["AML Fraud Detection Architectures 2024", "Cryptographic Banking Ledgers 2025"]
            ),
            Expert(
                id="exp-rag-2",
                name="John Connor",
                title="Senior RegTech Developer",
                company="Resistance Devs",
                industry="RegTech",
                seniority="Senior",
                bio="Software engineer working on compliance reporting engines, KYC validators, and regulatory transaction matching logic. Building scalable blockchain validators.",
                years_experience=10,
                availability="available",
                publications=["KYC Automation at Scale 2023"]
            ),
            Expert(
                id="exp-rag-3",
                name="Marcus Wright",
                title="VP of AI Systems",
                company="Cyberdyne AI",
                industry="DeepTech",
                seniority="VP",
                bio="Cybernetics research scientist. Expert in neural networks, large-scale deep learning model optimization, and human-machine interface alignment.",
                years_experience=22,
                availability="unavailable",
                publications=["Neural Interface Protocols 2022"]
            )
        ]
        db.add_all(experts)
        db.commit()
        
        # Prewarm vectors and document chunks
        seed_document_chunks(db)
        
        from app.core.lightweight_search import get_lightweight_search_engine
        search_engine = get_lightweight_search_engine()
        search_engine.refresh([e.to_dict() for e in experts])
        
    finally:
        db.close()
    
    yield
    Base.metadata.drop_all(bind=engine)


def test_parent_child_resolution_and_deduplication() -> None:
    """Assert child sentences resolve to full parent bios with no duplicates."""
    from app.core.vector_store import get_vector_store
    vs = get_vector_store()
    
    # Chroma document collection should now be seeded with child chunks
    assert vs.get_document_count() > 0
    
    # Verify child chunks map to parent metadata
    docs = vs.search_documents(query="cryptographic banking", top_k=5)
    assert len(docs) > 0
    for doc in docs:
        meta = doc.get("metadata", {})
        assert "parent_id" in meta
        assert "parent_text" in meta
        # The child text (content) should be a subset of the parent bio
        assert doc["content"] in meta["parent_text"]

    # Verify context resolver performs proper parent text lookup and deduplication
    rag = get_rag_pipeline()
    context = rag.retrieve_context(query="cryptographic banking fraud detection", top_k=5)
    # Check that it extracted the parent text
    assert "An experienced principal security architect specializing" in context
    # Check that it didn't duplicate parent blocks even if multiple child sentences matched
    assert context.count("An experienced principal security architect specializing") == 1


def test_self_query_constraints_context_precision() -> None:
    """Verify that QueryAnalyser extracts constraints and VectorSearcher filters them strictly."""
    agent = get_agent()
    
    # 1. Test query with years experience constraint
    state = agent.run(
        query="Who is an available Fintech expert with 15+ years experience?",
        top_k=5
    )
    
    # Extract query analysis constraints
    analysis = state.get("query_analysis", {})
    assert "constraints" in analysis
    assert analysis["constraints"]["min_years_experience"] == 15
    assert analysis["constraints"]["availability"] == "available"
    
    # Validate result precision: all retrieved results must meet constraints
    results = state.get("results", [])
    assert len(results) > 0
    for expert in results:
        assert expert["years_experience"] >= 15
        assert expert["availability"] == "available"
        assert expert["industry"] == "FinTech"


def test_faithfulness_and_hallucination_prevention() -> None:
    """Benchmark that LLM executive summaries strictly match retrieved expert nodes."""
    agent = get_agent()
    state = agent.run(
        query="Find experts in neural networks and cybernetics systems",
        top_k=5
    )
    
    results = state.get("results", [])
    retrieved_names = {exp["name"] for exp in results}
    summary = state.get("executive_summary") or ""
    
    if summary and results:
        # Check hallucination: summary must not reference names not retrieved
        # For instance, SarahConnor shouldn't be referenced if she wasn't retrieved
        all_possible_names = {"Sarah Connor", "Dr. Sarah Connor", "John Connor", "Marcus Wright"}
        for name in all_possible_names:
            if name in summary:
                # If name is mentioned, it must be part of the retrieved set
                base_name = name.replace("Dr. ", "")
                assert any(base_name in rn for rn in retrieved_names), f"Hallucination detected: {name} mentioned but not retrieved."
