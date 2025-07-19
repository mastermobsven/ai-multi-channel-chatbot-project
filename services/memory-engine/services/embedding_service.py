import os
from typing import List, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential

import openai
from loguru import logger

class EmbeddingService:
    """Service for generating embeddings using OpenAI API"""
    
    def __init__(self, api_key: str = None):
        """Initialize the embedding service with OpenAI API key"""
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        openai.api_key = self.api_key
        self.model = "text-embedding-ada-002"
        self.healthy = True
        
        # Test connection on initialization
        try:
            self._get_embedding("Test connection")
            logger.info("Successfully connected to OpenAI API")
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI API: {str(e)}")
            self.healthy = False
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text using OpenAI API with retry logic"""
        try:
            response = openai.embeddings.create(
                model=self.model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error getting embedding: {str(e)}")
            self.healthy = False
            raise
    
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts"""
        if not texts:
            return []
        
        # Process in batches to avoid API limits
        batch_size = 100  # OpenAI recommends batches of 100
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                response = openai.embeddings.create(
                    model=self.model,
                    input=batch
                )
                # Sort embeddings by index to maintain original order
                sorted_embeddings = sorted(response.data, key=lambda x: x.index)
                batch_embeddings = [item.embedding for item in sorted_embeddings]
                all_embeddings.extend(batch_embeddings)
                
                # Update health status
                self.healthy = True
            except Exception as e:
                logger.error(f"Error getting batch embeddings: {str(e)}")
                self.healthy = False
                # Return empty embeddings for failed batch
                all_embeddings.extend([[0.0] * 1536] * len(batch))  # Ada embeddings are 1536 dimensions
        
        return all_embeddings
    
    def is_healthy(self) -> bool:
        """Check if the embedding service is healthy"""
        try:
            self._get_embedding("Health check")
            self.healthy = True
        except Exception:
            self.healthy = False
        
        return self.healthy
