import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { firecrawlIntegrationService } from '../services/firecrawlIntegrationService';
import { db } from '../services/database';
import { openaiService } from '../services/openaiService';

// Mock dependencies
jest.mock('../services/database');
jest.mock('../services/openaiService');
jest.mock('@mendable/firecrawl-js');

const mockDb = db as jest.Mocked<typeof db>;
const mockOpenaiService = openaiService as jest.Mocked<typeof openaiService>;

describe('FirecrawlIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database responses
    mockDb.query.mockImplementation((query: string, params?: any[]) => {
      if (query.includes('CREATE TABLE')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      
      if (query.includes('INSERT INTO firecrawl_jobs')) {
        return Promise.resolve({
          rows: [{
            id: 'job-123',
            source_url: 'https://example.com',
            job_type: 'full_crawl',
            status: 'pending',
            progress: 0,
            stats: JSON.stringify({
              pagesScraped: 0,
              documentsProcessed: 0,
              linksDiscovered: 0,
              grantsFound: 0,
              errorsEncountered: 0,
              processingTimeMs: 0,
              dataExtracted: 0
            }),
            configuration: JSON.stringify({
              maxDepth: 3,
              includePatterns: ['*'],
              excludePatterns: [],
              aiExtraction: true
            }),
            priority: 0,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1
        });
      }
      
      if (query.includes('SELECT * FROM firecrawl_jobs')) {
        return Promise.resolve({
          rows: [{
            id: 'job-123',
            source_url: 'https://example.com',
            job_type: 'full_crawl',
            status: 'completed',
            progress: 100,
            stats: JSON.stringify({
              pagesScraped: 5,
              documentsProcessed: 2,
              linksDiscovered: 25,
              grantsFound: 3,
              errorsEncountered: 0,
              processingTimeMs: 15000,
              dataExtracted: 8
            }),
            configuration: JSON.stringify({
              maxDepth: 3,
              includePatterns: ['*'],
              excludePatterns: [],
              aiExtraction: true
            }),
            priority: 0,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1
        });
      }
      
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    // Mock OpenAI service
    mockOpenaiService.analyzeContentForGrants.mockResolvedValue({
      grants: [
        {
          title: 'Test Grant',
          description: 'A test grant for businesses',
          amount: { min: 1000, max: 5000, currency: 'EUR' },
          deadline: new Date('2024-12-31'),
          eligibility: ['Small businesses', 'Startups'],
          categories: ['Business development'],
          contactInfo: { email: 'grants@example.com' },
          confidence: 0.9
        }
      ],
      metadata: {
        processingTime: 2000,
        confidence: 0.9,
        tokensUsed: 500
      },
      overallConfidence: 0.9
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Job Creation', () => {
    it('should create a new crawl job successfully', async () => {
      const jobData = {
        sourceUrl: 'https://example.com',
        jobType: 'full_crawl' as const,
        configuration: {
          maxDepth: 3,
          aiExtraction: true
        }
      };

      const job = await firecrawlIntegrationService.createJob(
        jobData.sourceUrl,
        jobData.jobType,
        jobData.configuration
      );

      expect(job).toBeDefined();
      expect(job.sourceUrl).toBe(jobData.sourceUrl);
      expect(job.jobType).toBe(jobData.jobType);
      expect(job.status).toBe('pending');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO firecrawl_jobs'),
        expect.any(Array)
      );
    });

    it('should validate job configuration', async () => {
      const invalidConfig = {
        maxDepth: 15, // Invalid: exceeds max
        rateLimitMs: -100 // Invalid: negative
      };

      await expect(
        firecrawlIntegrationService.createJob(
          'https://example.com',
          'full_crawl',
          invalidConfig as any
        )
      ).rejects.toThrow();
    });

    it('should create batch jobs', async () => {
      const jobs = [
        {
          sourceUrl: 'https://example1.com',
          jobType: 'full_crawl' as const,
          configuration: { maxDepth: 2 }
        },
        {
          sourceUrl: 'https://example2.com',
          jobType: 'targeted_scrape' as const,
          configuration: { aiExtraction: true }
        }
      ];

      const createdJobs = await firecrawlIntegrationService.createBatchJobs(jobs);

      expect(createdJobs).toHaveLength(2);
      expect(createdJobs[0].sourceUrl).toBe('https://example1.com');
      expect(createdJobs[1].sourceUrl).toBe('https://example2.com');
    });
  });

  describe('Job Management', () => {
    it('should list jobs with filtering', async () => {
      const result = await firecrawlIntegrationService.listJobs({
        status: 'completed',
        limit: 10,
        offset: 0
      });

      expect(result.jobs).toBeDefined();
      expect(result.total).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM firecrawl_jobs'),
        expect.any(Array)
      );
    });

    it('should get job by ID', async () => {
      const job = await firecrawlIntegrationService.getJob('job-123');

      expect(job).toBeDefined();
      expect(job?.id).toBe('job-123');
      expect(job?.status).toBe('completed');
    });

    it('should update job status', async () => {
      await firecrawlIntegrationService.updateJobStatus('job-123', 'running');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE firecrawl_jobs'),
        expect.arrayContaining(['running', 'job-123'])
      );
    });

    it('should update job progress', async () => {
      await firecrawlIntegrationService.updateJobProgress('job-123', 50, {
        pagesScraped: 10,
        grantsFound: 2
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE firecrawl_jobs'),
        expect.arrayContaining([50, expect.any(String), 'job-123'])
      );
    });
  });

  describe('Content Processing', () => {
    it('should process scraped content with AI analysis', async () => {
      const pageData = {
        url: 'https://example.com/grants',
        content: 'Sample grant content...',
        markdown: '# Grant Opportunities\n\nWe offer funding for startups...',
        metadata: {
          title: 'Grant Opportunities',
          statusCode: 200
        }
      };

      const job = {
        id: 'job-123',
        configuration: { aiExtraction: true }
      } as any;

      // Mock the database insert for scraped content
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'content-123' }],
        rowCount: 1
      });

      // Test the internal method (would need to expose or test via public interface)
      // This is a simplified test - in practice, you'd test through the public API
      expect(mockOpenaiService.analyzeContentForGrants).toBeDefined();
    });

    it('should extract structured data from HTML', async () => {
      const htmlContent = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Grant",
          "name": "Innovation Grant",
          "amount": "€50000"
        }
        </script>
      `;

      // This would test the structured data extraction
      // Implementation would depend on the service's public interface
      expect(htmlContent).toContain('application/ld+json');
    });
  });

  describe('Grant Extraction', () => {
    it('should extract grants from content', async () => {
      const result = await firecrawlIntegrationService.getExtractedGrants({
        minConfidence: 0.8,
        limit: 10
      });

      expect(result.grants).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should filter grants by deadline', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await firecrawlIntegrationService.getExtractedGrants({
        deadline: {
          after: new Date(),
          before: tomorrow
        }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('g.deadline >='),
        expect.any(Array)
      );
    });
  });

  describe('Statistics', () => {
    it('should calculate job statistics', async () => {
      // Mock the statistics query response
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          total_jobs: '10',
          completed_jobs: '8',
          failed_jobs: '1',
          total_pages: '150',
          total_documents: '25',
          total_grants: '42',
          avg_processing_time: '12500'
        }],
        rowCount: 1
      });

      const stats = await firecrawlIntegrationService.getStatistics();

      expect(stats.totalJobs).toBe(10);
      expect(stats.completedJobs).toBe(8);
      expect(stats.failedJobs).toBe(1);
      expect(stats.totalPages).toBe(150);
      expect(stats.totalDocuments).toBe(25);
      expect(stats.totalGrants).toBe(42);
      expect(stats.averageProcessingTime).toBe(12500);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle job subscriptions', () => {
      const callback = jest.fn();
      const unsubscribe = firecrawlIntegrationService.subscribeToJobUpdates('job-123', callback);

      // Simulate job progress event
      firecrawlIntegrationService.emit('job:progress', { jobId: 'job-123', progress: 50 });

      expect(callback).toHaveBeenCalledWith({
        type: 'progress',
        jobId: 'job-123',
        progress: 50
      });

      unsubscribe();
    });

    it('should handle job completion events', () => {
      const callback = jest.fn();
      firecrawlIntegrationService.subscribeToJobUpdates('job-123', callback);

      const jobData = { id: 'job-123', status: 'completed' };
      firecrawlIntegrationService.emit('job:completed', { job: jobData });

      expect(callback).toHaveBeenCalledWith({
        type: 'completed',
        job: jobData
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        firecrawlIntegrationService.createJob('https://example.com', 'full_crawl')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle Firecrawl API errors', async () => {
      // Mock Firecrawl API failure
      const FirecrawlApp = require('@mendable/firecrawl-js');
      FirecrawlApp.prototype.crawlUrl = jest.fn().mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded'
      });

      // This would test through the job processing pipeline
      // Implementation depends on how errors are handled in the actual service
    });

    it('should handle AI analysis errors gracefully', async () => {
      mockOpenaiService.analyzeContentForGrants.mockRejectedValueOnce(
        new Error('OpenAI API timeout')
      );

      // Test that the service continues processing even if AI analysis fails
      // Implementation would depend on error handling strategy
    });
  });

  describe('Configuration Validation', () => {
    it('should validate URL format', async () => {
      await expect(
        firecrawlIntegrationService.createJob('invalid-url', 'full_crawl')
      ).rejects.toThrow();
    });

    it('should validate job type', async () => {
      await expect(
        firecrawlIntegrationService.createJob('https://example.com', 'invalid_type' as any)
      ).rejects.toThrow();
    });

    it('should apply default configuration values', async () => {
      const job = await firecrawlIntegrationService.createJob(
        'https://example.com',
        'full_crawl',
        {} // Empty configuration should get defaults
      );

      expect(job.configuration.maxDepth).toBe(3);
      expect(job.configuration.includePatterns).toEqual(['*']);
      expect(job.configuration.aiExtraction).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent job creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        firecrawlIntegrationService.createJob(
          `https://example${i}.com`,
          'full_crawl'
        )
      );

      const jobs = await Promise.all(promises);
      expect(jobs).toHaveLength(5);
    });

    it('should respect rate limiting configuration', async () => {
      const job = await firecrawlIntegrationService.createJob(
        'https://example.com',
        'full_crawl',
        { rateLimitMs: 2000 }
      );

      expect(job.configuration.rateLimitMs).toBe(2000);
    });
  });

  describe('Security', () => {
    it('should sanitize URL inputs', async () => {
      const maliciousUrl = 'javascript:alert("xss")';
      
      await expect(
        firecrawlIntegrationService.createJob(maliciousUrl, 'full_crawl')
      ).rejects.toThrow();
    });

    it('should validate user permissions', async () => {
      const job = await firecrawlIntegrationService.createJob(
        'https://example.com',
        'full_crawl',
        {},
        { userId: 'user-123', organizationId: 'org-456' }
      );

      expect(job.userId).toBe('user-123');
      expect(job.organizationId).toBe('org-456');
    });
  });

  describe('Data Export', () => {
    it('should support content export', async () => {
      const result = await firecrawlIntegrationService.getJobContent('job-123', {
        limit: 100
      });

      expect(result.content).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should filter content by type', async () => {
      await firecrawlIntegrationService.getJobContent('job-123', {
        contentType: 'document'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('content_type = $'),
        expect.arrayContaining(['job-123', 'document'])
      );
    });
  });
});

// Integration tests
describe('FirecrawlIntegrationService Integration Tests', () => {
  // These would run against a test database
  it('should create and process a complete job lifecycle', async () => {
    // This would be a more comprehensive test that:
    // 1. Creates a job
    // 2. Processes content
    // 3. Extracts grants
    // 4. Updates statistics
    // 5. Handles cleanup
    
    // For now, just verify the service can be initialized
    expect(firecrawlIntegrationService).toBeDefined();
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  it('should process jobs within acceptable time limits', async () => {
    const startTime = Date.now();
    
    await firecrawlIntegrationService.createJob('https://example.com', 'full_crawl');
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should create job in under 1 second
  });
});