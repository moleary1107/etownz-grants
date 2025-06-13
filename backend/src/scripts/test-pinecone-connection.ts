import { VectorDatabaseService } from '../services/vectorDatabase';
import { logger } from '../services/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testPineconeConnection() {
  try {
    logger.info('Testing Pinecone connection...');
    
    // Check if API key is present
    if (!process.env.PINECONE_API_KEY) {
      logger.error('PINECONE_API_KEY is not set in environment variables');
      process.exit(1);
    }
    
    logger.info('PINECONE_API_KEY is present');
    
    // Initialize vector database service
    const vectorDb = new VectorDatabaseService();
    
    // Initialize the index
    await vectorDb.initializeIndex();
    
    // Check health
    const health = await vectorDb.healthCheck();
    logger.info('Pinecone health check result:', health);
    
    if (health.status === 'healthy') {
      logger.info('✅ Pinecone connection successful!');
      logger.info(`Index exists: ${health.indexExists}`);
      logger.info(`Vector count: ${health.vectorCount}`);
      logger.info(`Namespaces: ${health.namespaces.join(', ')}`);
    } else {
      logger.error('❌ Pinecone connection failed:', health.error);
    }
    
  } catch (error) {
    logger.error('Error testing Pinecone connection:', error);
    process.exit(1);
  }
}

// Run the test
testPineconeConnection();