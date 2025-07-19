#!/usr/bin/env python3
"""
Example usage of the Memory Engine Client in Python
"""

import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

# Import the client from parent directory
import sys
sys.path.append('..')
from memory_client import MemoryEngineClient, SyncMemoryEngineClient

# Load environment variables
load_dotenv()

# Initialize the client
memory_client = MemoryEngineClient(
    base_url=os.getenv("MEMORY_ENGINE_URL", "http://localhost:8000"),
    api_key=os.getenv("MEMORY_ENGINE_API_KEY"),
    timeout=5
)

# For synchronous usage
sync_client = SyncMemoryEngineClient(
    base_url=os.getenv("MEMORY_ENGINE_URL", "http://localhost:8000"),
    api_key=os.getenv("MEMORY_ENGINE_API_KEY"),
    timeout=5
)


async def run_async_example():
    """Run the async example using the async client"""
    try:
        print("Running Memory Engine Client example (async)...")
        
        # Check service health
        print("\n1. Checking service health...")
        health_status = await memory_client.health_check()
        print(f"Health status: {health_status}")
        
        # Create a short-term memory
        print("\n2. Creating a short-term memory...")
        user_id = "example-user-123"
        short_term_memory = await memory_client.create_memory(
            user_id=user_id,
            memory_type="short_term",
            key="current_session",
            value={
                "last_topic": "billing",
                "sentiment": "neutral",
                "session_duration": 120
            },
            metadata={
                "source": "example",
                "importance": 0.5
            },
            ttl=3600  # 1 hour
        )
        print(f"Short-term memory created: {short_term_memory}")
        
        # Create a long-term memory
        print("\n3. Creating a long-term memory...")
        long_term_memory = await memory_client.create_memory(
            user_id=user_id,
            memory_type="long_term",
            key="user_preferences",
            value={
                "preferred_language": "en",
                "communication_channel": "email",
                "product_interests": ["premium", "enterprise"]
            },
            metadata={
                "source": "user_profile",
                "importance": 0.8
            }
        )
        print(f"Long-term memory created: {long_term_memory}")
        
        # Retrieve memories
        print("\n4. Retrieving all memories for user...")
        all_memories = await memory_client.get_memories(user_id)
        print(f"Found {len(all_memories.get('memories', []))} memories for user {user_id}")
        
        # Retrieve specific memory type
        print("\n5. Retrieving long-term memories for user...")
        long_term_memories = await memory_client.get_memories(
            user_id=user_id,
            memory_type="long_term"
        )
        print(f"Long-term memories: {json.dumps(long_term_memories, indent=2)}")
        
        # Create a vector embedding for knowledge base
        print("\n6. Creating a vector embedding...")
        vector_embedding = await memory_client.create_vector_embedding(
            text="How to reset your password: Go to the login page and click on 'Forgot Password'.",
            metadata={
                "title": "Password Reset Instructions",
                "organizationId": "example-org-456",
                "source": "knowledge_base",
                "category": "account_management"
            }
        )
        print(f"Vector embedding created: {vector_embedding}")
        
        # Search knowledge base
        print("\n7. Searching knowledge base...")
        search_results = await memory_client.search_knowledge(
            query="How do I reset my password?",
            organization_id="example-org-456",
            limit=3,
            threshold=0.6
        )
        print(f"Search results: {json.dumps(search_results, indent=2)}")
        
        # Update session context
        print("\n8. Updating session context...")
        session_id = "example-session-789"
        session_context = await memory_client.update_session_context(
            session_id=session_id,
            context={
                "user": {
                    "id": user_id,
                    "name": "Example User"
                },
                "conversation": {
                    "topic": "account_access",
                    "sentiment": "frustrated",
                    "entities": {
                        "product": "premium_subscription"
                    }
                },
                "last_updated": datetime.now().isoformat()
            }
        )
        print(f"Session context updated: {session_context}")
        
        # Get session context
        print("\n9. Getting session context...")
        retrieved_context = await memory_client.get_session_context(session_id)
        print(f"Retrieved context: {json.dumps(retrieved_context, indent=2)}")
        
        # Optimize context for AI
        print("\n10. Optimizing context for AI...")
        optimized_context = await memory_client.optimize_context(
            conversation_history=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "I need help with my account."},
                {"role": "assistant", "content": "What specific issue are you having with your account?"},
                {"role": "user", "content": "I forgot my password and can't log in."}
            ],
            user_query="How do I reset my password?",
            user_id=user_id,
            session_id=session_id,
            max_tokens=2000
        )
        print(f"Optimized context: {json.dumps(optimized_context, indent=2)}")
        
        print("\nAsync example completed successfully!")
    except Exception as e:
        print(f"Error running async example: {e}")


def run_sync_example():
    """Run the sync example using the synchronous client"""
    try:
        print("\n\nRunning Memory Engine Client example (sync)...")
        
        # Check service health
        print("\n1. Checking service health...")
        health_status = sync_client.health_check()
        print(f"Health status: {health_status}")
        
        # Create a short-term memory
        print("\n2. Creating a short-term memory...")
        user_id = "example-user-456"
        short_term_memory = sync_client.create_memory(
            user_id=user_id,
            memory_type="short_term",
            key="current_session",
            value={
                "last_topic": "technical_support",
                "sentiment": "positive",
                "session_duration": 180
            },
            metadata={
                "source": "sync_example",
                "importance": 0.6
            },
            ttl=3600  # 1 hour
        )
        print(f"Short-term memory created: {short_term_memory}")
        
        # Get memories
        print("\n3. Getting memories...")
        memories = sync_client.get_memories(user_id)
        print(f"Memories: {json.dumps(memories, indent=2)}")
        
        print("\nSync example completed successfully!")
    except Exception as e:
        print(f"Error running sync example: {e}")


if __name__ == "__main__":
    # Run the async example
    asyncio.run(run_async_example())
    
    # Run the sync example
    run_sync_example()
