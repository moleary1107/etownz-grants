import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface ArchitectureAnalysis {
  components: ComponentInfo[];
  dependencies: DependencyInfo[];
  metrics: ProjectMetrics;
  recommendations: string[];
}

export interface ComponentInfo {
  name: string;
  type: 'frontend' | 'backend' | 'mcp' | 'database' | 'external';
  path: string;
  description: string;
  technologies: string[];
  dependencies: string[];
}

export interface DependencyInfo {
  from: string;
  to: string;
  type: 'api' | 'database' | 'file' | 'service';
  description: string;
}

export interface ProjectMetrics {
  totalFiles: number;
  linesOfCode: number;
  components: number;
  testCoverage?: number;
  complexity: 'low' | 'medium' | 'high';
}

export class ArchitectureAnalyzer {
  constructor(private projectRoot: string) {}

  async analyzeProject(): Promise<ArchitectureAnalysis> {
    logger.info('Starting project architecture analysis', { projectRoot: this.projectRoot });
    
    try {
      const components = await this.identifyComponents();
      const dependencies = await this.analyzeDependencies();
      const metrics = await this.calculateMetrics();
      const recommendations = await this.generateRecommendations(components, dependencies, metrics);
      
      const analysis: ArchitectureAnalysis = {
        components,
        dependencies,
        metrics,
        recommendations
      };
      
      logger.info('Architecture analysis completed', { 
        components: components.length,
        dependencies: dependencies.length 
      });
      
      return analysis;
    } catch (error) {
      logger.error('Architecture analysis failed', error);
      throw error;
    }
  }

  private async identifyComponents(): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = [];
    
    // Frontend component
    if (await this.pathExists(path.join(this.projectRoot, 'frontend'))) {
      components.push({
        name: 'Frontend',
        type: 'frontend',
        path: 'frontend/',
        description: 'Next.js React application with PWA features',
        technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
        dependencies: ['backend-api']
      });
    }
    
    // Backend component
    if (await this.pathExists(path.join(this.projectRoot, 'backend'))) {
      components.push({
        name: 'Backend API',
        type: 'backend',
        path: 'backend/',
        description: 'Express.js RESTful API server',
        technologies: ['Express.js', 'TypeScript', 'Node.js'],
        dependencies: ['postgresql', 'redis', 'mcp-servers']
      });
    }
    
    // MCP Servers
    const mcpPath = path.join(this.projectRoot, 'mcp-servers');
    if (await this.pathExists(mcpPath)) {
      const mcpDirs = await fs.promises.readdir(mcpPath);
      for (const dir of mcpDirs) {
        const fullPath = path.join(mcpPath, dir);
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
          components.push({
            name: `MCP ${dir.charAt(0).toUpperCase() + dir.slice(1)}`,
            type: 'mcp',
            path: `mcp-servers/${dir}/`,
            description: `Model Context Protocol server for ${dir}`,
            technologies: ['TypeScript', 'Node.js', 'MCP SDK'],
            dependencies: ['external-apis']
          });
        }
      }
    }
    
    // Database components
    components.push({
      name: 'PostgreSQL Database',
      type: 'database',
      path: 'infrastructure/db/',
      description: 'Primary data storage for applications and grants',
      technologies: ['PostgreSQL', 'SQL'],
      dependencies: []
    });
    
    components.push({
      name: 'Redis Cache',
      type: 'database',
      path: 'infrastructure/',
      description: 'Caching layer and session storage',
      technologies: ['Redis'],
      dependencies: []
    });
    
    return components;
  }

  private async analyzeDependencies(): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [
      {
        from: 'Frontend',
        to: 'Backend API',
        type: 'api',
        description: 'HTTP REST API calls'
      },
      {
        from: 'Backend API',
        to: 'PostgreSQL Database',
        type: 'database',
        description: 'Data persistence and queries'
      },
      {
        from: 'Backend API',
        to: 'Redis Cache',
        type: 'database',
        description: 'Session management and caching'
      },
      {
        from: 'Backend API',
        to: 'MCP Documentation',
        type: 'service',
        description: 'Documentation generation requests'
      },
      {
        from: 'MCP Fetch',
        to: 'External APIs',
        type: 'api',
        description: 'Web scraping and content fetching'
      },
      {
        from: 'MCP Document-processor',
        to: 'OpenAI API',
        type: 'api',
        description: 'Document analysis and processing'
      }
    ];
    
    return dependencies;
  }

  private async calculateMetrics(): Promise<ProjectMetrics> {
    let totalFiles = 0;
    let linesOfCode = 0;
    
    try {
      // Count files and lines in key directories
      const dirsToAnalyze = ['frontend/src', 'backend/src', 'mcp-servers'];
      
      for (const dir of dirsToAnalyze) {
        const fullPath = path.join(this.projectRoot, dir);
        if (await this.pathExists(fullPath)) {
          const { files, lines } = await this.countFilesAndLines(fullPath);
          totalFiles += files;
          linesOfCode += lines;
        }
      }
    } catch (error) {
      logger.warn('Failed to calculate complete metrics', error);
    }
    
    // Determine complexity based on lines of code and components
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (linesOfCode > 10000) complexity = 'high';
    else if (linesOfCode > 5000) complexity = 'medium';
    
    return {
      totalFiles,
      linesOfCode,
      components: 7, // Estimated from identified components
      complexity
    };
  }

  private async generateRecommendations(
    components: ComponentInfo[], 
    dependencies: DependencyInfo[], 
    metrics: ProjectMetrics
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Performance recommendations
    if (metrics.complexity === 'high') {
      recommendations.push('Consider implementing microservices architecture for better scalability');
      recommendations.push('Add comprehensive monitoring and logging');
    }
    
    // Security recommendations
    recommendations.push('Implement rate limiting on all API endpoints');
    recommendations.push('Add input validation and sanitization');
    recommendations.push('Use HTTPS in production with proper SSL certificates');
    
    // Architecture recommendations
    if (components.length > 5) {
      recommendations.push('Consider implementing API Gateway for service coordination');
    }
    
    recommendations.push('Add comprehensive error handling and graceful degradation');
    recommendations.push('Implement proper backup and disaster recovery procedures');
    recommendations.push('Add automated testing for all critical components');
    
    return recommendations;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async countFilesAndLines(dirPath: string): Promise<{ files: number; lines: number }> {
    let files = 0;
    let lines = 0;
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subResult = await this.countFilesAndLines(fullPath);
          files += subResult.files;
          lines += subResult.lines;
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
          files++;
          try {
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            lines += content.split('\n').length;
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to analyze directory', { dirPath, error });
    }
    
    return { files, lines };
  }
}