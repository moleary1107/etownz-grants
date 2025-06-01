import express from 'express';
import { CronJob } from 'cron';
import { setupFileWatcher } from './services/fileWatcher';
import { DocumentationGenerator } from './services/documentationGenerator';
import { DiagramGenerator } from './services/diagramGenerator';
import { ArchitectureAnalyzer } from './services/architectureAnalyzer';
import { logger } from './services/logger';

const app = express();
const PORT = process.env.PORT || 9000;
const PROJECT_ROOT = process.env.PROJECT_ROOT || '/project';

app.use(express.json());

// Initialize services
const docGenerator = new DocumentationGenerator({
  outputDir: `${PROJECT_ROOT}/docs`,
  projectRoot: PROJECT_ROOT,
  includeTypes: true,
  includeTests: false
});
const diagramGenerator = new DiagramGenerator({
  outputDir: `${PROJECT_ROOT}/docs/diagrams`,
  format: 'mermaid'
});
const architectureAnalyzer = new ArchitectureAnalyzer(PROJECT_ROOT);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mcp-documentation',
    timestamp: new Date().toISOString()
  });
});

// Manual documentation generation
app.post('/generate/docs', async (req, res) => {
  try {
    logger.info('Starting manual documentation generation...');
    await docGenerator.generateProjectDocs();
    res.json({ message: 'Documentation generated successfully' });
  } catch (error) {
    logger.error('Documentation generation failed:', error);
    res.status(500).json({ error: 'Documentation generation failed' });
  }
});

// Manual diagram generation
app.post('/generate/diagrams', async (req, res) => {
  try {
    logger.info('Starting manual diagram generation...');
    await diagramGenerator.generateAllDiagrams();
    res.json({ message: 'Diagrams generated successfully' });
  } catch (error) {
    logger.error('Diagram generation failed:', error);
    res.status(500).json({ error: 'Diagram generation failed' });
  }
});

// Architecture analysis
app.post('/analyze/architecture', async (req, res) => {
  try {
    logger.info('Starting architecture analysis...');
    const analysis = await architectureAnalyzer.analyzeProject();
    res.json(analysis);
  } catch (error) {
    logger.error('Architecture analysis failed:', error);
    res.status(500).json({ error: 'Architecture analysis failed' });
  }
});

// Get current documentation status
app.get('/status', async (req, res) => {
  try {
    const status = { 
      service: 'documentation',
      lastGenerated: new Date().toISOString(),
      status: 'active'
    };
    res.json(status);
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

// Setup file watcher for automatic documentation updates
setupFileWatcher([PROJECT_ROOT], async (filePath: string, event: string) => {
  logger.info(`File ${event}: ${filePath}`);
  
  // Determine what to regenerate based on file type
  if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    await docGenerator.generateProjectDocs();
    await diagramGenerator.generateArchitectureDiagram();
  } else if (filePath.endsWith('.json') && filePath.includes('package.json')) {
    await docGenerator.generateProjectDocs();
  } else if (filePath.includes('docker') || filePath.includes('yml')) {
    await diagramGenerator.generateAllDiagrams();
  }
});

// Scheduled documentation updates (every 6 hours)
const docUpdateJob = new CronJob('0 */6 * * *', async () => {
  logger.info('Running scheduled documentation update...');
  try {
    await docGenerator.generateProjectDocs();
    await diagramGenerator.generateAllDiagrams();
  } catch (error) {
    logger.error('Scheduled documentation update failed:', error);
  }
});

// Start scheduled job
docUpdateJob.start();

// Initial generation on startup
setTimeout(async () => {
  logger.info('Running initial documentation generation...');
  try {
    await docGenerator.generateProjectDocs();
    await diagramGenerator.generateAllDiagrams();
  } catch (error) {
    logger.error('Initial documentation generation failed:', error);
  }
}, 5000); // Wait 5 seconds for other services to start

app.listen(PORT, () => {
  logger.info(`🤖 MCP Documentation Server running on port ${PORT}`);
  logger.info(`📁 Monitoring project at: ${PROJECT_ROOT}`);
  logger.info(`📚 Auto-documentation and diagramming active`);
});

export default app;