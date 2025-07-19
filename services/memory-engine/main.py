import os
import json
import time
from typing import Dict, List, Optional, Any
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from loguru import logger
from dotenv import load_dotenv

from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from services.memory_manager import MemoryManager

# Load environment variables
load_dotenv()

# Configure logger
logger.add("memory_engine.log", rotation="10 MB", level=os.getenv("LOG_LEVEL", "INFO"))

# Initialize FastAPI app
app = FastAPI(
    title="Memory Engine Service",
    description="Long-term memory storage and retrieval using vector embeddings",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
embedding_service = EmbeddingService(api_key=os.getenv("OPENAI_API_KEY"))
vector_store = VectorStore(
    persistence_dir=os.getenv("CHROMA_PERSISTENCE_DIR", "./chroma_db"),
    embedding_service=embedding_service
)
memory_manager = MemoryManager(vector_store=vector_store)

# Pydantic models for request/response validation
class ConversationTurn(BaseModel):
    messageId: str
    message: str
    response: str
    timestamp: str
    channel: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Memory(BaseModel):
    userId: str
    sessionId: str
    history: List[Dict[str, Any]] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)
    firstInteraction: Optional[str] = None
    lastInteraction: Optional[str] = None

class MemoryRequest(BaseModel):
    userId: str
    sessionId: str
    conversationTurn: ConversationTurn
    memory: Optional[Memory] = None

class MemoryResponse(BaseModel):
    success: bool
    memory: Optional[Memory] = None
    error: Optional[str] = None

class SearchRequest(BaseModel):
    userId: str
    query: str
    limit: int = 5

class SearchResponse(BaseModel):
    success: bool
    memories: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    dependencies: Dict[str, Dict[str, str]]

# API endpoints
@app.post("/api/memory", response_model=MemoryResponse)
async def store_memory(request: MemoryRequest):
    """Store a conversation memory in the vector database"""
    try:
        await memory_manager.store_memory(
            user_id=request.userId,
            session_id=request.sessionId,
            conversation_turn=request.conversationTurn.dict(),
            memory=request.memory.dict() if request.memory else None
        )
        return MemoryResponse(success=True)
    except Exception as e:
        logger.error(f"Error storing memory: {str(e)}")
        return MemoryResponse(success=False, error=str(e))

@app.get("/api/memory", response_model=MemoryResponse)
async def get_memory(userId: str, sessionId: Optional[str] = None):
    """Retrieve memory for a user/session"""
    try:
        memory = await memory_manager.get_memory(user_id=userId, session_id=sessionId)
        return MemoryResponse(success=True, memory=memory)
    except Exception as e:
        logger.error(f"Error retrieving memory: {str(e)}")
        return MemoryResponse(success=False, error=str(e))

@app.get("/api/memory/search", response_model=SearchResponse)
async def search_memories(userId: str, query: str, limit: int = 5):
    """Search for relevant memories based on semantic similarity"""
    try:
        memories = await memory_manager.search_memories(
            user_id=userId,
            query=query,
            limit=limit
        )
        return SearchResponse(success=True, memories=memories)
    except Exception as e:
        logger.error(f"Error searching memories: {str(e)}")
        return SearchResponse(success=False, error=str(e))

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    dependencies_status = {
        "vector_db": {"status": "healthy" if vector_store.is_healthy() else "unhealthy"},
        "embedding_service": {"status": "healthy" if embedding_service.is_healthy() else "unhealthy"}
    }
    
    return HealthResponse(
        status="healthy" if all(d["status"] == "healthy" for d in dependencies_status.values()) else "unhealthy",
        timestamp=datetime.now().isoformat(),
        version=os.getenv("VERSION", "1.0.0"),
        dependencies=dependencies_status
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "3001")), reload=True)
