import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import EnhancedScrapingDashboard from '../../app/dashboard/scraping/enhanced/page';

// Mock API responses
const server = setupServer(
  rest.get('/api/firecrawl/jobs', (req, res, ctx) => {
    const status = req.url.searchParams.get('status');
    const jobType = req.url.searchParams.get('jobType');
    
    const mockJobs = [
      {
        id: 'job-1',
        sourceUrl: 'https://enterprise-ireland.com',
        jobType: 'ai_extract',
        status: 'completed',
        progress: 100,
        stats: {
          pagesScraped: 15,
          documentsProcessed: 3,
          linksDiscovered: 45,
          grantsFound: 5,
          errorsEncountered: 0,
          processingTimeMs: 45000,
          dataExtracted: 8
        },
        configuration: {
          maxDepth: 3,
          includePatterns: ['*'],
          excludePatterns: [],
          aiExtraction: true,
          captureScreenshots: false
        },
        priority: 5,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:32:15Z',
        startedAt: '2024-01-15T10:30:05Z',
        completedAt: '2024-01-15T10:32:15Z'
      },
      {
        id: 'job-2',
        sourceUrl: 'https://sfi.ie/grants',
        jobType: 'full_crawl',
        status: 'running',
        progress: 65,
        stats: {
          pagesScraped: 8,
          documentsProcessed: 1,
          linksDiscovered: 23,
          grantsFound: 2,
          errorsEncountered: 1,
          processingTimeMs: 0,
          dataExtracted: 3
        },
        configuration: {
          maxDepth: 2,
          includePatterns: ['*'],
          excludePatterns: ['*.pdf'],
          aiExtraction: true,
          captureScreenshots: false
        },
        priority: 0,
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:05:30Z',
        startedAt: '2024-01-15T11:00:10Z'
      }
    ];

    let filteredJobs = mockJobs;
    if (status) {
      filteredJobs = mockJobs.filter(job => job.status === status);
    }
    if (jobType) {
      filteredJobs = filteredJobs.filter(job => job.jobType === jobType);
    }

    return res(ctx.json({ jobs: filteredJobs, total: filteredJobs.length }));
  }),

  rest.get('/api/firecrawl/grants', (req, res, ctx) => {
    const mockGrants = [
      {
        title: 'Innovation Partnership Programme',
        description: 'Support for companies to collaborate with research institutions on innovation projects.',
        amount: {
          min: 25000,
          max: 200000,
          currency: 'EUR'
        },
        deadline: '2024-03-31',
        eligibility: ['Irish SMEs', 'Manufacturing or services', 'Research collaboration'],
        categories: ['innovation', 'research', 'collaboration'],
        contactInfo: {
          email: 'innovation@enterprise-ireland.com',
          website: 'https://enterprise-ireland.com/innovation'
        },
        confidence: 0.92,
        source: {
          url: 'https://enterprise-ireland.com/innovation-partnership',
          pageTitle: 'Innovation Partnership Programme - Enterprise Ireland',
          extractedAt: '2024-01-15T10:31:45Z'
        }
      },
      {
        title: 'Research Frontiers Programme',
        description: 'Funding for excellent scientific research across all disciplines.',
        amount: {
          min: 50000,
          max: 500000,
          currency: 'EUR'
        },
        deadline: '2024-05-15',
        eligibility: ['Higher education institutions', 'Principal investigators'],
        categories: ['research', 'science', 'academia'],
        contactInfo: {
          email: 'frontiers@sfi.ie'
        },
        confidence: 0.88,
        source: {
          url: 'https://sfi.ie/research-frontiers',
          pageTitle: 'Research Frontiers Programme - Science Foundation Ireland',
          extractedAt: '2024-01-15T11:04:20Z'
        }
      }
    ];

    return res(ctx.json({ grants: mockGrants, total: mockGrants.length }));
  }),

  rest.get('/api/firecrawl/statistics', (req, res, ctx) => {
    return res(ctx.json({
      totalJobs: 12,
      completedJobs: 8,
      failedJobs: 2,
      totalPages: 156,
      totalDocuments: 23,
      totalGrants: 18,
      averageProcessingTime: 32500
    }));
  }),

  rest.post('/api/firecrawl/jobs', (req, res, ctx) => {
    return res(ctx.json({
      id: 'new-job-123',
      sourceUrl: req.body.sourceUrl,
      jobType: req.body.jobType,
      status: 'pending',
      progress: 0,
      stats: {
        pagesScraped: 0,
        documentsProcessed: 0,
        linksDiscovered: 0,
        grantsFound: 0,
        errorsEncountered: 0,
        processingTimeMs: 0,
        dataExtracted: 0
      },
      configuration: req.body.configuration,
      priority: req.body.priority || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }),

  rest.post('/api/firecrawl/jobs/:jobId/cancel', (req, res, ctx) => {
    return res(ctx.status(200));
  }),

  rest.post('/api/firecrawl/jobs/:jobId/retry', (req, res, ctx) => {
    return res(ctx.json({
      id: 'retry-job-456',
      sourceUrl: 'https://retried-url.com',
      status: 'pending',
      progress: 0
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Enhanced Scraping Dashboard Integration', () => {
  test('should render dashboard with statistics', async () => {
    render(<EnhancedScrapingDashboard />);

    // Check if main elements are rendered
    expect(screen.getByText('Enhanced Scraping Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AI-powered web scraping with real-time monitoring')).toBeInTheDocument();

    // Wait for statistics to load
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // Total jobs
    });

    expect(screen.getByText('8 completed')).toBeInTheDocument();
    expect(screen.getByText('2 failed')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument(); // Total pages
    expect(screen.getByText('18')).toBeInTheDocument(); // Total grants
  });

  test('should load and display jobs correctly', async () => {
    render(<EnhancedScrapingDashboard />);

    // Wait for jobs to load
    await waitFor(() => {
      expect(screen.getByText('https://enterprise-ireland.com')).toBeInTheDocument();
    });

    expect(screen.getByText('https://sfi.ie/grants')).toBeInTheDocument();
    
    // Check job status badges
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();

    // Check job stats
    expect(screen.getByText('15')).toBeInTheDocument(); // Pages scraped
    expect(screen.getByText('5')).toBeInTheDocument(); // Grants found
  });

  test('should filter jobs by status and type', async () => {
    render(<EnhancedScrapingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('https://enterprise-ireland.com')).toBeInTheDocument();
    });

    // Test status filter
    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'completed' } });

    await waitFor(() => {
      expect(screen.getByText('https://enterprise-ireland.com')).toBeInTheDocument();
      expect(screen.queryByText('https://sfi.ie/grants')).not.toBeInTheDocument();
    });

    // Test job type filter
    const typeFilter = screen.getByDisplayValue('All Types');
    fireEvent.change(typeFilter, { target: { value: 'ai_extract' } });

    await waitFor(() => {
      expect(screen.getByText('https://enterprise-ireland.com')).toBeInTheDocument();
    });
  });

  test('should search jobs and grants', async () => {
    render(<EnhancedScrapingDashboard />);

    const searchInput = screen.getByPlaceholderText('Search jobs, URLs, or grants...');
    
    await userEvent.type(searchInput, 'enterprise');

    await waitFor(() => {
      expect(screen.getByText('https://enterprise-ireland.com')).toBeInTheDocument();
    });
  });

  test('should display grants in grants tab', async () => {
    render(<EnhancedScrapingDashboard />);

    // Switch to grants tab
    const grantsTab = screen.getByRole('tab', { name: /grants/i });
    fireEvent.click(grantsTab);

    await waitFor(() => {
      expect(screen.getByText('Innovation Partnership Programme')).toBeInTheDocument();
    });

    expect(screen.getByText('Research Frontiers Programme')).toBeInTheDocument();
    
    // Check grant details
    expect(screen.getByText('92%')).toBeInTheDocument(); // Confidence score
    expect(screen.getByText('EUR 25,000 - EUR 200,000')).toBeInTheDocument(); // Amount
    expect(screen.getByText('March 31, 2024')).toBeInTheDocument(); // Deadline
  });

  test('should create new job via quick modal', async () => {
    render(<EnhancedScrapingDashboard />);

    // Click New Job button
    const newJobButton = screen.getByText('New Job');
    fireEvent.click(newJobButton);

    // Fill out quick job form
    await waitFor(() => {
      expect(screen.getByText('Quick Job Creation')).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await userEvent.type(urlInput, 'https://new-grant-site.com');

    const jobTypeSelect = screen.getByDisplayValue('Full Crawl');
    fireEvent.change(jobTypeSelect, { target: { value: 'ai_extract' } });

    const aiExtractionCheckbox = screen.getByLabelText('Enable AI extraction');
    expect(aiExtractionCheckbox).toBeChecked();

    // Submit job
    const startJobButton = screen.getByText('Start Job');
    fireEvent.click(startJobButton);

    await waitFor(() => {
      expect(screen.queryByText('Quick Job Creation')).not.toBeInTheDocument();
    });
  });

  test('should open job wizard with advanced options', async () => {
    render(<EnhancedScrapingDashboard />);

    // Click Job Wizard button
    const wizardButton = screen.getByText('Job Wizard');
    fireEvent.click(wizardButton);

    await waitFor(() => {
      expect(screen.getByText('Job Wizard - Step 1 of 3')).toBeInTheDocument();
    });

    // Step 1: Basic configuration
    const urlInput = screen.getByPlaceholderText('https://example.com');
    await userEvent.type(urlInput, 'https://complex-grant-site.com');

    const jobTypeSelect = screen.getByDisplayValue('Full Website Crawl');
    fireEvent.change(jobTypeSelect, { target: { value: 'ai_extract' } });

    // Go to step 2
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Job Wizard - Step 2 of 3')).toBeInTheDocument();
    });

    // Step 2: Advanced configuration
    const maxDepthInput = screen.getByDisplayValue('3');
    fireEvent.change(maxDepthInput, { target: { value: '5' } });

    const prioritySelect = screen.getByDisplayValue('Normal');
    fireEvent.change(prioritySelect, { target: { value: '5' } });

    // Go to step 3
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Job Wizard - Step 3 of 3')).toBeInTheDocument();
    });

    // Step 3: AI configuration
    const aiCheckbox = screen.getByLabelText('Enable AI-powered data extraction');
    expect(aiCheckbox).toBeChecked();

    const promptTextarea = screen.getByPlaceholderText('Describe what specific information you want to extract...');
    await userEvent.type(promptTextarea, 'Extract all grant opportunities with funding amounts over €10,000');

    // Submit wizard
    const startJobWizardButton = screen.getByText('Start Job');
    fireEvent.click(startJobWizardButton);

    await waitFor(() => {
      expect(screen.queryByText('Job Wizard')).not.toBeInTheDocument();
    });
  });

  test('should handle job actions (cancel, retry)', async () => {
    render(<EnhancedScrapingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('https://sfi.ie/grants')).toBeInTheDocument();
    });

    // Test cancel action for running job
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Test retry action (would appear for failed jobs)
    // For this test, we'll mock a failed job scenario
    server.use(
      rest.get('/api/firecrawl/jobs', (req, res, ctx) => {
        return res(ctx.json({
          jobs: [{
            id: 'failed-job',
            sourceUrl: 'https://failed-site.com',
            status: 'failed',
            errorMessage: 'Connection timeout'
          }],
          total: 1
        }));
      })
    );

    // Refresh to load failed job
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
  });

  test('should display analytics tab with performance metrics', async () => {
    render(<EnhancedScrapingDashboard />);

    // Switch to analytics tab
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    fireEvent.click(analyticsTab);

    await waitFor(() => {
      expect(screen.getByText('Job Success Rate')).toBeInTheDocument();
    });

    expect(screen.getByText('Processing Efficiency')).toBeInTheDocument();
    
    // Check calculated metrics
    expect(screen.getByText('67%')).toBeInTheDocument(); // Success rate (8/12)
    expect(screen.getByText('13')).toBeInTheDocument(); // Pages per job (156/12)
  });

  test('should handle real-time updates via SSE simulation', async () => {
    render(<EnhancedScrapingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('https://sfi.ie/grants')).toBeInTheDocument();
    });

    // Simulate SSE update
    const mockEventSource = {
      onmessage: null as ((this: EventSource, ev: MessageEvent) => unknown) | null,
      onerror: null as ((this: EventSource, ev: Event) => unknown) | null,
      close: jest.fn()
    };

    // Mock EventSource constructor
    (global as unknown as { EventSource: unknown }).EventSource = jest.fn(() => mockEventSource);

    // Simulate progress update
    const progressUpdate = {
      type: 'progress',
      jobId: 'job-2',
      progress: 75
    };

    if (mockEventSource.onmessage) {
      mockEventSource.onmessage({
        data: JSON.stringify(progressUpdate)
      });
    }

    // Simulate job completion
    const completionUpdate = {
      type: 'completed',
      jobId: 'job-2'
    };

    if (mockEventSource.onmessage) {
      mockEventSource.onmessage({
        data: JSON.stringify(completionUpdate)
      });
    }
  });

  test('should validate form inputs', async () => {
    render(<EnhancedScrapingDashboard />);

    // Open new job modal
    const newJobButton = screen.getByText('New Job');
    fireEvent.click(newJobButton);

    await waitFor(() => {
      expect(screen.getByText('Quick Job Creation')).toBeInTheDocument();
    });

    // Try to submit without URL
    const startJobButton = screen.getByText('Start Job');
    fireEvent.click(startJobButton);

    // The form should not submit (URL is required)
    expect(screen.getByText('Quick Job Creation')).toBeInTheDocument();

    // Add valid URL and submit
    const urlInput = screen.getByPlaceholderText('https://example.com');
    await userEvent.type(urlInput, 'https://valid-url.com');
    
    fireEvent.click(startJobButton);

    await waitFor(() => {
      expect(screen.queryByText('Quick Job Creation')).not.toBeInTheDocument();
    });
  });

  test('should handle error states gracefully', async () => {
    // Mock API error
    server.use(
      rest.get('/api/firecrawl/jobs', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
      })
    );

    render(<EnhancedScrapingDashboard />);

    // The dashboard should still render even with API errors
    expect(screen.getByText('Enhanced Scraping Dashboard')).toBeInTheDocument();
    
    // Loading state should be shown initially
    expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
  });
});

describe('Firecrawl Service Integration', () => {
  test('should integrate with firecrawl service methods', async () => {
    const { firecrawlService } = await import('../../lib/api/firecrawlService');

    // Test service methods exist and are callable
    expect(typeof firecrawlService.createJob).toBe('function');
    expect(typeof firecrawlService.listJobs).toBe('function');
    expect(typeof firecrawlService.getJob).toBe('function');
    expect(typeof firecrawlService.cancelJob).toBe('function');
    expect(typeof firecrawlService.retryJob).toBe('function');
    expect(typeof firecrawlService.getExtractedGrants).toBe('function');
    expect(typeof firecrawlService.getStatistics).toBe('function');
    expect(typeof firecrawlService.subscribeToJobUpdates).toBe('function');
    expect(typeof firecrawlService.healthCheck).toBe('function');
  });

  test('should handle SSE subscriptions', async () => {
    const { firecrawlService } = await import('../../lib/api/firecrawlService');

    const mockCallback = jest.fn();
    const unsubscribe = firecrawlService.subscribeToJobUpdates('test-job-id', mockCallback);

    expect(typeof unsubscribe).toBe('function');
    
    // Clean up
    unsubscribe();
  });
});