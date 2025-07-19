/**
 * Example usage of the Memory Engine Client in TypeScript
 */

import { MemoryEngineClient } from '../memory-client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Declare process.env to fix TypeScript errors
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MEMORY_ENGINE_URL?: string;
      MEMORY_ENGINE_API_KEY?: string;
    }
  }
}

// Initialize the client
const memoryClient = new MemoryEngineClient({
  baseUrl: process.env.MEMORY_ENGINE_URL || 'http://localhost:8000',
  apiKey: process.env.MEMORY_ENGINE_API_KEY,
  timeout: 5000
});

async function runExample() {
  try {
    console.log('Running Memory Engine Client TypeScript example...');
    
    // Check service health
    console.log('\n1. Checking service health...');
    const healthStatus = await memoryClient.healthCheck();
    console.log('Health status:', healthStatus);
    
    // Create a short-term memory
    console.log('\n2. Creating a short-term memory...');
    const userId = 'example-user-123';
    const shortTermMemory = await memoryClient.createMemory({
      userId,
      type: 'short_term',
      key: 'current_session',
      value: {
        last_topic: 'billing',
        sentiment: 'neutral',
        session_duration: 120
      },
      metadata: {
        source: 'example',
        importance: 0.5
      },
      ttl: 3600 // 1 hour
    });
    console.log('Short-term memory created:', shortTermMemory);
    
    // Create a long-term memory
    console.log('\n3. Creating a long-term memory...');
    const longTermMemory = await memoryClient.createMemory({
      userId,
      type: 'long_term',
      key: 'user_preferences',
      value: {
        preferred_language: 'en',
        communication_channel: 'email',
        product_interests: ['premium', 'enterprise']
      },
      metadata: {
        source: 'user_profile',
        importance: 0.8
      }
    });
    console.log('Long-term memory created:', longTermMemory);
    
    // Retrieve memories
    console.log('\n4. Retrieving all memories for user...');
    const allMemories = await memoryClient.getMemories(userId);
    console.log(`Found ${allMemories.memories.length} memories for user ${userId}`);
    
    // Retrieve specific memory type
    console.log('\n5. Retrieving long-term memories for user...');
    const longTermMemories = await memoryClient.getMemories(userId, 'long_term');
    console.log('Long-term memories:', longTermMemories);
    
    // Create a vector embedding for knowledge base
    console.log('\n6. Creating a vector embedding...');
    const vectorEmbedding = await memoryClient.createVectorEmbedding({
      text: 'How to reset your password: Go to the login page and click on "Forgot Password".',
      metadata: {
        title: 'Password Reset Instructions',
        organizationId: 'example-org-456',
        source: 'knowledge_base',
        category: 'account_management'
      }
    });
    console.log('Vector embedding created:', vectorEmbedding);
    
    // Search knowledge base
    console.log('\n7. Searching knowledge base...');
    const searchResults = await memoryClient.searchKnowledge({
      query: 'How do I reset my password?',
      organizationId: 'example-org-456',
      limit: 3,
      threshold: 0.6
    });
    console.log('Search results:', searchResults);
    
    // Update session context
    console.log('\n8. Updating session context...');
    const sessionId = 'example-session-789';
    const sessionContext = await memoryClient.updateSessionContext(sessionId, {
      user: {
        id: userId,
        name: 'Example User'
      },
      conversation: {
        topic: 'account_access',
        sentiment: 'frustrated',
        entities: {
          product: 'premium_subscription'
        }
      },
      last_updated: new Date().toISOString()
    });
    console.log('Session context updated:', sessionContext);
    
    // Get session context
    console.log('\n9. Getting session context...');
    const retrievedContext = await memoryClient.getSessionContext(sessionId);
    console.log('Retrieved context:', retrievedContext);
    
    // Optimize context for AI
    console.log('\n10. Optimizing context for AI...');
    const optimizedContext = await memoryClient.optimizeContext({
      conversationHistory: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'I need help with my account.' },
        { role: 'assistant', content: 'What specific issue are you having with your account?' },
        { role: 'user', content: 'I forgot my password and can\'t log in.' }
      ],
      userQuery: 'How do I reset my password?',
      userId,
      sessionId,
      maxTokens: 2000
    });
    console.log('Optimized context:', optimizedContext);
    
    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error running example:', error);
  }
}

runExample();
