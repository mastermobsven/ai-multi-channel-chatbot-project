#!/usr/bin/env python3
"""
Memory Engine Service for AI Customer Support Platform

This service manages the long-term memory and context retrieval for the chatbot,
including vector embeddings, knowledge base search, and memory management.
"""

import os
import json
import time
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union

import chromadb
import openai
import redis
from fastapi import FastAPI, HTTPException, Depends, Header, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("memory-engine")

# Initialize FastAPI app
app = FastAPI(
    title="Memory Engine API",
    description="API for managing chatbot memory and context",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    logger.warning("OPENAI_API_KEY not set. Embeddings functionality will be limited.")

openai_client = openai.OpenAI(api_key=openai_api_key)

# Initialize Redis client
redis_host = os.getenv("REDIS_HOST", "redis")
redis_port = int(os.getenv("REDIS_PORT", "6379"))
redis_password = os.getenv("REDIS_PASSWORD", "")
redis_client = redis.Redis(
    host=redis_host,
    port=redis_port,
    password=redis_password,
    decode_responses=True
)

# Initialize ChromaDB client
chroma_host = os.getenv("CHROMA_HOST", "chroma")
chroma_port = int(os.getenv("CHROMA_PORT", "8000"))
chroma_client = chromadb.HttpClient(host=chroma_host, port=chroma_port)

# Create collections if they don't exist
try:
    knowledge_collection = chroma_client.get_or_create_collection(
        name="knowledge_base",
        metadata={"hnsw:space": "cosine"}
    )
    memory_collection = chroma_client.get_or_create_collection(
        name="customer_memory",
        metadata={"hnsw:space": "cosine"}
    )
    logger.info("ChromaDB collections initialized")
except Exception as e:
    logger.error(f"Error initializing ChromaDB collections: {e}")
    knowledge_collection = None
    memory_collection = None

# API Key authentication
def verify_api_key(x_api_key: str = Header(...)):
    """Verify the API key from the header."""
    valid_api_key = os.getenv("MEMORY_ENGINE_API_KEY")
    if not valid_api_key:
        logger.warning("MEMORY_ENGINE_API_KEY not set. API key authentication disabled.")
        return True
    
    if x_api_key != valid_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True

# Request models
class MemoryItem(BaseModel):
    """Model for a memory item."""
    userId: str
    type: str = Field(..., description="Memory type: 'short_term' or 'long_term'")
    key: str = Field(..., description="Unique identifier for this memory type")
    value: Dict[str, Any] = Field(..., description="Memory content")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")
    ttl: Optional[int] = Field(default=None, description="Time to live in seconds (for short_term only)")

class KnowledgeSearchRequest(BaseModel):
    """Model for a knowledge base search request."""
    query: str
    organizationId: str
    limit: int = 5
    threshold: float = 0.7

class VectorEmbeddingRequest(BaseModel):
    """Model for a vector embedding request."""
    text: str
    metadata: Dict[str, Any]

# Response models
class MemoryResponse(BaseModel):
    """Model for a memory response."""
    id: str
    status: str
    userId: str
    type: str

class KnowledgeSearchResult(BaseModel):
    """Model for a knowledge search result."""
    id: str
    title: str
    content: str
    relevance: float
    source: str
    url: Optional[str] = None

class KnowledgeSearchResponse(BaseModel):
    """Model for a knowledge search response."""
    results: List[KnowledgeSearchResult]

class VectorEmbeddingResponse(BaseModel):
    """Model for a vector embedding response."""
    id: str
    status: str
    dimensions: int

class HealthResponse(BaseModel):
    """Model for a health check response."""
    status: str
    version: str
    dependencies: Dict[str, str]

# Helper functions
def generate_embedding(text: str) -> List[float]:
    """Generate an embedding vector for the given text."""
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        # Return a zero vector as fallback (not ideal but prevents crashes)
        return [0.0] * 1536

def store_short_term_memory(memory_item: MemoryItem) -> str:
    """Store a short-term memory in Redis."""
    memory_id = f"memory:{memory_item.userId}:{memory_item.type}:{memory_item.key}"
    memory_data = {
        "id": memory_id,
        "userId": memory_item.userId,
        "type": memory_item.type,
        "key": memory_item.key,
        "value": json.dumps(memory_item.value),
        "metadata": json.dumps(memory_item.metadata) if memory_item.metadata else "{}",
        "created_at": datetime.now().isoformat(),
        "last_accessed": datetime.now().isoformat()
    }
    
    # Store in Redis
    redis_client.hset(memory_id, mapping=memory_data)
    
    # Set TTL if provided
    if memory_item.ttl:
        redis_client.expire(memory_id, memory_item.ttl)
    
    # Add to user's memory index
    redis_client.sadd(f"user:{memory_item.userId}:memories", memory_id)
    
    return memory_id

def store_long_term_memory(memory_item: MemoryItem, background_tasks: BackgroundTasks) -> str:
    """Store a long-term memory in ChromaDB with vector embedding."""
    memory_id = f"memory:{memory_item.userId}:{memory_item.type}:{memory_item.key}"
    
    # Convert memory value to string for embedding
    memory_text = json.dumps(memory_item.value)
    
    # Generate embedding in the background
    background_tasks.add_task(
        store_memory_embedding, 
        memory_id, 
        memory_item.userId, 
        memory_text, 
        memory_item.metadata or {}
    )
    
    return memory_id

def store_memory_embedding(memory_id: str, user_id: str, text: str, metadata: Dict[str, Any]):
    """Store memory embedding in ChromaDB (called as a background task)."""
    try:
        # Generate embedding
        embedding = generate_embedding(text)
        
        # Prepare metadata
        meta = {
            "userId": user_id,
            "created_at": datetime.now().isoformat(),
            **metadata
        }
        
        # Store in ChromaDB
        memory_collection.upsert(
            ids=[memory_id],
            embeddings=[embedding],
            metadatas=[meta],
            documents=[text]
        )
        
        logger.info(f"Stored memory embedding for {memory_id}")
    except Exception as e:
        logger.error(f"Error storing memory embedding: {e}")

# API Routes
@app.post("/memories", response_model=MemoryResponse, dependencies=[Depends(verify_api_key)])
async def create_memory(memory_item: MemoryItem, background_tasks: BackgroundTasks):
    """Create a new memory or update an existing one."""
    try:
        if memory_item.type == "short_term":
            memory_id = store_short_term_memory(memory_item)
        elif memory_item.type == "long_term":
            memory_id = store_long_term_memory(memory_item, background_tasks)
        else:
            raise HTTPException(status_code=400, detail="Invalid memory type. Must be 'short_term' or 'long_term'")
        
        return {
            "id": memory_id,
            "status": "stored",
            "userId": memory_item.userId,
            "type": memory_item.type
        }
    except Exception as e:
        logger.error(f"Error creating memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/memories/{user_id}", dependencies=[Depends(verify_api_key)])
async def get_memories(user_id: str, type: Optional[str] = None, key: Optional[str] = None):
    """Retrieve memories for a user."""
    try:
        # Get all memory IDs for the user
        memory_ids = redis_client.smembers(f"user:{user_id}:memories")
        memories = []
        
        # Filter by type if specified
        if type:
            memory_ids = [mid for mid in memory_ids if f":{type}:" in mid]
        
        # Filter by key if specified
        if key:
            memory_ids = [mid for mid in memory_ids if mid.endswith(f":{key}")]
        
        # Retrieve each memory
        for memory_id in memory_ids:
            memory_data = redis_client.hgetall(memory_id)
            if memory_data:
                # Parse JSON fields
                if "value" in memory_data:
                    memory_data["value"] = json.loads(memory_data["value"])
                if "metadata" in memory_data:
                    memory_data["metadata"] = json.loads(memory_data["metadata"])
                
                # Update last accessed time
                redis_client.hset(memory_id, "last_accessed", datetime.now().isoformat())
                
                memories.append(memory_data)
        
        # If memories not found in Redis and type is long_term, try ChromaDB
        if type == "long_term" and not memories and memory_collection:
            query_results = memory_collection.query(
                query_texts=[""],  # Empty query to match metadata only
                where={"userId": user_id},
                include=["documents", "metadatas"]
            )
            
            for i, doc in enumerate(query_results.get("documents", [])):
                metadata = query_results.get("metadatas", [])[i] if i < len(query_results.get("metadatas", [])) else {}
                memory_id = query_results.get("ids", [])[i] if i < len(query_results.get("ids", [])) else f"memory:{user_id}:long_term:{i}"
                
                try:
                    value = json.loads(doc)
                except:
                    value = {"content": doc}
                
                memories.append({
                    "id": memory_id,
                    "userId": user_id,
                    "type": "long_term",
                    "key": memory_id.split(":")[-1],
                    "value": value,
                    "metadata": metadata,
                    "created_at": metadata.get("created_at", datetime.now().isoformat()),
                    "last_accessed": datetime.now().isoformat()
                })
        
        return {
            "userId": user_id,
            "memories": memories
        }
    except Exception as e:
        logger.error(f"Error retrieving memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/knowledge/search", response_model=KnowledgeSearchResponse, dependencies=[Depends(verify_api_key)])
async def search_knowledge(search_request: KnowledgeSearchRequest):
    """Search the knowledge base for relevant information."""
    try:
        if not knowledge_collection:
            raise HTTPException(status_code=503, detail="Knowledge base not available")
        
        # Generate embedding for the query
        query_embedding = generate_embedding(search_request.query)
        
        # Search in ChromaDB
        results = knowledge_collection.query(
            query_embeddings=[query_embedding],
            where={"organizationId": search_request.organizationId},
            n_results=search_request.limit,
            include=["documents", "metadatas", "distances"]
        )
        
        search_results = []
        
        for i, doc in enumerate(results.get("documents", [])[0]):
            if i >= len(results.get("metadatas", [])[0]) or i >= len(results.get("distances", [])[0]):
                continue
                
            metadata = results["metadatas"][0][i]
            distance = results["distances"][0][i]
            
            # Convert distance to relevance score (1 - distance, since we use cosine distance)
            relevance = 1 - distance
            
            # Skip results below threshold
            if relevance < search_request.threshold:
                continue
                
            search_results.append(KnowledgeSearchResult(
                id=results["ids"][0][i],
                title=metadata.get("title", "Untitled"),
                content=doc,
                relevance=round(relevance, 2),
                source=metadata.get("source", "knowledge_base"),
                url=metadata.get("url")
            ))
        
        return {"results": search_results}
    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectors", response_model=VectorEmbeddingResponse, dependencies=[Depends(verify_api_key)])
async def create_vector_embedding(request: VectorEmbeddingRequest):
    """Store a vector embedding for future similarity search."""
    try:
        if not knowledge_collection:
            raise HTTPException(status_code=503, detail="Vector database not available")
        
        # Generate a unique ID
        vector_id = f"vec-{uuid.uuid4()}"
        
        # Generate embedding
        embedding = generate_embedding(request.text)
        
        # Store in ChromaDB
        knowledge_collection.add(
            ids=[vector_id],
            embeddings=[embedding],
            metadatas=[request.metadata],
            documents=[request.text]
        )
        
        return {
            "id": vector_id,
            "status": "stored",
            "dimensions": len(embedding)
        }
    except Exception as e:
        logger.error(f"Error creating vector embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/context/{session_id}", dependencies=[Depends(verify_api_key)])
async def get_session_context(session_id: str):
    """Get the context for a specific session."""
    try:
        # Get session context from Redis
        context_key = f"session:{session_id}:context"
        context_data = redis_client.get(context_key)
        
        if not context_data:
            return {"sessionId": session_id, "context": {}}
        
        context = json.loads(context_data)
        
        # Update last accessed time
        redis_client.hset(f"session:{session_id}:metadata", "last_accessed", datetime.now().isoformat())
        
        return {
            "sessionId": session_id,
            "context": context
        }
    except Exception as e:
        logger.error(f"Error retrieving session context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/context/{session_id}", dependencies=[Depends(verify_api_key)])
async def update_session_context(session_id: str, context: Dict[str, Any]):
    """Update the context for a specific session."""
    try:
        # Store session context in Redis
        context_key = f"session:{session_id}:context"
        redis_client.set(context_key, json.dumps(context))
        
        # Set metadata
        redis_client.hset(
            f"session:{session_id}:metadata", 
            mapping={
                "last_updated": datetime.now().isoformat(),
                "last_accessed": datetime.now().isoformat()
            }
        )
        
        # Set TTL (24 hours by default)
        ttl = int(os.getenv("SESSION_CONTEXT_TTL", "86400"))
        redis_client.expire(context_key, ttl)
        
        return {
            "sessionId": session_id,
            "status": "updated"
        }
    except Exception as e:
        logger.error(f"Error updating session context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize-context", dependencies=[Depends(verify_api_key)])
async def optimize_context(request: Dict[str, Any]):
    """Optimize the context window for token efficiency."""
    try:
        conversation_history = request.get("conversation_history", [])
        user_query = request.get("user_query", "")
        user_id = request.get("userId")
        session_id = request.get("sessionId")
        max_tokens = request.get("max_tokens", 4000)
        
        # Get relevant memories if user_id is provided
        relevant_memories = []
        if user_id:
            # Get long-term memories
            user_memories = await get_memories(user_id, type="long_term")
            memories = user_memories.get("memories", [])
            
            # Generate embedding for the query to find relevant memories
            if memories and user_query:
                query_embedding = generate_embedding(user_query)
                
                # Prepare memory texts and metadata
                memory_texts = []
                memory_metadata = []
                
                for memory in memories:
                    if isinstance(memory["value"], dict):
                        memory_text = json.dumps(memory["value"])
                    else:
                        memory_text = str(memory["value"])
                    
                    memory_texts.append(memory_text)
                    memory_metadata.append(memory)
                
                # Get memory embeddings
                memory_embeddings = [generate_embedding(text) for text in memory_texts]
                
                # Calculate relevance scores (dot product)
                relevance_scores = []
                for memory_embedding in memory_embeddings:
                    # Calculate cosine similarity
                    dot_product = sum(a * b for a, b in zip(query_embedding, memory_embedding))
                    magnitude1 = sum(a * a for a in query_embedding) ** 0.5
                    magnitude2 = sum(b * b for b in memory_embedding) ** 0.5
                    similarity = dot_product / (magnitude1 * magnitude2) if magnitude1 * magnitude2 > 0 else 0
                    relevance_scores.append(similarity)
                
                # Sort memories by relevance
                sorted_memories = sorted(
                    zip(memory_metadata, relevance_scores),
                    key=lambda x: x[1],
                    reverse=True
                )
                
                # Add top relevant memories
                for memory, score in sorted_memories[:3]:
                    if score > 0.7:  # Only include highly relevant memories
                        relevant_memories.append({
                            "content": memory["value"],
                            "relevance": round(score, 2)
                        })
        
        # Get session context if session_id is provided
        session_context = {}
        if session_id:
            try:
                context_response = await get_session_context(session_id)
                session_context = context_response.get("context", {})
            except:
                pass
        
        # Optimize conversation history to fit within token limit
        optimized_history = conversation_history
        
        # If history is too long, keep the first few messages and the most recent ones
        if len(conversation_history) > 10:
            # Keep the first 2 messages (usually system prompt and initial greeting)
            # and the most recent 8 messages
            optimized_history = conversation_history[:2] + conversation_history[-8:]
        
        return {
            "optimized_context": {
                "conversation_history": optimized_history,
                "relevant_memories": relevant_memories,
                "session_context": session_context
            }
        }
    except Exception as e:
        logger.error(f"Error optimizing context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Check the health status of the Memory Engine service."""
    # Check Redis connection
    redis_status = "healthy"
    try:
        redis_client.ping()
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
    
    # Check ChromaDB connection
    chroma_status = "healthy"
    try:
        if knowledge_collection:
            knowledge_collection.count()
        else:
            chroma_status = "unavailable"
    except Exception as e:
        chroma_status = f"unhealthy: {str(e)}"
    
    # Check OpenAI API
    openai_status = "healthy"
    if not openai_api_key:
        openai_status = "unconfigured"
    
    return HealthResponse(
        status="healthy" if redis_status == "healthy" and chroma_status == "healthy" else "degraded",
        version="1.0.0",
        dependencies={
            "redis": redis_status,
            "chromadb": chroma_status,
            "openai": openai_status
        }
    )

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
