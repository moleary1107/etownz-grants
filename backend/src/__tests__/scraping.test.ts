import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { errorHandler } from '../middleware/errorHandler';
import scrapingRoutes from '../routes/scraping';
import { enhancedFirecrawlService } from '../services/enhancedFirecrawlService';

// Mock the enhanced Firecrawl service
jest.mock('../services/enhancedFirecrawlService');

const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/scraping', scrapingRoutes);
  app.use(errorHandler);
  return app;
};

describe('Scraping API Endpoints', () => {
  let app: express.Application;
  const mockFirecrawlService = enhancedFirecrawlService as jest.Mocked<typeof enhancedFirecrawlService>;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /scraping/jobs', () => {
    it('should return paginated crawl jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          source_url: 'https://example.com',
          job_type: 'full_crawl',
          status: 'completed',
          progress: 100,
          stats: {
            pages_scraped: 10,
            documents_processed: 5,
            links_discovered: 50,
            grants_found: 2,
            errors_encountered: 0,
            processing_time_ms: 30000
          },
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ];

      mockFirecrawlService.getCrawlJobs.mockResolvedValue({
        jobs: mockJobs,
        total: 1
      });

      const response = await request(app)
        .get('/scraping/jobs')
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0]).toMatchObject({
        id: 'job-1',
        source_url: 'https://example.com',
        job_type: 'full_crawl',
        status: 'completed'
      });
    });

    it('should handle filtering by status', async () => {
      mockFirecrawlService.getCrawlJobs.mockResolvedValue({
        jobs: [],
        total: 0
      });

      await request(app)
        .get('/scraping/jobs?status=running')
        .expect(200);

      expect(mockFirecrawlService.getCrawlJobs).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        status: 'running'
      });
    });

    it('should handle pagination parameters', async () => {
      mockFirecrawlService.getCrawlJobs.mockResolvedValue({
        jobs: [],
        total: 0
      });

      await request(app)
        .get('/scraping/jobs?page=2&limit=10')
        .expect(200);

      expect(mockFirecrawlService.getCrawlJobs).toHaveBeenCalledWith({
        limit: 10,
        offset: 10,
        status: undefined
      });
    });
  });

  describe('POST /scraping/jobs', () => {
    it('should create a new crawl job', async () => {
      const mockJob = {
        id: 'new-job-1',
        source_url: 'https://example.com',
        job_type: 'full_crawl',
        status: 'running',
        progress: 0,
        stats: {
          pages_scraped: 0,
          documents_processed: 0,
          links_discovered: 0,
          grants_found: 0,
          errors_encountered: 0,
          processing_time_ms: 0
        },
        configuration: {
          max_depth: 3,
          include_patterns: ['*'],
          exclude_patterns: [],
          follow_external_links: false,
          capture_screenshots: false,
          extract_structured_data: true,
          process_documents: true,
          rate_limit_ms: 1000
        },
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      mockFirecrawlService.startAdvancedCrawl.mockResolvedValue(mockJob as any);

      const response = await request(app)
        .post('/scraping/jobs')
        .send({
          source_url: 'https://example.com',
          job_type: 'full_crawl',
          configuration: {
            max_depth: 3,
            process_documents: true
          }
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'new-job-1',
        source_url: 'https://example.com',
        job_type: 'full_crawl',
        status: 'running'
      });

      expect(mockFirecrawlService.startAdvancedCrawl).toHaveBeenCalledWith(
        'https://example.com',
        'full_crawl',
        {
          max_depth: 3,
          process_documents: true
        }
      );
    });

    it('should return 400 for missing source_url', async () => {
      const response = await request(app)
        .post('/scraping/jobs')
        .send({
          job_type: 'full_crawl'
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required field');
      expect(response.body.message).toBe('source_url is required');
    });

    it('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .post('/scraping/jobs')
        .send({
          source_url: 'invalid-url',
          job_type: 'full_crawl'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid URL');
    });

    it('should use default job type if not provided', async () => {
      const mockJob = { id: 'job-1', job_type: 'full_crawl' };
      mockFirecrawlService.startAdvancedCrawl.mockResolvedValue(mockJob as any);

      await request(app)
        .post('/scraping/jobs')
        .send({
          source_url: 'https://example.com'
        })
        .expect(201);

      expect(mockFirecrawlService.startAdvancedCrawl).toHaveBeenCalledWith(
        'https://example.com',
        'full_crawl',
        {}
      );
    });
  });

  describe('GET /scraping/jobs/:jobId', () => {
    it('should return detailed job information', async () => {
      const mockJobDetails = {
        job: {
          id: 'job-1',
          source_url: 'https://example.com',
          status: 'completed'
        },
        pages: [
          {
            id: 'page-1',
            url: 'https://example.com/page1',
            title: 'Page 1'
          }
        ],
        documents: [
          {
            id: 'doc-1',
            url: 'https://example.com/doc.pdf',
            title: 'Document 1',
            file_type: 'pdf'
          }
        ],
        stats: {
          pages_scraped: 1,
          documents_processed: 1
        }
      };

      mockFirecrawlService.getJobDetails.mockResolvedValue(mockJobDetails as any);

      const response = await request(app)
        .get('/scraping/jobs/job-1')
        .expect(200);

      expect(response.body).toMatchObject(mockJobDetails);
      expect(mockFirecrawlService.getJobDetails).toHaveBeenCalledWith('job-1');
    });

    it('should return 404 for non-existent job', async () => {
      mockFirecrawlService.getJobDetails.mockResolvedValue(null);

      const response = await request(app)
        .get('/scraping/jobs/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('GET /scraping/pages', () => {
    it('should return paginated scraped pages', async () => {
      const mockPages = [
        {
          id: 'page-1',
          url: 'https://example.com/page1',
          title: 'Page 1',
          content: 'Content of page 1',
          metadata: {
            statusCode: 200,
            timestamp: new Date().toISOString(),
            links: ['https://example.com/link1'],
            images: ['https://example.com/image1.jpg']
          },
          processing_status: 'processed',
          created_at: new Date().toISOString()
        }
      ];

      mockFirecrawlService.getScrapedPages.mockResolvedValue({
        pages: mockPages,
        total: 1
      });

      const response = await request(app)
        .get('/scraping/pages')
        .expect(200);

      expect(response.body).toHaveProperty('pages');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pages).toHaveLength(1);
      expect(response.body.pages[0]).toMatchObject({
        id: 'page-1',
        url: 'https://example.com/page1',
        title: 'Page 1'
      });
    });

    it('should handle search and status filtering', async () => {
      mockFirecrawlService.getScrapedPages.mockResolvedValue({
        pages: [],
        total: 0
      });

      await request(app)
        .get('/scraping/pages?search=example&status=processed')
        .expect(200);

      expect(mockFirecrawlService.getScrapedPages).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        status: 'processed',
        search: 'example'
      });
    });
  });

  describe('GET /scraping/documents', () => {
    it('should return paginated scraped documents', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          url: 'https://example.com/doc.pdf',
          title: 'Document 1',
          content: 'Content of document',
          file_type: 'pdf',
          extracted_data: {
            grants: [{ title: 'Grant 1' }],
            contacts: []
          },
          confidence_score: 0.85,
          created_at: new Date().toISOString()
        }
      ];

      mockFirecrawlService.getScrapedDocuments.mockResolvedValue({
        documents: mockDocuments,
        total: 1
      });

      const response = await request(app)
        .get('/scraping/documents')
        .expect(200);

      expect(response.body).toHaveProperty('documents');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.documents).toHaveLength(1);
      expect(response.body.documents[0]).toMatchObject({
        id: 'doc-1',
        file_type: 'pdf',
        confidence_score: 0.85
      });
    });

    it('should handle file type filtering', async () => {
      mockFirecrawlService.getScrapedDocuments.mockResolvedValue({
        documents: [],
        total: 0
      });

      await request(app)
        .get('/scraping/documents?file_type=pdf')
        .expect(200);

      expect(mockFirecrawlService.getScrapedDocuments).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        fileType: 'pdf',
        search: undefined
      });
    });
  });

  describe('DELETE /scraping/cleanup', () => {
    it('should clean up scraped pages', async () => {
      mockFirecrawlService.deleteScrapedData.mockResolvedValue();

      const response = await request(app)
        .delete('/scraping/cleanup')
        .send({
          type: 'pages',
          ids: ['page-1', 'page-2']
        })
        .expect(200);

      expect(response.body.message).toBe('Successfully deleted 2 pages');
      expect(response.body.deleted_count).toBe(2);
      expect(mockFirecrawlService.deleteScrapedData).toHaveBeenCalledWith('pages', ['page-1', 'page-2']);
    });

    it('should clean up scraped documents', async () => {
      mockFirecrawlService.deleteScrapedData.mockResolvedValue();

      await request(app)
        .delete('/scraping/cleanup')
        .send({
          type: 'documents',
          ids: ['doc-1']
        })
        .expect(200);

      expect(mockFirecrawlService.deleteScrapedData).toHaveBeenCalledWith('documents', ['doc-1']);
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .delete('/scraping/cleanup')
        .send({
          type: 'pages'
          // missing ids
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid request');
    });

    it('should return 400 for invalid type', async () => {
      const response = await request(app)
        .delete('/scraping/cleanup')
        .send({
          type: 'invalid',
          ids: ['id-1']
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid type');
    });
  });

  describe('GET /scraping/stats', () => {
    it('should return scraping statistics', async () => {
      mockFirecrawlService.getCrawlJobs.mockResolvedValue({
        jobs: [],
        total: 5
      });
      mockFirecrawlService.getScrapedPages.mockResolvedValue({
        pages: [],
        total: 25
      });
      mockFirecrawlService.getScrapedDocuments.mockResolvedValue({
        documents: [],
        total: 10
      });

      const response = await request(app)
        .get('/scraping/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        jobs: { total: 5 },
        pages: { total: 25 },
        documents: { total: 10 }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockFirecrawlService.getCrawlJobs.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/scraping/jobs')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid job creation', async () => {
      mockFirecrawlService.startAdvancedCrawl.mockRejectedValue(new Error('Invalid configuration'));

      const response = await request(app)
        .post('/scraping/jobs')
        .send({
          source_url: 'https://example.com'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});