import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'crawler',
    timestamp: new Date().toISOString()
  });
});

// Manual crawl trigger
app.post('/crawl/trigger', async (req, res) => {
  // TODO: Implement manual crawl trigger
  res.json({ message: 'Crawl triggered', status: 'started' });
});

// Crawl status
app.get('/crawl/status', async (req, res) => {
  // TODO: Get crawl status
  res.json({ status: 'idle', lastRun: null });
});

app.listen(PORT, () => {
  console.log(`🕷️ Crawler service running on port ${PORT}`);
});

export default app;