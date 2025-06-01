import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface DiagramOptions {
  outputDir: string;
  format?: 'mermaid' | 'plantuml' | 'svg';
}

export class DiagramGenerator {
  constructor(private options: DiagramOptions) {}

  async generateArchitectureDiagram(): Promise<string> {
    logger.info('Generating architecture diagram');
    
    const mermaidDiagram = `
graph TB
    subgraph "Frontend"
        FE[Next.js App]
        UI[React Components]
        PWA[Progressive Web App]
    end
    
    subgraph "Backend"
        API[Express API]
        AUTH[Authentication]
        DB_LAYER[Database Layer]
    end
    
    subgraph "MCP Servers"
        MCP_DOCS[Documentation]
        MCP_FETCH[Web Fetching]
        MCP_FS[Filesystem]
        MCP_DOC[Document Processor]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL)]
        REDIS[(Redis Cache)]
        DO_SPACES[DO Spaces]
    end
    
    subgraph "External APIs"
        OPENAI[OpenAI API]
        PINECONE[Pinecone Vector DB]
        FIRECRAWL[Firecrawl API]
    end
    
    FE --> API
    API --> DB_LAYER
    DB_LAYER --> PG
    API --> REDIS
    API --> MCP_DOCS
    API --> MCP_FETCH
    API --> MCP_FS
    API --> MCP_DOC
    MCP_FETCH --> FIRECRAWL
    MCP_DOC --> OPENAI
    API --> PINECONE
    MCP_FS --> DO_SPACES
    
    style FE fill:#e1f5fe
    style API fill:#f3e5f5
    style PG fill:#e8f5e8
    style REDIS fill:#fff3e0
`;

    const outputPath = path.join(this.options.outputDir, 'architecture.mmd');
    await fs.promises.writeFile(outputPath, mermaidDiagram);
    
    logger.info('Architecture diagram generated', { path: outputPath });
    return outputPath;
  }

  async generateDatabaseDiagram(): Promise<string> {
    logger.info('Generating database diagram');
    
    const mermaidERD = `
erDiagram
    USERS {
        id uuid PK
        email varchar
        password_hash varchar
        first_name varchar
        last_name varchar
        organization varchar
        created_at timestamp
        updated_at timestamp
    }
    
    GRANTS {
        id uuid PK
        title varchar
        description text
        amount decimal
        deadline date
        status varchar
        created_at timestamp
        updated_at timestamp
    }
    
    APPLICATIONS {
        id uuid PK
        user_id uuid FK
        grant_id uuid FK
        status varchar
        submitted_at timestamp
        documents jsonb
        created_at timestamp
        updated_at timestamp
    }
    
    DOCUMENTS {
        id uuid PK
        application_id uuid FK
        filename varchar
        file_path varchar
        file_type varchar
        file_size integer
        uploaded_at timestamp
    }
    
    USERS ||--o{ APPLICATIONS : submits
    GRANTS ||--o{ APPLICATIONS : receives
    APPLICATIONS ||--o{ DOCUMENTS : contains
`;

    const outputPath = path.join(this.options.outputDir, 'database.mmd');
    await fs.promises.writeFile(outputPath, mermaidERD);
    
    logger.info('Database diagram generated', { path: outputPath });
    return outputPath;
  }

  async generateApiFlowDiagram(): Promise<string> {
    logger.info('Generating API flow diagram');
    
    const mermaidFlow = `
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as Database
    participant MCP as MCP Servers
    participant EXT as External APIs
    
    U->>FE: Access Application
    FE->>API: Authentication Request
    API->>DB: Validate Credentials
    DB-->>API: User Data
    API-->>FE: JWT Token
    
    U->>FE: Browse Grants
    FE->>API: GET /api/grants
    API->>MCP: Fetch Latest Grants
    MCP->>EXT: Scrape Grant Data
    EXT-->>MCP: Grant Information
    MCP-->>API: Processed Data
    API->>DB: Cache Results
    API-->>FE: Grant List
    
    U->>FE: Submit Application
    FE->>API: POST /api/applications
    API->>MCP: Process Documents
    MCP->>EXT: AI Analysis
    EXT-->>MCP: Document Insights
    MCP-->>API: Processed Application
    API->>DB: Store Application
    API-->>FE: Confirmation
`;

    const outputPath = path.join(this.options.outputDir, 'api-flow.mmd');
    await fs.promises.writeFile(outputPath, mermaidFlow);
    
    logger.info('API flow diagram generated', { path: outputPath });
    return outputPath;
  }

  async generateAllDiagrams(): Promise<string[]> {
    await fs.promises.mkdir(this.options.outputDir, { recursive: true });
    
    const diagrams = await Promise.all([
      this.generateArchitectureDiagram(),
      this.generateDatabaseDiagram(),
      this.generateApiFlowDiagram()
    ]);
    
    logger.info('All diagrams generated', { count: diagrams.length });
    return diagrams;
  }
}