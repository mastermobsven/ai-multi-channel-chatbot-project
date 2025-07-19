#!/usr/bin/env python3
"""
Memory Engine Client Library

This library provides a simple client for interacting with the Memory Engine Service.
"""

import json
import logging
from typing import Dict, List, Optional, Any, Union

import httpx

logger = logging.getLogger("memory_client")


class MemoryEngineClient:
    """Client for interacting with the Memory Engine Service."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: str = None,
        timeout: int = 10
    ):
        """
        Initialize the Memory Engine Client.

        Args:
            base_url: Base URL of the Memory Engine Service
            api_key: API key for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url
        self.api_key = api_key
        self.timeout = timeout
        self.headers = {"Content-Type": "application/json"}
        
        if api_key:
            self.headers["X-API-Key"] = api_key

    async def create_memory(
        self,
        user_id: str,
        memory_type: str,
        key: str,
        value: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
        ttl: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create a new memory or update an existing one.

        Args:
            user_id: User ID
            memory_type: Memory type ('short_term' or 'long_term')
            key: Unique identifier for this memory type
            value: Memory content
            metadata: Additional metadata
            ttl: Time to live in seconds (for short_term only)

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/memories"
        payload = {
            "userId": user_id,
            "type": memory_type,
            "key": key,
            "value": value,
            "metadata": metadata or {},
        }
        
        if ttl is not None:
            payload["ttl"] = ttl

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Error creating memory: {response.text}")
                response.raise_for_status()
                
            return response.json()

    async def get_memories(
        self,
        user_id: str,
        memory_type: Optional[str] = None,
        key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve memories for a user.

        Args:
            user_id: User ID
            memory_type: Optional memory type filter
            key: Optional key filter

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/memories/{user_id}"
        params = {}
        
        if memory_type:
            params["type"] = memory_type
            
        if key:
            params["key"] = key

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                url,
                headers=self.headers,
                params=params
            )
            
            if response.status_code != 200:
                logger.error(f"Error retrieving memories: {response.text}")
                response.raise_for_status()
                
            return response.json()

    async def search_knowledge(
        self,
        query: str,
        organization_id: str,
        limit: int = 5,
        threshold: float = 0.7
    ) -> Dict[str, Any]:
        """
        Search the knowledge base for relevant information.

        Args:
            query: Search query
            organization_id: Organization ID
            limit: Maximum number of results
            threshold: Minimum relevance threshold

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/knowledge/search"
        payload = {
            "query": query,
            "organizationId": organization_id,
            "limit": limit,
            "threshold": threshold
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Error searching knowledge base: {response.text}")
                response.raise_for_status()
                
            return response.json()

    async def create_vector_embedding(
        self,
        text: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Store a vector embedding for future similarity search.

        Args:
            text: Text to embed
            metadata: Metadata for the embedding

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/vectors"
        payload = {
            "text": text,
            "metadata": metadata
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Error creating vector embedding: {response.text}")
                response.raise_for_status()
                
            return response.json()

    async def get_session_context(
        self,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Get the context for a specific session.

        Args:
            session_id: Session ID

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/context/{session_id}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                url,
                headers=self.headers
            )
            
            if response.status_code != 200:
                logger.error(f"Error retrieving session context: {response.text}")
                response.raise_for_status()
                
            return response.json()

    async def update_session_context(
        self,
        session_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update the context for a specific session.

        Args:
            session_id: Session ID
            context: Session context

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/context/{session_id}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers=self.headers,
                json=context
            )
            
            if response.status_code != 200:
                logger.error(f"Error updating session context: {response.text}")
                response.raise_for_status()
                
            return response.json()

    async def optimize_context(
        self,
        conversation_history: List[Dict[str, str]],
        user_query: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        max_tokens: int = 4000
    ) -> Dict[str, Any]:
        """
        Optimize the context window for token efficiency.

        Args:
            conversation_history: Conversation history
            user_query: User query
            user_id: Optional user ID
            session_id: Optional session ID
            max_tokens: Maximum tokens

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/optimize-context"
        payload = {
            "conversation_history": conversation_history,
            "user_query": user_query,
            "max_tokens": max_tokens
        }
        
        if user_id:
            payload["userId"] = user_id
            
        if session_id:
            payload["sessionId"] = session_id

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Error optimizing context: {response.text}")
                response.raise_for_status()
                
            return response.json()

    async def health_check(self) -> Dict[str, Any]:
        """
        Check the health status of the Memory Engine Service.

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/health"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url)
            
            if response.status_code != 200:
                logger.error(f"Health check failed: {response.text}")
                response.raise_for_status()
                
            return response.json()


# Synchronous client for non-async environments
class SyncMemoryEngineClient:
    """Synchronous client for interacting with the Memory Engine Service."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: str = None,
        timeout: int = 10
    ):
        """
        Initialize the Synchronous Memory Engine Client.

        Args:
            base_url: Base URL of the Memory Engine Service
            api_key: API key for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url
        self.api_key = api_key
        self.timeout = timeout
        self.headers = {"Content-Type": "application/json"}
        
        if api_key:
            self.headers["X-API-Key"] = api_key

    def create_memory(
        self,
        user_id: str,
        memory_type: str,
        key: str,
        value: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
        ttl: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create a new memory or update an existing one.

        Args:
            user_id: User ID
            memory_type: Memory type ('short_term' or 'long_term')
            key: Unique identifier for this memory type
            value: Memory content
            metadata: Additional metadata
            ttl: Time to live in seconds (for short_term only)

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/memories"
        payload = {
            "userId": user_id,
            "type": memory_type,
            "key": key,
            "value": value,
            "metadata": metadata or {},
        }
        
        if ttl is not None:
            payload["ttl"] = ttl

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Error creating memory: {response.text}")
                response.raise_for_status()
                
            return response.json()

    def get_memories(
        self,
        user_id: str,
        memory_type: Optional[str] = None,
        key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve memories for a user.

        Args:
            user_id: User ID
            memory_type: Optional memory type filter
            key: Optional key filter

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/memories/{user_id}"
        params = {}
        
        if memory_type:
            params["type"] = memory_type
            
        if key:
            params["key"] = key

        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(
                url,
                headers=self.headers,
                params=params
            )
            
            if response.status_code != 200:
                logger.error(f"Error retrieving memories: {response.text}")
                response.raise_for_status()
                
            return response.json()

    def search_knowledge(
        self,
        query: str,
        organization_id: str,
        limit: int = 5,
        threshold: float = 0.7
    ) -> Dict[str, Any]:
        """
        Search the knowledge base for relevant information.

        Args:
            query: Search query
            organization_id: Organization ID
            limit: Maximum number of results
            threshold: Minimum relevance threshold

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/knowledge/search"
        payload = {
            "query": query,
            "organizationId": organization_id,
            "limit": limit,
            "threshold": threshold
        }

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Error searching knowledge base: {response.text}")
                response.raise_for_status()
                
            return response.json()

    def create_vector_embedding(
        self,
        text: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Store a vector embedding for future similarity search.

        Args:
            text: Text to embed
            metadata: Metadata for the embedding

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/vectors"
        payload = {
            "text": text,
            "metadata": metadata
        }

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Error creating vector embedding: {response.text}")
                response.raise_for_status()
                
            return response.json()

    def get_session_context(
        self,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Get the context for a specific session.

        Args:
            session_id: Session ID

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/context/{session_id}"

        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(
                url,
                headers=self.headers
            )
            
            if response.status_code != 200:
                logger.error(f"Error retrieving session context: {response.text}")
                response.raise_for_status()
                
            return response.json()

    def update_session_context(
        self,
        session_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update the context for a specific session.

        Args:
            session_id: Session ID
            context: Session context

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/context/{session_id}"

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                url,
                headers=self.headers,
                json=context
            )
            
            if response.status_code != 200:
                logger.error(f"Error updating session context: {response.text}")
                response.raise_for_status()
                
            return response.json()

    def optimize_context(
        self,
        conversation_history: List[Dict[str, str]],
        user_query: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        max_tokens: int = 4000
    ) -> Dict[str, Any]:
        """
        Optimize the context window for token efficiency.

        Args:
            conversation_history: Conversation history
            user_query: User query
            user_id: Optional user ID
            session_id: Optional session ID
            max_tokens: Maximum tokens

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/optimize-context"
        payload = {
            "conversation_history": conversation_history,
            "user_query": user_query,
            "max_tokens": max_tokens
        }
        
        if user_id:
            payload["userId"] = user_id
            
        if session_id:
            payload["sessionId"] = session_id

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Error optimizing context: {response.text}")
                response.raise_for_status()
                
            return response.json()

    def health_check(self) -> Dict[str, Any]:
        """
        Check the health status of the Memory Engine Service.

        Returns:
            Response from the Memory Engine Service
        """
        url = f"{self.base_url}/health"

        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(url)
            
            if response.status_code != 200:
                logger.error(f"Health check failed: {response.text}")
                response.raise_for_status()
                
            return response.json()
