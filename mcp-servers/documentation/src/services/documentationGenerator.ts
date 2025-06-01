import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface DocumentationOptions {
  outputDir: string;
  projectRoot: string;
  includeTypes?: boolean;
  includeTests?: boolean;
}

export class DocumentationGenerator {
  constructor(private options: DocumentationOptions) {}

  async generateProjectDocs(): Promise<void> {
    logger.info('Generating project documentation', { outputDir: this.options.outputDir });
    
    try {
      // Ensure output directory exists
      await fs.promises.mkdir(this.options.outputDir, { recursive: true });
      
      // Generate different types of documentation
      await this.generateReadme();
      await this.generateApiDocs();
      await this.generateArchitectureDocs();
      
      logger.info('Documentation generation completed');
    } catch (error) {
      logger.error('Documentation generation failed', error);
      throw error;
    }
  }

  private async generateReadme(): Promise<void> {
    const readmePath = path.join(this.options.outputDir, 'README.md');
    const content = `# eTownz Grants Project Documentation

This documentation is automatically generated from the project source code.

## Project Structure

- \`backend/\` - Express.js API server
- \`frontend/\` - Next.js React application  
- \`mcp-servers/\` - Model Context Protocol servers
- \`infrastructure/\` - Database and deployment configuration

## Generated Documentation

- [API Documentation](./api.md)
- [Architecture Overview](./architecture.md)
- [Database Schema](./database.md)

---
*Generated on ${new Date().toISOString()}*
`;
    
    await fs.promises.writeFile(readmePath, content);
    logger.info('Generated README.md');
  }

  private async generateApiDocs(): Promise<void> {
    const apiDocsPath = path.join(this.options.outputDir, 'api.md');
    const content = `# API Documentation

## Endpoints

### Authentication
- \`POST /api/auth/login\` - User login
- \`POST /api/auth/register\` - User registration

### Grants
- \`GET /api/grants\` - List available grants
- \`POST /api/grants\` - Create new grant
- \`GET /api/grants/:id\` - Get grant details

### Applications
- \`GET /api/applications\` - List user applications
- \`POST /api/applications\` - Submit new application
- \`GET /api/applications/:id\` - Get application details

---
*Generated on ${new Date().toISOString()}*
`;
    
    await fs.promises.writeFile(apiDocsPath, content);
    logger.info('Generated API documentation');
  }

  private async generateArchitectureDocs(): Promise<void> {
    const archPath = path.join(this.options.outputDir, 'architecture.md');
    const content = `# Architecture Overview

## System Components

### Frontend (Next.js)
- React-based user interface
- Server-side rendering
- API integration layer

### Backend (Express.js)
- RESTful API server
- Authentication & authorization
- Database integration

### MCP Servers
- Documentation generation
- File processing
- Web content fetching
- Filesystem operations

### Infrastructure
- PostgreSQL database
- Redis caching
- Docker containerization
- DigitalOcean deployment

---
*Generated on ${new Date().toISOString()}*
`;
    
    await fs.promises.writeFile(archPath, content);
    logger.info('Generated architecture documentation');
  }

  async generateFileDocumentation(filePath: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath);
      
      // Basic documentation generation based on file type
      switch (ext) {
        case '.ts':
        case '.js':
          return this.generateCodeDocumentation(content, filePath);
        case '.md':
          return content; // Markdown files are already documentation
        default:
          return `# ${path.basename(filePath)}\n\nFile type: ${ext}\nPath: ${filePath}\n`;
      }
    } catch (error) {
      logger.error('Failed to generate file documentation', { filePath, error });
      return `# Error\n\nFailed to generate documentation for ${filePath}`;
    }
  }

  private generateCodeDocumentation(content: string, filePath: string): string {
    const fileName = path.basename(filePath);
    let docs = `# ${fileName}\n\n`;
    
    // Extract exports, functions, classes
    const exports = content.match(/export\s+(class|function|const|interface)\s+(\w+)/g) || [];
    const functions = content.match(/function\s+(\w+)/g) || [];
    const classes = content.match(/class\s+(\w+)/g) || [];
    
    if (exports.length > 0) {
      docs += `## Exports\n\n`;
      exports.forEach(exp => docs += `- ${exp}\n`);
      docs += '\n';
    }
    
    if (functions.length > 0) {
      docs += `## Functions\n\n`;
      functions.forEach(func => docs += `- ${func}\n`);
      docs += '\n';
    }
    
    if (classes.length > 0) {
      docs += `## Classes\n\n`;
      classes.forEach(cls => docs += `- ${cls}\n`);
      docs += '\n';
    }
    
    return docs;
  }
}