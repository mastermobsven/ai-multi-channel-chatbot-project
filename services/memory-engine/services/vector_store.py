import os
import json
import uuid
from typing import List, Dict, Any, Optional, Tuple

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from loguru import logger

from services.embedding_service import EmbeddingService

class VectorStore:
    """Vector database for storing and retrieving memory embeddings"""
    
    def __init__(self, persistence_dir: str, embedding_service: EmbeddingService):
        """Initialize the vector store with ChromaDB"""
        self.persistence_dir = persistence_dir
        self.embedding_service = embedding_service
        
        # Ensure persistence directory exists
        os.makedirs(persistence_dir, exist_ok=True)
        
        # Initialize ChromaDB client
        try:
            self.client = chromadb.PersistentClient(
                path=persistence_dir,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            logger.info(f"ChromaDB initialized with persistence at {persistence_dir}")
            
            # Create custom embedding function using our service
            self.embedding_function = embedding_functions.UserFunction(
                lambda texts: self.embedding_service.get_embeddings(texts)
            )
            
            # Create or get collections
            self.memory_collection = self.client.get_or_create_collection(
                name="memory",
                embedding_function=self.embedding_function,
                metadata={"description": "User conversation memories"}
            )
            
            self.healthy = True
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {str(e)}")
            self.healthy = False
            raise
    
    def store_memory(self, user_id: str, memory_data: Dict[str, Any]) -> str:
        """Store a memory in the vector database"""
        try:
            # Generate a unique ID for this memory
            memory_id = str(uuid.uuid4())
            
            # Create document for embedding
            document = self._prepare_document(memory_data)
            
            # Store in ChromaDB
            self.memory_collection.add(
                ids=[memory_id],
                documents=[document],
                metadatas=[{
                    "user_id": user_id,
                    "session_id": memory_data.get("sessionId", ""),
                    "timestamp": memory_data.get("timestamp", ""),
                    "channel": memory_data.get("channel", ""),
                    "full_data": json.dumps(memory_data)
                }]
            )
            
            logger.info(f"Stored memory {memory_id} for user {user_id}")
            return memory_id
        except Exception as e:
            logger.error(f"Error storing memory: {str(e)}")
            self.healthy = False
            raise
    
    def search_memories(self, user_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant memories based on semantic similarity"""
        try:
            # Query the vector database
            results = self.memory_collection.query(
                query_texts=[query],
                where={"user_id": user_id},
                n_results=limit
            )
            
            # Process results
            memories = []
            if results and results["metadatas"] and len(results["metadatas"]) > 0:
                for i, metadata in enumerate(results["metadatas"][0]):
                    try:
                        # Extract full memory data from metadata
                        full_data = json.loads(metadata.get("full_data", "{}"))
                        
                        # Add distance/similarity score
                        if "distances" in results and len(results["distances"]) > 0:
                            full_data["similarity_score"] = results["distances"][0][i]
                        
                        memories.append(full_data)
                    except json.JSONDecodeError:
                        logger.error(f"Error decoding memory data for result {i}")
            
            logger.info(f"Found {len(memories)} relevant memories for user {user_id}")
            return memories
        except Exception as e:
            logger.error(f"Error searching memories: {str(e)}")
            self.healthy = False
            return []
    
    def get_all_user_memories(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all memories for a specific user"""
        try:
            results = self.memory_collection.get(
                where={"user_id": user_id}
            )
            
            memories = []
            if results and results["metadatas"]:
                for metadata in results["metadatas"]:
                    try:
                        full_data = json.loads(metadata.get("full_data", "{}"))
                        memories.append(full_data)
                    except json.JSONDecodeError:
                        logger.error("Error decoding memory data")
            
            return memories
        except Exception as e:
            logger.error(f"Error getting user memories: {str(e)}")
            self.healthy = False
            return []
    
    def delete_user_memories(self, user_id: str) -> bool:
        """Delete all memories for a specific user"""
        try:
            self.memory_collection.delete(
                where={"user_id": user_id}
            )
            logger.info(f"Deleted all memories for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting user memories: {str(e)}")
            self.healthy = False
            return False
    
    def _prepare_document(self, memory_data: Dict[str, Any]) -> str:
        """Prepare a document for embedding from memory data"""
        # Extract the most important information for embedding
        parts = []
        
        # Add user message
        if "message" in memory_data:
            parts.append(f"User: {memory_data['message']}")
        
        # Add AI response
        if "response" in memory_data:
            parts.append(f"Assistant: {memory_data['response']}")
        
        # Add any context information
        if "context" in memory_data and isinstance(memory_data["context"], dict):
            for key, value in memory_data["context"].items():
                parts.append(f"{key}: {value}")
        
        # Combine all parts
        document = "\n".join(parts)
        
        return document
    
    def is_healthy(self) -> bool:
        """Check if the vector store is healthy"""
        try:
            # Simple health check - try to get collection info
            self.client.list_collections()
            self.healthy = True
        except Exception:
            self.healthy = False
        
        return self.healthy
