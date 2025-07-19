#!/usr/bin/env python3
"""
Test suite for the Memory Engine Service
"""

import json
import unittest
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)

# Mock API key for testing
TEST_API_KEY = "test-api-key"


class TestMemoryEngine(unittest.TestCase):
    """Test cases for Memory Engine API endpoints"""

    @patch("app.verify_api_key")
    @patch("app.redis_client")
    def test_create_short_term_memory(self, mock_redis, mock_verify_api_key):
        """Test creating a short-term memory"""
        # Setup mocks
        mock_verify_api_key.return_value = True
        mock_redis.hset.return_value = True
        mock_redis.sadd.return_value = True

        # Test data
        test_memory = {
            "userId": "test-user",
            "type": "short_term",
            "key": "test-key",
            "value": {"test": "value"},
            "metadata": {"source": "test"},
            "ttl": 3600
        }

        # Make request
        response = client.post(
            "/memories",
            json=test_memory,
            headers={"X-API-Key": TEST_API_KEY}
        )

        # Assertions
        assert response.status_code == 200
        assert response.json()["status"] == "stored"
        assert response.json()["userId"] == "test-user"
        assert response.json()["type"] == "short_term"
        assert "id" in response.json()

        # Verify Redis calls
        mock_redis.hset.assert_called_once()
        mock_redis.sadd.assert_called_once()
        mock_redis.expire.assert_called_once()

    @patch("app.verify_api_key")
    @patch("app.redis_client")
    @patch("app.store_memory_embedding")
    def test_create_long_term_memory(self, mock_store_embedding, mock_redis, mock_verify_api_key):
        """Test creating a long-term memory"""
        # Setup mocks
        mock_verify_api_key.return_value = True
        mock_redis.hset.return_value = True
        mock_redis.sadd.return_value = True

        # Test data
        test_memory = {
            "userId": "test-user",
            "type": "long_term",
            "key": "test-key",
            "value": {"test": "value"},
            "metadata": {"source": "test"}
        }

        # Make request
        response = client.post(
            "/memories",
            json=test_memory,
            headers={"X-API-Key": TEST_API_KEY}
        )

        # Assertions
        assert response.status_code == 200
        assert response.json()["status"] == "stored"
        assert response.json()["userId"] == "test-user"
        assert response.json()["type"] == "long_term"
        assert "id" in response.json()

    @patch("app.verify_api_key")
    @patch("app.redis_client")
    def test_get_memories(self, mock_redis, mock_verify_api_key):
        """Test retrieving memories for a user"""
        # Setup mocks
        mock_verify_api_key.return_value = True
        mock_redis.smembers.return_value = ["memory:test-user:short_term:test-key"]
        mock_redis.hgetall.return_value = {
            "id": "memory:test-user:short_term:test-key",
            "userId": "test-user",
            "type": "short_term",
            "key": "test-key",
            "value": json.dumps({"test": "value"}),
            "metadata": json.dumps({"source": "test"}),
            "created_at": "2023-01-01T00:00:00",
            "last_accessed": "2023-01-01T01:00:00"
        }

        # Make request
        response = client.get(
            "/memories/test-user",
            headers={"X-API-Key": TEST_API_KEY}
        )

        # Assertions
        assert response.status_code == 200
        assert response.json()["userId"] == "test-user"
        assert len(response.json()["memories"]) == 1
        assert response.json()["memories"][0]["key"] == "test-key"
        assert response.json()["memories"][0]["value"] == {"test": "value"}
        assert response.json()["memories"][0]["metadata"] == {"source": "test"}

        # Verify Redis calls
        mock_redis.smembers.assert_called_once()
        mock_redis.hgetall.assert_called_once()
        mock_redis.hset.assert_called_once()  # For updating last_accessed

    @patch("app.verify_api_key")
    @patch("app.generate_embedding")
    @patch("app.knowledge_collection")
    def test_search_knowledge(self, mock_collection, mock_generate_embedding, mock_verify_api_key):
        """Test searching the knowledge base"""
        # Setup mocks
        mock_verify_api_key.return_value = True
        mock_generate_embedding.return_value = [0.1] * 1536
        mock_collection.query.return_value = {
            "ids": [["doc1", "doc2"]],
            "documents": [["Test document content", "Another test document"]],
            "metadatas": [[
                {"title": "Test Document", "source": "knowledge_base", "url": "https://example.com"},
                {"title": "Another Document", "source": "knowledge_base"}
            ]],
            "distances": [[0.1, 0.2]]
        }

        # Test data
        test_request = {
            "query": "test query",
            "organizationId": "test-org",
            "limit": 2
        }

        # Make request
        response = client.post(
            "/knowledge/search",
            json=test_request,
            headers={"X-API-Key": TEST_API_KEY}
        )

        # Assertions
        assert response.status_code == 200
        assert len(response.json()["results"]) == 2
        assert response.json()["results"][0]["id"] == "doc1"
        assert response.json()["results"][0]["title"] == "Test Document"
        assert response.json()["results"][0]["content"] == "Test document content"
        assert response.json()["results"][0]["relevance"] == 0.9  # 1 - distance
        assert response.json()["results"][0]["url"] == "https://example.com"

        # Verify calls
        mock_generate_embedding.assert_called_once_with("test query")
        mock_collection.query.assert_called_once()

    @patch("app.verify_api_key")
    @patch("app.generate_embedding")
    @patch("app.knowledge_collection")
    def test_create_vector_embedding(self, mock_collection, mock_generate_embedding, mock_verify_api_key):
        """Test creating a vector embedding"""
        # Setup mocks
        mock_verify_api_key.return_value = True
        mock_generate_embedding.return_value = [0.1] * 1536
        mock_collection.add.return_value = None

        # Test data
        test_request = {
            "text": "test document",
            "metadata": {
                "title": "Test Document",
                "source": "knowledge_base",
                "organizationId": "test-org"
            }
        }

        # Make request
        response = client.post(
            "/vectors",
            json=test_request,
            headers={"X-API-Key": TEST_API_KEY}
        )

        # Assertions
        assert response.status_code == 200
        assert response.json()["status"] == "stored"
        assert "id" in response.json()
        assert response.json()["dimensions"] == 1536

        # Verify calls
        mock_generate_embedding.assert_called_once_with("test document")
        mock_collection.add.assert_called_once()

    @patch("app.verify_api_key")
    @patch("app.redis_client")
    def test_get_session_context(self, mock_redis, mock_verify_api_key):
        """Test retrieving session context"""
        # Setup mocks
        mock_verify_api_key.return_value = True
        mock_redis.get.return_value = json.dumps({
            "conversation_history": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"}
            ],
            "entities": {"name": "John"}
        })
        mock_redis.hset.return_value = True

        # Make request
        response = client.get(
            "/context/test-session",
            headers={"X-API-Key": TEST_API_KEY}
        )

        # Assertions
        assert response.status_code == 200
        assert response.json()["sessionId"] == "test-session"
        assert "conversation_history" in response.json()["context"]
        assert "entities" in response.json()["context"]
        assert len(response.json()["context"]["conversation_history"]) == 2

        # Verify Redis calls
        mock_redis.get.assert_called_once()
        mock_redis.hset.assert_called_once()  # For updating last_accessed

    @patch("app.verify_api_key")
    @patch("app.redis_client")
    def test_update_session_context(self, mock_redis, mock_verify_api_key):
        """Test updating session context"""
        # Setup mocks
        mock_verify_api_key.return_value = True
        mock_redis.set.return_value = True
        mock_redis.hset.return_value = True
        mock_redis.expire.return_value = True

        # Test data
        test_context = {
            "conversation_history": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
                {"role": "user", "content": "How are you?"}
            ],
            "entities": {"name": "John"}
        }

        # Make request
        response = client.post(
            "/context/test-session",
            json=test_context,
            headers={"X-API-Key": TEST_API_KEY}
        )

        # Assertions
        assert response.status_code == 200
        assert response.json()["sessionId"] == "test-session"
        assert response.json()["status"] == "updated"

        # Verify Redis calls
        mock_redis.set.assert_called_once()
        mock_redis.hset.assert_called_once()
        mock_redis.expire.assert_called_once()

    @patch("app.verify_api_key")
    @patch("app.get_memories")
    @patch("app.get_session_context")
    @patch("app.generate_embedding")
    def test_optimize_context(self, mock_generate_embedding, mock_get_session_context, 
                             mock_get_memories, mock_verify_api_key):
        """Test optimizing context window"""
        # Setup mocks
        mock_verify_api_key.return_value = True
        mock_generate_embedding.return_value = [0.1] * 1536
        
        # Mock get_memories
        mock_get_memories.return_value = {
            "userId": "test-user",
            "memories": [
                {
                    "id": "memory:test-user:long_term:preference",
                    "userId": "test-user",
                    "type": "long_term",
                    "key": "preference",
                    "value": {"preferred_language": "en"},
                    "metadata": {"importance": 0.8}
                }
            ]
        }
        
        # Mock get_session_context
        mock_get_session_context.return_value = {
            "sessionId": "test-session",
            "context": {
                "entities": {"product": "laptop"}
            }
        }

        # Test data
        test_request = {
            "conversation_history": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
                {"role": "user", "content": "I need help with my order"}
            ],
            "user_query": "I need help with my order",
            "userId": "test-user",
            "sessionId": "test-session"
        }

        # Make request
        response = client.post(
            "/optimize-context",
            json=test_request,
            headers={"X-API-Key": TEST_API_KEY}
        )

        # Assertions
        assert response.status_code == 200
        assert "optimized_context" in response.json()
        assert "conversation_history" in response.json()["optimized_context"]
        assert "relevant_memories" in response.json()["optimized_context"]
        assert "session_context" in response.json()["optimized_context"]
        
        # Verify the conversation history is preserved
        assert len(response.json()["optimized_context"]["conversation_history"]) == 4
        
        # Verify calls
        mock_get_memories.assert_called_once()
        mock_get_session_context.assert_called_once()

    @patch("app.redis_client")
    @patch("app.knowledge_collection")
    def test_health_check(self, mock_collection, mock_redis):
        """Test health check endpoint"""
        # Setup mocks
        mock_redis.ping.return_value = True
        mock_collection.count.return_value = 10

        # Make request
        response = client.get("/health")

        # Assertions
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert "redis" in response.json()["dependencies"]
        assert "chromadb" in response.json()["dependencies"]
        assert "openai" in response.json()["dependencies"]

        # Verify calls
        mock_redis.ping.assert_called_once()
        mock_collection.count.assert_called_once()


if __name__ == "__main__":
    pytest.main(["-xvs", "test_app.py"])
