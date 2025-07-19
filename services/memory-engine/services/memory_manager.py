import json
from typing import Dict, List, Any, Optional
from datetime import datetime

from loguru import logger
import openai

from services.vector_store import VectorStore

class MemoryManager:
    """Manager for handling memory operations and summarization"""
    
    def __init__(self, vector_store: VectorStore):
        """Initialize the memory manager with a vector store"""
        self.vector_store = vector_store
        self.openai_client = openai.OpenAI(api_key=vector_store.embedding_service.api_key)
    
    async def store_memory(
        self, 
        user_id: str, 
        session_id: str, 
        conversation_turn: Dict[str, Any],
        memory: Optional[Dict[str, Any]] = None
    ) -> str:
        """Store a conversation memory"""
        try:
            # Prepare memory data
            timestamp = conversation_turn.get("timestamp", datetime.now().isoformat())
            
            memory_data = {
                "userId": user_id,
                "sessionId": session_id,
                "message": conversation_turn.get("message", ""),
                "response": conversation_turn.get("response", ""),
                "messageId": conversation_turn.get("messageId", ""),
                "timestamp": timestamp,
                "channel": conversation_turn.get("channel", "unknown"),
                "metadata": conversation_turn.get("metadata", {})
            }
            
            # If full memory context is provided, include it
            if memory:
                memory_data["context"] = memory.get("context", {})
                memory_data["history"] = memory.get("history", [])
            
            # Store in vector database
            memory_id = self.vector_store.store_memory(user_id, memory_data)
            
            # Check if we need to summarize the context (if history is getting too large)
            if memory and "history" in memory and len(memory["history"]) > 20:
                await self._summarize_context(user_id, session_id, memory)
            
            return memory_id
        except Exception as e:
            logger.error(f"Error storing memory: {str(e)}")
            raise
    
    async def get_memory(self, user_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve memory for a user/session"""
        try:
            # Get all memories for the user
            memories = self.vector_store.get_all_user_memories(user_id)
            
            # Filter by session if provided
            if session_id:
                memories = [m for m in memories if m.get("sessionId") == session_id]
            
            # Sort by timestamp
            memories.sort(key=lambda x: x.get("timestamp", ""))
            
            # Extract conversation history
            history = []
            context = {}
            first_interaction = None
            last_interaction = None
            
            for memory in memories:
                # Add to history if it has message and response
                if "message" in memory and "response" in memory:
                    history.append({
                        "messageId": memory.get("messageId", ""),
                        "message": memory.get("message", ""),
                        "response": memory.get("response", ""),
                        "timestamp": memory.get("timestamp", ""),
                        "channel": memory.get("channel", "unknown"),
                        "metadata": memory.get("metadata", {})
                    })
                
                # Update context if available
                if "context" in memory and isinstance(memory["context"], dict):
                    context.update(memory["context"])
                
                # Track first and last interaction
                timestamp = memory.get("timestamp")
                if timestamp:
                    if not first_interaction or timestamp < first_interaction:
                        first_interaction = timestamp
                    if not last_interaction or timestamp > last_interaction:
                        last_interaction = timestamp
            
            # Construct memory object
            memory_obj = {
                "userId": user_id,
                "sessionId": session_id or "",
                "history": history,
                "context": context,
                "firstInteraction": first_interaction,
                "lastInteraction": last_interaction
            }
            
            return memory_obj
        except Exception as e:
            logger.error(f"Error retrieving memory: {str(e)}")
            raise
    
    async def search_memories(self, user_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant memories based on semantic similarity"""
        try:
            return self.vector_store.search_memories(user_id, query, limit)
        except Exception as e:
            logger.error(f"Error searching memories: {str(e)}")
            raise
    
    async def _summarize_context(self, user_id: str, session_id: str, memory: Dict[str, Any]) -> Dict[str, Any]:
        """Summarize conversation context when history gets too large"""
        try:
            # Extract conversation history
            history = memory.get("history", [])
            if len(history) < 5:  # Don't summarize if history is too short
                return memory
            
            # Prepare conversation for summarization
            conversation = []
            for turn in history:
                conversation.append(f"User: {turn.get('message', '')}")
                conversation.append(f"Assistant: {turn.get('response', '')}")
            
            conversation_text = "\n".join(conversation)
            
            # Call OpenAI to summarize
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": """Summarize the key points from this customer support conversation. 
                        Extract: 
                        1. Customer's main issues or requests
                        2. Important details provided by the customer (e.g., account info, product details)
                        3. Solutions or actions suggested
                        4. Any unresolved issues
                        
                        Format as a concise JSON with these keys: "issues", "details", "solutions", "unresolved".
                        Keep each value brief but informative."""
                    },
                    {
                        "role": "user",
                        "content": conversation_text
                    }
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            summary_text = response.choices[0].message.content
            
            # Try to parse as JSON
            try:
                summary = json.loads(summary_text)
            except json.JSONDecodeError:
                # If parsing fails, use the raw text
                summary = {"summary": summary_text}
            
            # Update context with summary
            memory["context"]["conversation_summary"] = summary
            
            # Keep only the most recent conversation turns
            memory["history"] = history[-10:]  # Keep the 10 most recent turns
            
            logger.info(f"Summarized context for user {user_id}, session {session_id}")
            
            return memory
        except Exception as e:
            logger.error(f"Error summarizing context: {str(e)}")
            return memory  # Return original memory on error
