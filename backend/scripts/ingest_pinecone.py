#!/usr/bin/env python3
"""
Bulk ingestion script for loading PostgreSQL expert profiles into Pinecone.

Fetches all experts from the PostgreSQL database, generates semantic text embeddings,
and bulk upserts them to the configured Pinecone index.

Usage:
    cd backend
    venv/bin/python -m scripts.ingest_pinecone [--force]
"""

import argparse
import logging
import os
import sys

# Bootstrap Python path to allow running script directly or as module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import get_settings
from app.database import SessionLocal
from app.models.expert import Expert
from app.core.vector_store_pinecone import get_pinecone_vector_store

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ingest_pinecone")
settings = get_settings()


def run_ingestion(force: bool = False, batch_size: int = 50) -> None:
    """Ingest database experts into Pinecone."""
    logger.info("Initializing Pinecone Ingestion Script...")

    if not settings.pinecone_available:
        logger.error(
            "PINECONE_API_KEY is not configured or uses a placeholder in your .env file."
        )
        logger.error("Please add a valid API Key and try again.")
        sys.exit(1)

    logger.info(f"Target Pinecone Index: {settings.PINECONE_INDEX_NAME}")
    logger.info(f"Namespace: {settings.PINECONE_NAMESPACE or 'default'}")

    db = SessionLocal()
    try:
        # Fetch all experts
        logger.info("Querying experts from PostgreSQL database...")
        experts = db.query(Expert).all()
        total_experts = len(experts)

        if total_experts == 0:
            logger.warning(
                "No experts found in the PostgreSQL database. Run database seed script first: "
                "python -m app.data.seed_experts"
            )
            return

        logger.info(f"Found {total_experts} experts in PostgreSQL database.")

        # Initialize Pinecone store
        pc_store = get_pinecone_vector_store()

        # Check existing vector count
        existing_count = pc_store.get_expert_count()
        logger.info(f"Current Pinecone index vector count: {existing_count}")

        if existing_count > 0 and not force:
            logger.warning(
                f"Pinecone index already contains {existing_count} vectors."
            )
            logger.warning("Use --force flag if you want to overwrite existing records.")
            return

        # Prepare lists for batch ingestion
        expert_ids = []
        texts = []
        metadatas = []

        logger.info("Generating expert profiles embeddings payload...")
        for expert in experts:
            # Build search metadata exactly matching vector_store_pro/lightweight fields
            meta = {
                "name": expert.name,
                "title": expert.title,
                "company": expert.company,
                "industry": expert.industry,
                "seniority": expert.seniority,
                "topics": ", ".join(expert.topics),
                "years_experience": str(expert.years_experience),
                "availability": expert.availability,
                "publications": "; ".join(expert.publications[:3]),
            }

            expert_ids.append(expert.id)
            texts.append(expert.to_embedding_text())
            metadatas.append(meta)

        logger.info(f"Processing and uploading {total_experts} experts in batches of {batch_size}...")
        result = pc_store.upsert_experts_batch(
            expert_ids=expert_ids,
            texts=texts,
            metadatas=metadatas,
            batch_size=batch_size,
        )

        if result.get("status") == "success":
            logger.info("✓ Pinecone ingestion successfully completed!")
            logger.info(f"✓ Total Upserted: {result.get('total_upserted')}")
            logger.info(f"✓ Embeddings Generated: {result.get('embeddings_generated')}")
        else:
            logger.error(f"❌ Ingestion failed: {result.get('error')}")

    except Exception as e:
        logger.error(f"An unexpected error occurred during ingestion: {e}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Ingest PostgreSQL expert profiles into Pinecone Vector DB"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force ingestion even if vectors already exist in the Pinecone index.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Batch size for generating embeddings and upserting vectors (default: 50).",
    )
    args = parser.parse_args()

    run_ingestion(force=args.force, batch_size=args.batch_size)
