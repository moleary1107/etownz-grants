import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-pipeline',
    timestamp: new Date().toISOString()
  });
});

// Generate content endpoint
app.post('/generate', async (req, res) => {
  // TODO: Implement AI content generation
  res.json({ 
    message: 'AI generation endpoint', 
    content: 'Generated content will appear here',
    tokensUsed: 0 
  });
});

// Embeddings endpoint
app.post('/embeddings', async (req, res) => {
  // TODO: Implement text embeddings
  res.json({ 
    message: 'Embeddings endpoint',
    embedding: []
  });
});

app.listen(PORT, () => {
  console.log(`🤖 AI Pipeline service running on port ${PORT}`);
});

export default app;