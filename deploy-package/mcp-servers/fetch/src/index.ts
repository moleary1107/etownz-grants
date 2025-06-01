#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import robotsParser from 'robots-parser';

interface FetchOptions {
  userAgent?: string;
  followRedirects?: boolean;
  timeout?: number;
}

class FetchServer {
  private server: Server;
  private turndownService: TurndownService;

  constructor() {
    this.server = new Server(
      {
        name: 'etownz-fetch-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'fetch_web_content',
          description: 'Fetch and convert web content to markdown for grants research',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to fetch content from',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'text', 'html'],
                default: 'markdown',
                description: 'Output format for the content',
              },
              userAgent: {
                type: 'string',
                description: 'Custom User-Agent string',
                default: 'eTownz-Grants-Bot/1.0',
              },
              timeout: {
                type: 'number',
                description: 'Request timeout in milliseconds',
                default: 30000,
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'fetch_grants_data',
          description: 'Specialized fetcher for grant opportunity pages with structured extraction',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Grant opportunity URL',
              },
              selectors: {
                type: 'object',
                description: 'CSS selectors for extracting specific grant information',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  deadline: { type: 'string' },
                  amount: { type: 'string' },
                  eligibility: { type: 'string' },
                },
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'check_robots_txt',
          description: 'Check if a URL is allowed by robots.txt before scraping',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to check against robots.txt',
              },
              userAgent: {
                type: 'string',
                description: 'User agent to check permissions for',
                default: 'eTownz-Grants-Bot',
              },
            },
            required: ['url'],
          },
        },
      ] as Tool[],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'fetch_web_content':
            return await this.fetchWebContent(args);
          case 'fetch_grants_data':
            return await this.fetchGrantsData(args);
          case 'check_robots_txt':
            return await this.checkRobotsTxt(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async fetchWebContent(args: any): Promise<CallToolResult> {
    const {
      url,
      format = 'markdown',
      userAgent = 'eTownz-Grants-Bot/1.0',
      timeout = 30000,
    } = args;

    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error('URL does not return HTML content');
      }

      const html = await response.text();
      let content: string;

      switch (format) {
        case 'html':
          content = html;
          break;
        case 'text':
          content = new JSDOM(html).window.document.body.textContent || '';
          break;
        case 'markdown':
        default:
          content = this.turndownService.turndown(html);
          break;
      }

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch content: ${error}`);
    }
  }

  private async fetchGrantsData(args: any): Promise<CallToolResult> {
    const { url, selectors = {} } = args;

    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'eTownz-Grants-Bot/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const extractedData: any = {
        url,
        fetchedAt: new Date().toISOString(),
      };

      // Extract using provided selectors or default ones
      const defaultSelectors = {
        title: 'h1, .title, .grant-title, [data-title]',
        description: '.description, .summary, .grant-description, p',
        deadline: '.deadline, .due-date, .closing-date, [data-deadline]',
        amount: '.amount, .funding, .value, [data-amount]',
        eligibility: '.eligibility, .criteria, .requirements',
      };

      const finalSelectors = { ...defaultSelectors, ...selectors };

      for (const [key, selector] of Object.entries(finalSelectors)) {
        try {
          const element = document.querySelector(selector as string);
          if (element) {
            extractedData[key] = element.textContent?.trim() || '';
          }
        } catch (error) {
          console.warn(`Failed to extract ${key} using selector ${selector}: ${error}`);
        }
      }

      // Convert to markdown for better readability
      const markdown = this.turndownService.turndown(html);

      return {
        content: [
          {
            type: 'text',
            text: `# Grant Data Extraction Results\n\n## Structured Data\n\`\`\`json\n${JSON.stringify(extractedData, null, 2)}\n\`\`\`\n\n## Full Page Content (Markdown)\n\n${markdown}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch grant data: ${error}`);
    }
  }

  private async checkRobotsTxt(args: any): Promise<CallToolResult> {
    const { url, userAgent = 'eTownz-Grants-Bot' } = args;

    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(robotsUrl, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `No robots.txt found at ${robotsUrl}. Scraping is likely allowed.`,
            },
          ],
        };
      }

      const robotsContent = await response.text();
      const robots = robotsParser(robotsUrl, robotsContent);
      const isAllowed = robots.isAllowed(url, userAgent);

      return {
        content: [
          {
            type: 'text',
            text: `Robots.txt check for ${url}:\n\nUser-Agent: ${userAgent}\nAllowed: ${isAllowed}\n\nRobots.txt content:\n\`\`\`\n${robotsContent}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to check robots.txt: ${error}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('eTownz Grants Fetch MCP server running on stdio');
  }
}

const server = new FetchServer();
server.run().catch(console.error);