#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function initializePinecone() {
  try {
    console.log('Initializing Pinecone...');
    
    // Check for API key
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY not found in environment variables');
    }

    // Initialize Pinecone client
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    const indexName = 'etownz-grants';

    // Check if index already exists
    console.log(`Checking if index "${indexName}" exists...`);
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);

    if (indexExists) {
      console.log(`Index "${indexName}" already exists.`);
      
      // Get index details
      const indexDetails = await pc.describeIndex(indexName);
      console.log('Index details:', JSON.stringify(indexDetails, null, 2));
    } else {
      console.log(`Creating index "${indexName}"...`);
      
      // Create index with 1536 dimensions for OpenAI embeddings
      // Using serverless spec for cost efficiency
      await pc.createIndex({
        name: indexName,
        dimension: 1536, // OpenAI embeddings dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      console.log(`Index "${indexName}" created successfully!`);
      
      // Wait for index to be ready
      console.log('Waiting for index to be ready...');
      let ready = false;
      while (!ready) {
        const indexDetails = await pc.describeIndex(indexName);
        ready = indexDetails.status?.ready;
        if (!ready) {
          console.log('Index is initializing...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      console.log('Index is ready!');
    }

    // Test the index connection
    console.log('Testing index connection...');
    const index = pc.index(indexName);
    const stats = await index.describeIndexStats();
    console.log('Index stats:', JSON.stringify(stats, null, 2));

    console.log('\nPinecone initialization complete!');
    console.log(`Index "${indexName}" is ready for use.`);
    
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    process.exit(1);
  }
}

// Run the initialization
initializePinecone();