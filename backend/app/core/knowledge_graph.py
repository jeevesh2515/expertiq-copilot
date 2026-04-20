"""
NetworkX knowledge graph for expert relationship traversal.

Builds a graph with Expert, Company, Industry, and Topic nodes
connected by typed edges. Supports multi-hop traversal for
discovering contextually adjacent experts.
"""

import logging
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx

logger = logging.getLogger(__name__)


class KnowledgeGraph:
    """Expert relationship knowledge graph using NetworkX."""

    def __init__(self) -> None:
        """Initialise an empty directed graph."""
        self.graph = nx.DiGraph()
        logger.info("KnowledgeGraph initialised.")

    def build_from_experts(self, experts: List[Dict[str, Any]]) -> None:
        """
        Build the knowledge graph from a list of expert dicts.

        Creates nodes for each expert, company, industry, and topic.
        Creates edges for relationships:
          - Expert -> Company (WORKED_AT)
          - Expert -> Industry (OPERATES_IN)
          - Expert -> Topic (EXPERT_IN)
          - Company -> Industry (OPERATES_IN)
          - Topic -> Topic (RELATED_TO) [within same industry]

        Args:
            experts: List of expert dictionaries with required fields.
        """
        # Clear existing graph
        self.graph.clear()

        # Group topics by industry for cross-linking
        industry_topics: Dict[str, Set[str]] = {}

        for expert in experts:
            expert_id = expert["id"]
            expert_name = expert["name"]
            company = expert["company"]
            industry = expert["industry"]
            topics = expert.get("topics", [])

            # ── Add Expert node ──
            self.graph.add_node(
                f"expert:{expert_id}",
                type="expert",
                label=expert_name,
                title=expert.get("title", ""),
                seniority=expert.get("seniority", ""),
                years_experience=expert.get("years_experience", 0),
            )

            # ── Add Company node and edge ──
            company_node = f"company:{company}"
            self.graph.add_node(
                company_node,
                type="company",
                label=company,
            )
            self.graph.add_edge(
                f"expert:{expert_id}",
                company_node,
                relationship="WORKED_AT",
            )

            # ── Add Industry node and edges ──
            industry_node = f"industry:{industry}"
            self.graph.add_node(
                industry_node,
                type="industry",
                label=industry,
            )
            self.graph.add_edge(
                f"expert:{expert_id}",
                industry_node,
                relationship="OPERATES_IN",
            )
            self.graph.add_edge(
                company_node,
                industry_node,
                relationship="OPERATES_IN",
            )

            # ── Add Topic nodes and edges ──
            if industry not in industry_topics:
                industry_topics[industry] = set()

            for topic in topics:
                topic_node = f"topic:{topic}"
                self.graph.add_node(
                    topic_node,
                    type="topic",
                    label=topic,
                )
                self.graph.add_edge(
                    f"expert:{expert_id}",
                    topic_node,
                    relationship="EXPERT_IN",
                )
                industry_topics[industry].add(topic)

        # ── Create RELATED_TO edges between topics in the same industry ──
        for industry, topics in industry_topics.items():
            topic_list = sorted(topics)
            for i, t1 in enumerate(topic_list):
                for t2 in topic_list[i + 1:]:
                    self.graph.add_edge(
                        f"topic:{t1}",
                        f"topic:{t2}",
                        relationship="RELATED_TO",
                    )
                    self.graph.add_edge(
                        f"topic:{t2}",
                        f"topic:{t1}",
                        relationship="RELATED_TO",
                    )

        logger.info(
            f"Knowledge graph built: {self.graph.number_of_nodes()} nodes, "
            f"{self.graph.number_of_edges()} edges."
        )

    def traverse(
        self,
        query_entities: List[str],
        max_hops: int = 2,
        max_results: int = 20,
    ) -> Dict[str, Any]:
        """
        Multi-hop graph traversal from query entities.

        Finds entities matching the query terms, then expands
        outward by `max_hops` to discover adjacent experts.

        Args:
            query_entities: Terms extracted from the query (topics, industries, etc.).
            max_hops: Number of hops to expand (default 2).
            max_results: Maximum expert results to return.

        Returns:
            Dict with 'expert_ids', 'nodes', and 'edges' for visualisation.
        """
        # Find matching seed nodes
        seed_nodes: Set[str] = set()
        for entity in query_entities:
            entity_lower = entity.lower()
            for node_id, data in self.graph.nodes(data=True):
                label = data.get("label", "").lower()
                if entity_lower in label or label in entity_lower:
                    seed_nodes.add(node_id)

        if not seed_nodes:
            logger.info(f"No seed nodes found for entities: {query_entities}")
            return {"expert_ids": [], "nodes": [], "edges": []}

        # BFS expansion from seed nodes
        visited: Set[str] = set()
        frontier = seed_nodes.copy()
        discovered_experts: Set[str] = set()
        relevant_nodes: Set[str] = set()
        relevant_edges: List[Tuple[str, str, str]] = []

        for hop in range(max_hops + 1):
            next_frontier: Set[str] = set()
            for node in frontier:
                if node in visited:
                    continue
                visited.add(node)
                relevant_nodes.add(node)

                # Check if this is an expert
                node_data = self.graph.nodes.get(node, {})
                if node_data.get("type") == "expert":
                    expert_id = node.replace("expert:", "")
                    discovered_experts.add(expert_id)

                # Expand to neighbors (both directions)
                for _, neighbor, edge_data in self.graph.edges(node, data=True):
                    relevant_edges.append(
                        (node, neighbor, edge_data.get("relationship", ""))
                    )
                    next_frontier.add(neighbor)

                for predecessor, _, edge_data in self.graph.in_edges(node, data=True):
                    relevant_edges.append(
                        (predecessor, node, edge_data.get("relationship", ""))
                    )
                    next_frontier.add(predecessor)

            frontier = next_frontier - visited

        # Build visualisation data
        nodes = []
        for node_id in relevant_nodes:
            data = self.graph.nodes.get(node_id, {})
            nodes.append({
                "id": node_id,
                "label": data.get("label", node_id),
                "type": data.get("type", "unknown"),
            })

        edges = []
        seen_edges: Set[Tuple[str, str]] = set()
        for source, target, rel in relevant_edges:
            if source in relevant_nodes and target in relevant_nodes:
                edge_key = (source, target)
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edges.append({
                        "source": source,
                        "target": target,
                        "relationship": rel,
                    })

        return {
            "expert_ids": list(discovered_experts)[:max_results],
            "nodes": nodes,
            "edges": edges,
        }

    def get_expert_neighbors(self, expert_id: str) -> Dict[str, List[str]]:
        """
        Get all direct relationships of an expert.

        Args:
            expert_id: Expert UUID.

        Returns:
            Dict mapping relationship types to connected entity labels.
        """
        node_id = f"expert:{expert_id}"
        if node_id not in self.graph:
            return {}

        neighbors: Dict[str, List[str]] = {}
        for _, neighbor, data in self.graph.edges(node_id, data=True):
            rel = data.get("relationship", "UNKNOWN")
            label = self.graph.nodes[neighbor].get("label", neighbor)
            if rel not in neighbors:
                neighbors[rel] = []
            neighbors[rel].append(label)

        return neighbors

    def get_stats(self) -> Dict[str, int]:
        """Return graph statistics."""
        type_counts: Dict[str, int] = {}
        for _, data in self.graph.nodes(data=True):
            node_type = data.get("type", "unknown")
            type_counts[node_type] = type_counts.get(node_type, 0) + 1

        return {
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges(),
            **{f"{k}_nodes": v for k, v in type_counts.items()},
        }


# Singleton instance
_knowledge_graph: Optional[KnowledgeGraph] = None


def get_knowledge_graph() -> KnowledgeGraph:
    """Get or create the singleton knowledge graph."""
    global _knowledge_graph
    if _knowledge_graph is None:
        _knowledge_graph = KnowledgeGraph()
    return _knowledge_graph
