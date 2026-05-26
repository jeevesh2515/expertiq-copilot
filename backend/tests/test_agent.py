"""
Tests for the AI agent pipeline components.

Covers query analysis, knowledge graph, and the agent runner.
"""

import pytest

from app.core.knowledge_graph import KnowledgeGraph


class TestKnowledgeGraph:
    """Tests for the NetworkX knowledge graph."""

    @pytest.fixture
    def sample_experts(self) -> list:
        """Sample expert data for graph construction."""
        return [
            {
                "id": "expert-1",
                "name": "Dr. Alice Smith",
                "title": "VP of AI",
                "company": "TechCorp",
                "industry": "FinTech",
                "seniority": "VP",
                "topics": ["machine learning", "quantitative finance", "risk modelling"],
                "years_experience": 15,
            },
            {
                "id": "expert-2",
                "name": "Bob Johnson",
                "title": "Director of Compliance",
                "company": "RegCo",
                "industry": "RegTech",
                "seniority": "Director",
                "topics": ["regulatory compliance", "AML", "KYC"],
                "years_experience": 12,
            },
            {
                "id": "expert-3",
                "name": "Dr. Carol Lee",
                "title": "Chief Data Officer",
                "company": "TechCorp",
                "industry": "FinTech",
                "seniority": "C-Suite",
                "topics": ["machine learning", "data governance", "AI ethics"],
                "years_experience": 20,
            },
        ]

    @pytest.fixture
    def knowledge_graph(self, sample_experts: list) -> KnowledgeGraph:
        """Build a knowledge graph from sample experts."""
        kg = KnowledgeGraph()
        kg.build_from_experts(sample_experts)
        return kg

    def test_graph_construction(self, knowledge_graph: KnowledgeGraph) -> None:
        """Graph is constructed with correct node and edge counts."""
        stats = knowledge_graph.get_stats()
        assert stats["total_nodes"] > 0
        assert stats["total_edges"] > 0
        assert stats.get("expert_nodes", 0) == 3
        assert stats.get("company_nodes", 0) == 2  # TechCorp, RegCo
        assert stats.get("industry_nodes", 0) == 2  # FinTech, RegTech

    def test_graph_traversal_by_topic(self, knowledge_graph: KnowledgeGraph) -> None:
        """Traversal by topic finds relevant experts."""
        result = knowledge_graph.traverse(
            query_entities=["machine learning"],
            max_hops=2,
        )
        # Should find experts 1 and 3 (both have "machine learning")
        assert len(result["expert_ids"]) >= 2

    def test_graph_traversal_by_company(
        self, knowledge_graph: KnowledgeGraph
    ) -> None:
        """Traversal by company finds experts at that company."""
        result = knowledge_graph.traverse(
            query_entities=["TechCorp"],
            max_hops=1,
        )
        assert len(result["expert_ids"]) >= 2

    def test_graph_traversal_by_industry(
        self, knowledge_graph: KnowledgeGraph
    ) -> None:
        """Traversal by industry finds all experts in that industry."""
        result = knowledge_graph.traverse(
            query_entities=["FinTech"],
            max_hops=1,
        )
        assert len(result["expert_ids"]) >= 2

    def test_graph_traversal_no_match(
        self, knowledge_graph: KnowledgeGraph
    ) -> None:
        """Traversal with non-existent entity returns empty."""
        result = knowledge_graph.traverse(
            query_entities=["nonexistent_topic_xyz"],
            max_hops=2,
        )
        assert len(result["expert_ids"]) == 0

    def test_graph_visualization_data(
        self, knowledge_graph: KnowledgeGraph
    ) -> None:
        """Traversal returns nodes and edges for visualisation."""
        result = knowledge_graph.traverse(
            query_entities=["machine learning"],
            max_hops=2,
        )
        assert "nodes" in result
        assert "edges" in result
        assert len(result["nodes"]) > 0

        # Check node structure
        for node in result["nodes"]:
            assert "id" in node
            assert "label" in node
            assert "type" in node

    def test_get_expert_neighbors(
        self, knowledge_graph: KnowledgeGraph
    ) -> None:
        """Get neighbors of a specific expert."""
        neighbors = knowledge_graph.get_expert_neighbors("expert-1")
        assert "WORKED_AT" in neighbors
        assert "TechCorp" in neighbors["WORKED_AT"]
        assert "OPERATES_IN" in neighbors
        assert "EXPERT_IN" in neighbors


class TestQueryAnalysis:
    """Tests for query analysis logic."""

    def test_industry_detection(self) -> None:
        """Industry keywords are correctly detected."""
        from app.core.agent import query_analyser

        state = {
            "query": "Find fintech compliance experts with banking experience",
            "filters": None,
            "top_k": 10,
        }
        result = query_analyser(state)
        analysis = result["query_analysis"]
        assert "FinTech" in analysis.get("detected_industries", [])

    def test_entity_extraction(self) -> None:
        """Entities are extracted from queries."""
        from app.core.agent import query_analyser

        state = {
            "query": "semiconductor supply chain carbon markets hedge fund",
            "filters": None,
            "top_k": 10,
        }
        result = query_analyser(state)
        entities = result["query_analysis"]["entities"]
        assert len(entities) > 0
        assert "semiconductor" in entities
