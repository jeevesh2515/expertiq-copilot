"""
Unit tests for the Pinecone vector store backend.
"""

from unittest.mock import MagicMock, patch
import pytest

from app.config import Settings
from app.core.vector_store_pinecone import PineconeVectorStore, get_pinecone_vector_store


@pytest.fixture
def mock_settings():
    """Mock application settings with Pinecone enabled."""
    settings = Settings()
    settings.PINECONE_API_KEY = "test-api-key"
    settings.PINECONE_INDEX_NAME = "test-index"
    settings.PINECONE_CLOUD = "aws"
    settings.PINECONE_REGION = "us-east-1"
    settings.PINECONE_NAMESPACE = "test-ns"
    return settings


@pytest.fixture
def mock_embedding_service():
    """Mock embedding service generating fake vectors."""
    service = MagicMock()
    service.dimension = 384
    service.embed_text.return_value = [0.1] * 384
    service.embed_texts.return_value = [[0.1] * 384]
    return service


@patch("app.core.vector_store_pinecone.settings")
@patch("app.core.vector_store_pinecone.get_embedding_service")
@patch("app.core.vector_store_pinecone.Pinecone")
def test_pinecone_store_init(mock_pinecone_class, mock_get_embedding, mock_settings):
    """Test that PineconeVectorStore initializes and auto-creates index if missing."""
    mock_settings.pinecone_available = True
    mock_settings.PINECONE_API_KEY = "test-api-key"
    mock_settings.PINECONE_INDEX_NAME = "test-index"

    mock_pc_client = MagicMock()
    # Simulate that list_indexes does not contain the test-index
    mock_index_desc = MagicMock()
    mock_index_desc.name = "other-index"
    mock_pc_client.list_indexes.return_value = [mock_index_desc]
    mock_pinecone_class.return_value = mock_pc_client

    mock_embedding = MagicMock()
    mock_embedding.dimension = 384
    mock_get_embedding.return_value = mock_embedding

    # Run init
    store = PineconeVectorStore()

    # Assertions
    mock_pc_client.create_index.assert_called_once()
    mock_pc_client.Index.assert_called_with("test-index")
    assert store._index is not None


@patch("app.core.vector_store_pinecone.settings")
@patch("app.core.vector_store_pinecone.get_embedding_service")
@patch("app.core.vector_store_pinecone.Pinecone")
def test_pinecone_semantic_search(mock_pinecone_class, mock_get_embedding, mock_settings, mock_embedding_service):
    """Test semantic search method formatting and returning correctly."""
    mock_settings.pinecone_available = True
    mock_settings.PINECONE_API_KEY = "test-api-key"
    mock_settings.PINECONE_INDEX_NAME = "test-index"
    mock_settings.PINECONE_NAMESPACE = "test-ns"

    mock_pc_client = MagicMock()
    mock_index_desc = MagicMock()
    mock_index_desc.name = "test-index"
    mock_pc_client.list_indexes.return_value = [mock_index_desc]
    
    # Mock search results returned by Pinecone query()
    mock_match = MagicMock()
    mock_match.id = "exp-123"
    mock_match.score = 0.85
    mock_match.metadata = {
        "name": "Jane Doe",
        "title": "Principal Architect",
        "company": "FastPay",
        "bio": "Expert bio string."
    }
    
    mock_query_response = MagicMock()
    mock_query_response.matches = [mock_match]
    mock_index = MagicMock()
    mock_index.query.return_value = mock_query_response
    mock_pc_client.Index.return_value = mock_index
    
    mock_pinecone_class.return_value = mock_pc_client
    mock_get_embedding.return_value = mock_embedding_service

    # Create store and run search
    store = PineconeVectorStore()
    results = store.semantic_search(query="Fintech expert", top_k=5, threshold=0.3)

    # Assertions
    mock_index.query.assert_called_once_with(
        vector=mock_embedding_service.embed_text.return_value,
        top_k=5,
        include_metadata=True,
        filter=None,
        namespace="test-ns"
    )
    assert len(results) == 1
    assert results[0]["id"] == "exp-123"
    assert results[0]["similarity"] == 0.85
    assert results[0]["content"] == "Expert bio string."
    assert results[0]["page_content"] == "Expert bio string."
    assert results[0]["type"] == "Document"
    assert results[0]["metadata"]["name"] == "Jane Doe"


@patch("app.core.vector_store_pinecone.settings")
@patch("app.core.vector_store_pinecone.get_embedding_service")
@patch("app.core.vector_store_pinecone.Pinecone")
def test_pinecone_upsert_expert(mock_pinecone_class, mock_get_embedding, mock_settings, mock_embedding_service):
    """Test single expert profile upsert method."""
    mock_settings.pinecone_available = True
    mock_settings.PINECONE_API_KEY = "test-api-key"
    mock_settings.PINECONE_INDEX_NAME = "test-index"
    mock_settings.PINECONE_NAMESPACE = "test-ns"

    mock_pc_client = MagicMock()
    mock_index_desc = MagicMock()
    mock_index_desc.name = "test-index"
    mock_pc_client.list_indexes.return_value = [mock_index_desc]
    
    mock_index = MagicMock()
    mock_pc_client.Index.return_value = mock_index
    mock_pinecone_class.return_value = mock_pc_client
    mock_get_embedding.return_value = mock_embedding_service

    # Create store and run upsert
    store = PineconeVectorStore()
    metadata = {"name": "Jane Doe", "industry": "FinTech"}
    store.upsert_expert(
        expert_id="exp-123",
        embedding_text="Jane Doe is a FinTech architect.",
        metadata=metadata
    )

    # Assertions
    mock_index.upsert.assert_called_once_with(
        vectors=[("exp-123", mock_embedding_service.embed_text.return_value, {
            "name": "Jane Doe",
            "industry": "FinTech",
            "bio": "Jane Doe is a FinTech architect."
        })],
        namespace="test-ns"
    )


@patch("app.core.vector_store_pinecone.settings")
@patch("app.core.vector_store_pinecone.get_embedding_service")
@patch("app.core.vector_store_pinecone.Pinecone")
def test_pinecone_delete_expert(mock_pinecone_class, mock_get_embedding, mock_settings, mock_embedding_service):
    """Test expert profile deletion method."""
    mock_settings.pinecone_available = True
    mock_settings.PINECONE_API_KEY = "test-api-key"
    mock_settings.PINECONE_INDEX_NAME = "test-index"
    mock_settings.PINECONE_NAMESPACE = "test-ns"

    mock_pc_client = MagicMock()
    mock_index_desc = MagicMock()
    mock_index_desc.name = "test-index"
    mock_pc_client.list_indexes.return_value = [mock_index_desc]
    
    mock_index = MagicMock()
    mock_pc_client.Index.return_value = mock_index
    mock_pinecone_class.return_value = mock_pc_client
    mock_get_embedding.return_value = mock_embedding_service

    # Create store and run delete
    store = PineconeVectorStore()
    store.delete_expert(expert_id="exp-123")

    # Assertions
    mock_index.delete.assert_called_once_with(
        ids=["exp-123"],
        namespace="test-ns"
    )
