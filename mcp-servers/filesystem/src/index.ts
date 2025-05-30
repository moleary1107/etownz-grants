#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Resource,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { watch } from 'chokidar';
import { lookup } from 'mime-types';

class FileSystemServer {
  private server: Server;
  private allowedDirectories: Set<string>;
  private watchedFiles: Map<string, any> = new Map();

  constructor() {
    const allowedPaths = [
      '/app/documents',
      '/app/uploads', 
      '/app/templates',
      '/tmp/grants',
    ];

    this.allowedDirectories = new Set(
      allowedPaths.map(p => path.resolve(p))
    );

    this.server = new Server(
      {
        name: 'etownz-filesystem-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private isPathAllowed(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    return Array.from(this.allowedDirectories).some(allowedDir =>
      resolvedPath.startsWith(allowedDir)
    );
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read_file',
          description: 'Read the contents of a grant-related file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file to read',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'write_file',
          description: 'Write content to a grant document file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file to write',
              },
              content: {
                type: 'string',
                description: 'Content to write to the file',
              },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'create_directory',
          description: 'Create a directory for organizing grant documents',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the directory to create',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'list_directory',
          description: 'List contents of a directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the directory to list',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'delete_file',
          description: 'Delete a file (use with caution)',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file to delete',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'move_file',
          description: 'Move or rename a file',
          inputSchema: {
            type: 'object',
            properties: {
              source: {
                type: 'string',
                description: 'Source path',
              },
              destination: {
                type: 'string',
                description: 'Destination path',
              },
            },
            required: ['source', 'destination'],
          },
        },
        {
          name: 'search_files',
          description: 'Search for files by name or content in grant directories',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              path: {
                type: 'string',
                description: 'Directory to search in',
                default: '/app/documents',
              },
              contentSearch: {
                type: 'boolean',
                description: 'Search within file contents',
                default: false,
              },
            },
            required: ['query'],
          },
        },
      ] as Tool[],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_file':
            return await this.readFile(args);
          case 'write_file':
            return await this.writeFile(args);
          case 'create_directory':
            return await this.createDirectory(args);
          case 'list_directory':
            return await this.listDirectory(args);
          case 'delete_file':
            return await this.deleteFile(args);
          case 'move_file':
            return await this.moveFile(args);
          case 'search_files':
            return await this.searchFiles(args);
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

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources: Resource[] = [];
      
      for (const dir of this.allowedDirectories) {
        try {
          const files = await this.getFilesRecursively(dir);
          for (const file of files) {
            const mimeType = lookup(file) || 'application/octet-stream';
            resources.push({
              uri: `file://${file}`,
              name: path.basename(file),
              description: `File: ${path.relative(dir, file)}`,
              mimeType,
            });
          }
        } catch (error) {
          // Directory might not exist, skip
        }
      }

      return { resources };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      if (!uri.startsWith('file://')) {
        throw new Error('Only file:// URIs are supported');
      }

      const filePath = uri.slice(7); // Remove 'file://' prefix
      
      if (!this.isPathAllowed(filePath)) {
        throw new Error('Access denied: path not in allowed directories');
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          contents: [
            {
              uri,
              mimeType: lookup(filePath) || 'text/plain',
              text: content,
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to read file: ${error}`);
      }
    });
  }

  private async getFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      // Directory might not be accessible, skip
    }
    
    return files;
  }

  private async readFile(args: any): Promise<CallToolResult> {
    const { path: filePath } = args;

    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: path not in allowed directories');
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      return {
        content: [
          {
            type: 'text',
            text: `File: ${filePath}\nSize: ${stats.size} bytes\nModified: ${stats.mtime}\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  private async writeFile(args: any): Promise<CallToolResult> {
    const { path: filePath, content } = args;

    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: path not in allowed directories');
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote ${content.length} characters to ${filePath}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  private async createDirectory(args: any): Promise<CallToolResult> {
    const { path: dirPath } = args;

    if (!this.isPathAllowed(dirPath)) {
      throw new Error('Access denied: path not in allowed directories');
    }

    try {
      await fs.mkdir(dirPath, { recursive: true });
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully created directory: ${dirPath}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create directory: ${error}`);
    }
  }

  private async listDirectory(args: any): Promise<CallToolResult> {
    const { path: dirPath } = args;

    if (!this.isPathAllowed(dirPath)) {
      throw new Error('Access denied: path not in allowed directories');
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          const stats = await fs.stat(fullPath);
          
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime,
          };
        })
      );

      return {
        content: [
          {
            type: 'text',
            text: `Directory listing for: ${dirPath}\n\n${JSON.stringify(items, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error}`);
    }
  }

  private async deleteFile(args: any): Promise<CallToolResult> {
    const { path: filePath } = args;

    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: path not in allowed directories');
    }

    try {
      await fs.unlink(filePath);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted: ${filePath}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  private async moveFile(args: any): Promise<CallToolResult> {
    const { source, destination } = args;

    if (!this.isPathAllowed(source) || !this.isPathAllowed(destination)) {
      throw new Error('Access denied: path not in allowed directories');
    }

    try {
      await fs.rename(source, destination);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully moved ${source} to ${destination}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to move file: ${error}`);
    }
  }

  private async searchFiles(args: any): Promise<CallToolResult> {
    const { query, path: searchPath = '/app/documents', contentSearch = false } = args;

    if (!this.isPathAllowed(searchPath)) {
      throw new Error('Access denied: path not in allowed directories');
    }

    try {
      const files = await this.getFilesRecursively(searchPath);
      const matches: any[] = [];

      for (const file of files) {
        const fileName = path.basename(file);
        
        // Search by filename
        if (fileName.toLowerCase().includes(query.toLowerCase())) {
          matches.push({
            path: file,
            type: 'filename',
            match: fileName,
          });
        }

        // Search by content if requested
        if (contentSearch) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            if (content.toLowerCase().includes(query.toLowerCase())) {
              matches.push({
                path: file,
                type: 'content',
                preview: content.substring(0, 200) + '...',
              });
            }
          } catch (error) {
            // Skip files that can't be read as text
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Search results for "${query}" in ${searchPath}:\n\n${JSON.stringify(matches, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('eTownz Grants Filesystem MCP server running on stdio');
  }
}

const server = new FileSystemServer();
server.run().catch(console.error);