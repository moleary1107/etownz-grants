# AI-Powered Grant Editor - Technical Implementation Plan

## 🎯 **Technical Overview**

This document outlines the technical implementation of a Lucid-style collaborative AI editor for grant applications, building upon eTownz's existing infrastructure and addressing identified gaps in the current AI implementation.

## 📊 **Current State Analysis**

### **✅ Existing Foundation (60% AI Features Complete)**

#### **Backend Infrastructure**
```typescript
// Current robust foundation
const existingServices = {
  openAI: 'GPT-4 Turbo and GPT-4o-mini integration',
  documentProcessing: 'PDF/DOCX analysis with OCR',
  grantAnalysis: 'AI-powered matching and requirements analysis',
  database: 'PostgreSQL with comprehensive schema',
  api: 'RESTful APIs with TypeScript',
  realtime: 'WebSocket infrastructure for collaboration'
};
```

#### **Frontend Architecture**
```typescript
// Current Next.js 14 setup
const currentFrontend = {
  framework: 'Next.js 14 with App Router',
  stateManagement: 'Zustand with localStorage persistence',
  uiFramework: 'Tailwind CSS with shadcn/ui components',
  aiIntegration: 'Multi-tab interface with AI Assistant',
  forms: 'Step-by-step wizard with auto-save',
  collaboration: 'Real-time data sharing'
};
```

### **❌ Missing Critical Components**

#### **Vector Database Layer**
```bash
# Configured but not implemented
PINECONE_API_KEY=configured_but_not_used
```

#### **Real-time Editor Infrastructure**
- No rich text editing framework
- AI suggestions are static, not contextual
- No collaborative editing capabilities
- Missing semantic search integration

#### **Enhanced AI Services**
- Placeholder endpoints for content generation
- No streaming AI responses
- Missing contextual awareness
- No learning from user interactions

---

## 🏗️ **Technical Architecture Design**

### **Component Integration Map**
```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│   Document Navigator│     Editor Canvas   │    AI Sidebar       │
│   (Existing Enhanced)│     (New Lexical)   │  (Enhanced Existing)│
├─────────────────────┼─────────────────────┼─────────────────────┤
│ • Section structure │ • Rich text editing │ • Chat interface    │
│ • Requirements list │ • AI suggestions    │ • Live suggestions  │
│ • Completion status │ • Real-time collab  │ • Requirements view │
│ • Navigation        │ • Auto-save        │ • Compliance check  │
└─────────────────────┴─────────────────────┴─────────────────────┘
                      │
              ┌───────┴───────┐
              │  Backend APIs │
              │ (Enhanced)    │
              └───────────────┘
```

### **Data Flow Architecture**
```typescript
interface EditorDataFlow {
  userInput: string;
  editorState: LexicalEditorState;
  context: GrantContext;
  
  // Enhanced AI pipeline
  aiProcessing: {
    vectorSearch: VectorSearchResult[];
    semanticAnalysis: SemanticAnalysis;
    suggestions: AISuggestion[];
    compliance: ComplianceCheck;
  };
  
  // Real-time collaboration
  collaboration: {
    editorUpdates: EditorUpdate[];
    userPresence: UserPresence[];
    comments: Comment[];
  };
  
  // State persistence
  persistence: {
    autoSave: AutoSaveData;
    versionHistory: VersionHistory[];
    localCache: EditorCache;
  };
}
```

---

## 🔧 **Implementation Phase 1: Vector Database Foundation**

### **1.1 Pinecone Integration Service**

#### **Enhanced Vector Database Service**
```typescript
// backend/src/services/vectorDatabase.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

export class VectorDatabaseService {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName = 'etownz-grants';

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  async initializeIndex(): Promise<void> {
    try {
      const indexList = await this.pinecone.listIndexes();
      const exists = indexList.indexes?.some(index => index.name === this.indexName);
      
      if (!exists) {
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // text-embedding-3-small dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        console.log('Created Pinecone index:', this.indexName);
      }
    } catch (error) {
      console.error('Failed to initialize Pinecone index:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8192) // Respect token limits
    });
    return response.data[0].embedding;
  }

  async storeGrantContent(
    id: string,
    content: string,
    metadata: GrantContentMetadata,
    namespace: string = 'grants'
  ): Promise<void> {
    const embedding = await this.generateEmbedding(content);
    const index = this.pinecone.index(this.indexName);
    
    await index.namespace(namespace).upsert([{
      id,
      values: embedding,
      metadata: {
        ...metadata,
        content: content.substring(0, 1000), // Store truncated content
        timestamp: new Date().toISOString()
      }
    }]);
  }

  async searchSimilarContent(
    query: string,
    namespace: string = 'grants',
    filters?: Record<string, any>,
    topK: number = 10
  ): Promise<SimilarContent[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const index = this.pinecone.index(this.indexName);
    
    const searchResults = await index.namespace(namespace).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: filters
    });

    return searchResults.matches?.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as GrantContentMetadata,
      content: match.metadata?.content as string || ''
    })) || [];
  }
}

interface GrantContentMetadata {
  grantId: string;
  section: string;
  grantType: string;
  fundingBody: string;
  successRate?: number;
  organizationType?: string;
  content?: string;
}

interface SimilarContent {
  id: string;
  score: number;
  metadata: GrantContentMetadata;
  content: string;
}
```

### **1.2 Database Schema Extensions**

#### **Vector Tracking Tables**
```sql
-- infrastructure/db/migrations/004_vector_database_integration.sql

-- Track vector embeddings for all content
CREATE TABLE IF NOT EXISTS vector_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'grant', 'application', 'section', 'template'
    entity_id UUID NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA256 of content for cache invalidation
    vector_id VARCHAR(255) NOT NULL, -- Pinecone vector ID
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    namespace VARCHAR(100) NOT NULL DEFAULT 'grants',
    content_preview TEXT, -- First 500 chars for debugging
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(entity_type, entity_id, namespace)
);

-- Enhanced AI interaction tracking for editor
CREATE TABLE IF NOT EXISTS ai_editor_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL, -- Editor session
    user_id UUID NOT NULL REFERENCES users(id),
    application_id UUID REFERENCES applications(id),
    interaction_type VARCHAR(50) NOT NULL, -- 'suggestion', 'generation', 'chat', 'semantic_search'
    
    -- Input context
    input_content TEXT,
    cursor_position INTEGER,
    section_type VARCHAR(50),
    
    -- AI processing
    prompt_template VARCHAR(100),
    model_used VARCHAR(50),
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    cost_cents INTEGER,
    
    -- Output and user response
    ai_response TEXT,
    confidence_score DECIMAL(3,2),
    user_action VARCHAR(20), -- 'accepted', 'rejected', 'modified', 'ignored'
    user_modification TEXT,
    
    -- Context for learning
    context_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content suggestions and their lifecycle
CREATE TABLE IF NOT EXISTS ai_content_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id),
    section_type VARCHAR(50) NOT NULL,
    suggestion_type VARCHAR(50) NOT NULL, -- 'insertion', 'replacement', 'enhancement', 'structure'
    
    -- Position and context
    content_position INTEGER, -- Character position in editor
    surrounding_context TEXT, -- Text around the suggestion
    
    -- Suggestion content
    original_text TEXT,
    suggested_text TEXT NOT NULL,
    reasoning TEXT,
    confidence_score DECIMAL(3,2),
    
    -- Sources and basis
    source_type VARCHAR(50), -- 'vector_search', 'pattern_match', 'rule_based', 'llm_generation'
    source_ids TEXT[], -- References to source content
    similar_examples JSONB,
    
    -- Lifecycle
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'modified', 'expired'
    user_response_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced grant requirements with AI analysis
CREATE TABLE IF NOT EXISTS grant_requirements_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id),
    
    -- Extracted requirements
    requirements JSONB NOT NULL, -- Structured requirement data
    compliance_rules JSONB NOT NULL, -- Rules for automated checking
    success_patterns JSONB, -- Patterns from successful applications
    
    -- AI analysis metadata
    analysis_model VARCHAR(50),
    confidence_score DECIMAL(3,2),
    last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Version control
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES grant_requirements_analysis(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_vector_embeddings_entity ON vector_embeddings(entity_type, entity_id);
CREATE INDEX idx_vector_embeddings_hash ON vector_embeddings(content_hash);
CREATE INDEX idx_ai_editor_interactions_session ON ai_editor_interactions(session_id, created_at);
CREATE INDEX idx_ai_editor_interactions_user ON ai_editor_interactions(user_id, interaction_type);
CREATE INDEX idx_ai_content_suggestions_app ON ai_content_suggestions(application_id, status);
CREATE INDEX idx_ai_content_suggestions_position ON ai_content_suggestions(application_id, content_position);
CREATE INDEX idx_grant_requirements_grant ON grant_requirements_analysis(grant_id, version);
```

### **1.3 Enhanced AI Service Integration**

#### **Semantic Editor Service**
```typescript
// backend/src/services/semanticEditorService.ts
import { VectorDatabaseService } from './vectorDatabase';
import { OpenAIService } from './openaiService'; // Existing service

export class SemanticEditorService {
  private vectorDB: VectorDatabaseService;
  private openAI: OpenAIService;
  private database: any; // Your existing database connection

  constructor() {
    this.vectorDB = new VectorDatabaseService();
    this.openAI = new OpenAIService();
  }

  async generateContextualSuggestions(
    content: string,
    cursorPosition: number,
    context: EditorContext
  ): Promise<AISuggestion[]> {
    // Extract surrounding content for context
    const surroundingText = this.extractSurroundingText(content, cursorPosition, 200);
    
    // Get similar successful content
    const similarContent = await this.vectorDB.searchSimilarContent(
      surroundingText,
      'grants',
      {
        grantType: context.grantType,
        section: context.section,
        successRate: { $gte: 0.8 }
      },
      5
    );

    // Get grant requirements for this context
    const requirements = await this.getGrantRequirements(context.grantId, context.section);

    // Generate suggestions using enhanced prompt
    const suggestions = await this.openAI.generateSuggestions({
      content: surroundingText,
      position: cursorPosition,
      context,
      similarExamples: similarContent,
      requirements,
      suggestionTypes: ['insertion', 'enhancement', 'structure']
    });

    // Store suggestions for tracking
    await this.storeSuggestions(suggestions, context);

    return suggestions;
  }

  async performSemanticSearch(
    query: string,
    context: EditorContext,
    searchType: 'content' | 'examples' | 'patterns' = 'content'
  ): Promise<SemanticSearchResult[]> {
    const namespace = this.getNamespaceForSearchType(searchType);
    
    const results = await this.vectorDB.searchSimilarContent(
      query,
      namespace,
      {
        grantType: context.grantType,
        section: context.section
      },
      10
    );

    // Enhance results with additional context
    const enhancedResults = await Promise.all(
      results.map(async (result) => {
        const additionalContext = await this.getAdditionalContext(result.id, result.metadata);
        return {
          ...result,
          context: additionalContext,
          relevanceReason: await this.explainRelevance(query, result.content, context)
        };
      })
    );

    return enhancedResults;
  }

  async analyzeContentQuality(
    content: string,
    context: EditorContext
  ): Promise<ContentQualityAnalysis> {
    // Get similar high-performing content
    const benchmarks = await this.vectorDB.searchSimilarContent(
      content,
      'grants',
      {
        grantType: context.grantType,
        section: context.section,
        successRate: { $gte: 0.9 }
      },
      3
    );

    // Analyze against grant requirements
    const requirements = await this.getGrantRequirements(context.grantId, context.section);
    
    // Use AI to assess quality
    const analysis = await this.openAI.analyzeContent({
      content,
      benchmarks,
      requirements,
      context
    });

    return analysis;
  }

  private extractSurroundingText(
    content: string,
    position: number,
    radius: number
  ): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(content.length, position + radius);
    return content.substring(start, end);
  }

  private async storeSuggestions(
    suggestions: AISuggestion[],
    context: EditorContext
  ): Promise<void> {
    for (const suggestion of suggestions) {
      await this.database.query(`
        INSERT INTO ai_content_suggestions (
          application_id, section_type, suggestion_type,
          content_position, suggested_text, reasoning,
          confidence_score, source_type, context_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        context.applicationId,
        context.section,
        suggestion.type,
        suggestion.position,
        suggestion.content,
        suggestion.reasoning,
        suggestion.confidence,
        'semantic_search',
        JSON.stringify({ grantId: context.grantId })
      ]);
    }
  }
}

interface EditorContext {
  applicationId: string;
  grantId: string;
  section: string;
  grantType: string;
  userId: string;
  sessionId: string;
}

interface AISuggestion {
  id: string;
  type: 'insertion' | 'replacement' | 'enhancement' | 'structure';
  content: string;
  position?: number;
  reasoning: string;
  confidence: number;
  sources?: string[];
}

interface ContentQualityAnalysis {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  improvements: Improvement[];
  benchmarkComparison: BenchmarkComparison;
}
```

---

## 🎨 **Implementation Phase 2: Lexical Editor Integration**

### **2.1 Core Editor Architecture**

#### **Grant-Specific Lexical Setup**
```typescript
// frontend/src/components/editor/GrantEditor.tsx
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { CharacterLimitPlugin } from '@lexical/react/LexicalCharacterLimitPlugin';

// Custom nodes for grant content
import { RequirementNode } from './nodes/RequirementNode';
import { AISuggestionNode } from './nodes/AISuggestionNode';
import { ComplianceHighlightNode } from './nodes/ComplianceHighlightNode';
import { CitationNode } from './nodes/CitationNode';
import { BudgetTableNode } from './nodes/BudgetTableNode';

// Custom plugins
import { AIAssistPlugin } from './plugins/AIAssistPlugin';
import { CollaborationPlugin } from './plugins/CollaborationPlugin';
import { AutoSavePlugin } from './plugins/AutoSavePlugin';
import { RequirementCheckPlugin } from './plugins/RequirementCheckPlugin';
import { SemanticSearchPlugin } from './plugins/SemanticSearchPlugin';

interface GrantEditorProps {
  applicationId: string;
  grantId: string;
  section: SectionType;
  initialContent?: string;
  onContentChange: (content: string, editorState: any) => void;
  onAIRequest: (context: AIRequestContext) => void;
  readonly?: boolean;
}

export const GrantEditor: React.FC<GrantEditorProps> = ({
  applicationId,
  grantId,
  section,
  initialContent = '',
  onContentChange,
  onAIRequest,
  readonly = false
}) => {
  const theme = {
    paragraph: 'editor-paragraph',
    heading: {
      h1: 'editor-heading-h1',
      h2: 'editor-heading-h2',
      h3: 'editor-heading-h3'
    },
    list: {
      nested: {
        listitem: 'editor-nested-listitem'
      },
      ol: 'editor-list-ol',
      ul: 'editor-list-ul',
      listitem: 'editor-listitem'
    },
    text: {
      bold: 'editor-text-bold',
      italic: 'editor-text-italic',
      underline: 'editor-text-underline',
      strikethrough: 'editor-text-strikethrough',
      code: 'editor-text-code'
    },
    // Custom theme for grant-specific content
    aiSuggestion: 'editor-ai-suggestion',
    requirement: 'editor-requirement',
    complianceHighlight: 'editor-compliance-highlight',
    citation: 'editor-citation'
  };

  const initialConfig = {
    namespace: `grant-editor-${section}`,
    theme,
    onError: (error: Error) => {
      console.error('Editor error:', error);
      // Send to error tracking service
    },
    editable: !readonly,
    nodes: [
      RequirementNode,
      AISuggestionNode,
      ComplianceHighlightNode,
      CitationNode,
      BudgetTableNode
    ]
  };

  const handleEditorChange = useCallback((editorState: any) => {
    editorState.read(() => {
      const root = $getRoot();
      const textContent = root.getTextContent();
      onContentChange(textContent, editorState);
    });
  }, [onContentChange]);

  return (
    <div className="grant-editor-container">
      <LexicalComposer initialConfig={initialConfig}>
        {/* Editor Toolbar */}
        <ToolbarPlugin 
          grantContext={{ grantId, section, applicationId }}
          onAIRequest={onAIRequest}
        />

        {/* Main Editor */}
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="editor-input" 
                ariaLabel={`Grant application ${section} editor`}
              />
            }
            placeholder={
              <div className="editor-placeholder">
                Start writing your {section.replace('_', ' ')}...
                <span className="ai-hint">Press / for AI assistance</span>
              </div>
            }
            ErrorBoundary={EditorErrorBoundary}
          />

          {/* Essential Plugins */}
          <HistoryPlugin />
          <AutoFocusPlugin />
          <OnChangePlugin onChange={handleEditorChange} />
          
          {/* Word/Character limits based on grant requirements */}
          <CharacterLimitPlugin 
            charset="UTF-16" 
            maxLength={getMaxLengthForSection(grantId, section)}
          />

          {/* Custom Grant-Specific Plugins */}
          <AutoSavePlugin 
            applicationId={applicationId}
            section={section}
            saveInterval={30000} // Save every 30 seconds
          />
          
          <AIAssistPlugin
            grantContext={{ grantId, section, applicationId }}
            onSuggestion={handleAISuggestion}
            debounceMs={1000}
          />
          
          <CollaborationPlugin
            roomId={`${applicationId}-${section}`}
            userId={getCurrentUserId()}
          />
          
          <RequirementCheckPlugin
            grantId={grantId}
            section={section}
            onComplianceChange={handleComplianceChange}
          />

          <SemanticSearchPlugin
            onSearch={handleSemanticSearch}
            triggers={['/', '@similar', '@examples']}
          />
        </div>

        {/* Editor Footer */}
        <EditorFooter
          wordCount={wordCount}
          characterCount={characterCount}
          lastSaved={lastSaved}
          complianceStatus={complianceStatus}
        />
      </LexicalComposer>
    </div>
  );
};
```

### **2.2 Custom Lexical Nodes**

#### **AI Suggestion Node**
```typescript
// frontend/src/components/editor/nodes/AISuggestionNode.ts
import {
  DecoratorNode,
  NodeKey,
  LexicalNode,
  SerializedLexicalNode,
  Spread
} from 'lexical';

export interface AISuggestionData {
  id: string;
  type: 'insertion' | 'replacement' | 'enhancement';
  content: string;
  originalText?: string;
  reasoning: string;
  confidence: number;
  sources?: string[];
  position: number;
}

type SerializedAISuggestionNode = Spread<
  {
    suggestion: AISuggestionData;
    type: 'ai-suggestion';
    version: 1;
  },
  SerializedLexicalNode
>;

export class AISuggestionNode extends DecoratorNode<React.ReactElement> {
  __suggestion: AISuggestionData;

  static getType(): string {
    return 'ai-suggestion';
  }

  static clone(node: AISuggestionNode): AISuggestionNode {
    return new AISuggestionNode(node.__suggestion, node.__key);
  }

  constructor(suggestion: AISuggestionData, key?: NodeKey) {
    super(key);
    this.__suggestion = suggestion;
  }

  createDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'ai-suggestion-node';
    element.setAttribute('data-suggestion-id', this.__suggestion.id);
    return element;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedAISuggestionNode): AISuggestionNode {
    const { suggestion } = serializedNode;
    return new AISuggestionNode(suggestion);
  }

  exportJSON(): SerializedAISuggestionNode {
    return {
      ...super.exportJSON(),
      suggestion: this.__suggestion,
      type: 'ai-suggestion',
      version: 1
    };
  }

  decorate(): React.ReactElement {
    return (
      <AISuggestionComponent
        suggestion={this.__suggestion}
        onAccept={() => this.acceptSuggestion()}
        onReject={() => this.rejectSuggestion()}
        onModify={(newContent) => this.modifySuggestion(newContent)}
      />
    );
  }

  acceptSuggestion(): void {
    const editor = getActiveEditor();
    editor.update(() => {
      if (this.__suggestion.type === 'replacement' && this.__suggestion.originalText) {
        // Replace the original text with suggestion
        const textNode = $createTextNode(this.__suggestion.content);
        this.replace(textNode);
      } else {
        // Insert new content
        const textNode = $createTextNode(this.__suggestion.content);
        this.insertAfter(textNode);
        this.remove();
      }
    });

    // Track acceptance
    this.trackSuggestionAction('accepted');
  }

  rejectSuggestion(): void {
    const editor = getActiveEditor();
    editor.update(() => {
      this.remove();
    });

    // Track rejection
    this.trackSuggestionAction('rejected');
  }

  modifySuggestion(newContent: string): void {
    const editor = getActiveEditor();
    editor.update(() => {
      const textNode = $createTextNode(newContent);
      this.replace(textNode);
    });

    // Track modification
    this.trackSuggestionAction('modified', newContent);
  }

  private trackSuggestionAction(action: string, modification?: string): void {
    // Send analytics to backend
    fetch('/api/ai/editor/suggestion-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestionId: this.__suggestion.id,
        action,
        modification,
        timestamp: Date.now()
      })
    }).catch(console.error);
  }
}

// React component for rendering the suggestion
const AISuggestionComponent: React.FC<{
  suggestion: AISuggestionData;
  onAccept: () => void;
  onReject: () => void;
  onModify: (content: string) => void;
}> = ({ suggestion, onAccept, onReject, onModify }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(suggestion.content);

  return (
    <div className="ai-suggestion-wrapper">
      <div className="ai-suggestion-content">
        <div className="suggestion-header">
          <div className="suggestion-meta">
            <span className="suggestion-type">{suggestion.type}</span>
            <span className="confidence-score">{Math.round(suggestion.confidence * 100)}%</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="expand-button"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        <div className="suggestion-text">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="suggestion-edit"
            />
          ) : (
            <span>{suggestion.content}</span>
          )}
        </div>

        {isExpanded && (
          <div className="suggestion-details">
            <p className="reasoning">{suggestion.reasoning}</p>
            {suggestion.sources && (
              <div className="sources">
                <span>Based on: </span>
                {suggestion.sources.map((source, index) => (
                  <span key={index} className="source-tag">{source}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="suggestion-actions">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  onModify(editContent);
                  setIsEditing(false);
                }}
                className="action-button save"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditContent(suggestion.content);
                  setIsEditing(false);
                }}
                className="action-button cancel"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={onAccept} className="action-button accept">
                ✓ Accept
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="action-button edit"
              >
                ✏ Edit
              </button>
              <button onClick={onReject} className="action-button reject">
                ✗ Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### **Requirement Highlight Node**
```typescript
// frontend/src/components/editor/nodes/RequirementNode.ts
import { DecoratorNode, NodeKey } from 'lexical';

export interface RequirementData {
  id: string;
  text: string;
  type: 'mandatory' | 'recommended' | 'conditional';
  section: string;
  isMet: boolean;
  evidence?: string;
  grantRequirementId: string;
}

export class RequirementNode extends DecoratorNode<React.ReactElement> {
  __requirement: RequirementData;

  static getType(): string {
    return 'requirement';
  }

  constructor(requirement: RequirementData, key?: NodeKey) {
    super(key);
    this.__requirement = requirement;
  }

  createDOM(): HTMLElement {
    const element = document.createElement('span');
    element.className = `requirement-node requirement-${this.__requirement.type} ${
      this.__requirement.isMet ? 'met' : 'unmet'
    }`;
    return element;
  }

  decorate(): React.ReactElement {
    return (
      <RequirementHighlight
        requirement={this.__requirement}
        onToggle={(isMet) => this.updateRequirementStatus(isMet)}
      />
    );
  }

  private updateRequirementStatus(isMet: boolean): void {
    // Update backend
    fetch('/api/requirements/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirementId: this.__requirement.id,
        isMet,
        evidence: this.__requirement.evidence
      })
    });
  }
}

const RequirementHighlight: React.FC<{
  requirement: RequirementData;
  onToggle: (isMet: boolean) => void;
}> = ({ requirement, onToggle }) => {
  return (
    <span 
      className={`requirement-highlight ${requirement.isMet ? 'met' : 'unmet'}`}
      title={`${requirement.type} requirement: ${requirement.text}`}
    >
      <input
        type="checkbox"
        checked={requirement.isMet}
        onChange={(e) => onToggle(e.target.checked)}
        className="requirement-checkbox"
      />
      <span className="requirement-text">{requirement.text}</span>
      {requirement.type === 'mandatory' && (
        <span className="mandatory-indicator">*</span>
      )}
    </span>
  );
};
```

### **2.3 Custom Editor Plugins**

#### **AI Assist Plugin**
```typescript
// frontend/src/components/editor/plugins/AIAssistPlugin.ts
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $getNodeByKey } from 'lexical';
import { useEffect, useCallback, useState } from 'react';
import { debounce } from 'lodash';

interface AIAssistPluginProps {
  grantContext: GrantContext;
  onSuggestion: (suggestions: AISuggestion[]) => void;
  debounceMs?: number;
}

export const AIAssistPlugin: React.FC<AIAssistPluginProps> = ({
  grantContext,
  onSuggestion,
  debounceMs = 1000
}) => {
  const [editor] = useLexicalComposerContext();
  const [isProcessing, setIsProcessing] = useState(false);

  const requestAISuggestions = useCallback(
    debounce(async (content: string, cursorPosition: number) => {
      if (content.length < 50) return; // Don't process very short content
      
      setIsProcessing(true);
      
      try {
        const response = await fetch('/api/ai/editor/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            cursorPosition,
            context: grantContext,
            sessionId: getEditorSessionId()
          })
        });

        const suggestions = await response.json();
        onSuggestion(suggestions);
      } catch (error) {
        console.error('Failed to get AI suggestions:', error);
      } finally {
        setIsProcessing(false);
      }
    }, debounceMs),
    [grantContext, onSuggestion, debounceMs]
  );

  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        
        if ($isRangeSelection(selection)) {
          const root = $getRoot();
          const content = root.getTextContent();
          const cursorPosition = selection.anchor.offset;

          // Only request suggestions if user has paused typing
          requestAISuggestions(content, cursorPosition);
        }
      });
    });

    return unregister;
  }, [editor, requestAISuggestions]);

  // Handle slash commands for AI
  useEffect(() => {
    const unregister = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        const selection = $getSelection();
        
        if (event.key === '/' && $isRangeSelection(selection)) {
          event.preventDefault();
          
          // Show AI command palette
          showAICommandPalette({
            position: selection.anchor.offset,
            context: grantContext
          });
          
          return true;
        }
        
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return unregister;
  }, [editor, grantContext]);

  return null; // This plugin doesn't render anything itself
};

// AI Command Palette for slash commands
const showAICommandPalette = ({ position, context }: {
  position: number;
  context: GrantContext;
}) => {
  // Implementation would show a floating menu with AI commands like:
  // /generate - Generate content for this section
  // /improve - Improve selected text
  // /examples - Find similar examples
  // /requirements - Check requirements
  // /compliance - Check compliance
};
```

#### **Real-time Collaboration Plugin**
```typescript
// frontend/src/components/editor/plugins/CollaborationPlugin.ts
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface CollaborationPluginProps {
  roomId: string;
  userId: string;
}

export const CollaborationPlugin: React.FC<CollaborationPluginProps> = ({
  roomId,
  userId
}) => {
  const [editor] = useLexicalComposerContext();
  const socketRef = useRef<Socket | null>(null);
  const isApplyingRemoteChange = useRef(false);

  useEffect(() => {
    // Connect to collaboration server
    socketRef.current = io('/collaboration', {
      auth: {
        token: localStorage.getItem('authToken'),
        roomId,
        userId
      }
    });

    const socket = socketRef.current;

    // Join collaboration room
    socket.emit('join-editor-room', { roomId, userId });

    // Handle incoming editor updates
    socket.on('editor-update', (update: EditorUpdate) => {
      if (update.userId === userId) return; // Ignore own updates

      isApplyingRemoteChange.current = true;
      
      editor.update(() => {
        // Apply remote change to editor
        applyRemoteUpdate(update);
      });
      
      isApplyingRemoteChange.current = false;
    });

    // Handle user presence updates
    socket.on('user-presence', (presence: UserPresence[]) => {
      updateUserPresence(presence);
    });

    // Send local changes to collaborators
    const unregister = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (isApplyingRemoteChange.current) return;

      const changes = extractChanges(editorState, dirtyElements, dirtyLeaves);
      
      if (changes.length > 0) {
        socket.emit('editor-update', {
          roomId,
          userId,
          changes,
          timestamp: Date.now()
        });
      }
    });

    return () => {
      socket.disconnect();
      unregister();
    };
  }, [roomId, userId, editor]);

  return null;
};

interface EditorUpdate {
  userId: string;
  changes: EditorChange[];
  timestamp: number;
}

interface EditorChange {
  type: 'insert' | 'delete' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
}

const applyRemoteUpdate = (update: EditorUpdate) => {
  // Transform and apply remote changes
  // This would implement operational transformation
  update.changes.forEach(change => {
    switch (change.type) {
      case 'insert':
        insertTextAtPosition(change.position, change.content || '');
        break;
      case 'delete':
        deleteTextAtPosition(change.position, change.length || 0);
        break;
      case 'format':
        applyFormatting(change.position, change.length || 0, change.attributes || {});
        break;
    }
  });
};
```

---

## 🎯 **Implementation Phase 3: Enhanced AI Services**

### **3.1 Real-time AI API Endpoints**

#### **AI Editor Controller**
```typescript
// backend/src/controllers/aiEditorController.ts
import express from 'express';
import { SemanticEditorService } from '../services/semanticEditorService';
import { AIStreamingService } from '../services/aiStreamingService';
import { EditorCollaborationService } from '../services/editorCollaborationService';

export class AIEditorController {
  private semanticService: SemanticEditorService;
  private streamingService: AIStreamingService;
  private collaborationService: EditorCollaborationService;

  constructor() {
    this.semanticService = new SemanticEditorService();
    this.streamingService = new AIStreamingService();
    this.collaborationService = new EditorCollaborationService();
  }

  // Real-time AI suggestions endpoint
  async generateSuggestions(req: express.Request, res: express.Response) {
    try {
      const { content, cursorPosition, context, sessionId } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!content || cursorPosition === undefined || !context) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Rate limiting check
      const rateLimitResult = await this.checkRateLimit(userId, 'suggestions');
      if (!rateLimitResult.allowed) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime
        });
      }

      // Generate contextual suggestions
      const suggestions = await this.semanticService.generateContextualSuggestions(
        content,
        cursorPosition,
        {
          ...context,
          userId,
          sessionId
        }
      );

      // Log interaction for learning
      await this.logAIInteraction({
        userId,
        sessionId,
        applicationId: context.applicationId,
        interactionType: 'suggestion',
        inputContent: content,
        cursorPosition,
        aiResponse: JSON.stringify(suggestions),
        processingTimeMs: Date.now() - req.startTime
      });

      res.json({
        suggestions,
        sessionId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  }

  // Streaming content generation
  async generateContent(req: express.Request, res: express.Response) {
    try {
      const { prompt, context, streamId } = req.body;
      const userId = req.user.id;

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Start streaming generation
      const stream = await this.streamingService.generateContentStream({
        prompt,
        context: { ...context, userId },
        onChunk: (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk, streamId })}\n\n`);
        },
        onComplete: (fullContent: string) => {
          res.write(`data: ${JSON.stringify({ type: 'complete', content: fullContent, streamId })}\n\n`);
          res.end();
        },
        onError: (error: Error) => {
          res.write(`data: ${JSON.stringify({ type: 'error', error: error.message, streamId })}\n\n`);
          res.end();
        }
      });

      // Handle client disconnect
      req.on('close', () => {
        stream.abort();
      });

    } catch (error) {
      console.error('Content generation failed:', error);
      res.status(500).json({ error: 'Content generation failed' });
    }
  }

  // Semantic search endpoint
  async semanticSearch(req: express.Request, res: express.Response) {
    try {
      const { query, context, searchType = 'content', limit = 10 } = req.body;
      const userId = req.user.id;

      const results = await this.semanticService.performSemanticSearch(
        query,
        { ...context, userId },
        searchType
      );

      // Limit results to prevent overwhelming the UI
      const limitedResults = results.slice(0, Math.min(limit, 20));

      res.json({
        query,
        results: limitedResults,
        searchType,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Semantic search failed:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }

  // Content quality analysis
  async analyzeContent(req: express.Request, res: express.Response) {
    try {
      const { content, context } = req.body;
      const userId = req.user.id;

      const analysis = await this.semanticService.analyzeContentQuality(
        content,
        { ...context, userId }
      );

      res.json({
        analysis,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Content analysis failed:', error);
      res.status(500).json({ error: 'Analysis failed' });
    }
  }

  // Suggestion feedback endpoint
  async recordSuggestionFeedback(req: express.Request, res: express.Response) {
    try {
      const { suggestionId, action, modification } = req.body;
      const userId = req.user.id;

      await this.database.query(`
        UPDATE ai_content_suggestions 
        SET status = $1, user_response_at = NOW()
        WHERE id = $2
      `, [action, suggestionId]);

      // Log detailed feedback for ML improvement
      await this.database.query(`
        INSERT INTO ai_suggestion_feedback (
          suggestion_id, user_id, action, modification, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [suggestionId, userId, action, modification]);

      res.json({ success: true });

    } catch (error) {
      console.error('Failed to record feedback:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  }

  private async checkRateLimit(userId: string, operation: string) {
    // Implement Redis-based rate limiting
    // Return { allowed: boolean, resetTime?: number }
    return { allowed: true };
  }

  private async logAIInteraction(data: any) {
    await this.database.query(`
      INSERT INTO ai_editor_interactions (
        session_id, user_id, application_id, interaction_type,
        input_content, cursor_position, ai_response, processing_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      data.sessionId, data.userId, data.applicationId, data.interactionType,
      data.inputContent, data.cursorPosition, data.aiResponse, data.processingTimeMs
    ]);
  }
}
```

### **3.2 AI Streaming Service**

#### **Real-time Content Generation**
```typescript
// backend/src/services/aiStreamingService.ts
import OpenAI from 'openai';
import { EventEmitter } from 'events';

export class AIStreamingService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  async generateContentStream(options: StreamingOptions): Promise<StreamController> {
    const { prompt, context, onChunk, onComplete, onError } = options;
    
    const controller = new StreamController();
    let fullContent = '';

    try {
      // Build context-aware prompt
      const enhancedPrompt = await this.buildContextualPrompt(prompt, context);
      
      // Start streaming completion
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(context)
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000
      });

      // Process streaming response
      for await (const chunk of stream) {
        if (controller.isAborted) break;

        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      }

      if (!controller.isAborted) {
        onComplete(fullContent);
      }

    } catch (error) {
      console.error('Streaming generation failed:', error);
      onError(error as Error);
    }

    return controller;
  }

  private async buildContextualPrompt(prompt: string, context: EditorContext): Promise<string> {
    // Get grant requirements
    const requirements = await this.getGrantRequirements(context.grantId, context.section);
    
    // Get similar successful content
    const examples = await this.getSimilarExamples(prompt, context);

    // Build enhanced prompt
    return `
      Grant Application Context:
      - Grant Type: ${context.grantType}
      - Section: ${context.section}
      - Application ID: ${context.applicationId}

      Requirements:
      ${requirements.map(req => `- ${req.text}`).join('\n')}

      User Request: ${prompt}

      Examples from successful applications:
      ${examples.map(ex => `- ${ex.content.substring(0, 200)}...`).join('\n')}

      Please generate content that:
      1. Addresses the user's request
      2. Meets the grant requirements
      3. Follows patterns from successful examples
      4. Is appropriate for the ${context.section} section
      5. Uses professional grant application language
    `;
  }

  private getSystemPrompt(context: EditorContext): string {
    return `
      You are an expert grant writing assistant specializing in ${context.grantType} grants.
      
      Your role:
      - Generate high-quality, professional grant application content
      - Ensure compliance with grant requirements
      - Use evidence-based language and clear structure
      - Adapt writing style to the specific grant type and section
      - Provide content that increases the likelihood of grant approval

      Guidelines:
      - Be specific and avoid generic statements
      - Include quantifiable metrics when possible
      - Use active voice and clear, concise language
      - Structure content with logical flow
      - Address evaluation criteria directly
    `;
  }

  private async getGrantRequirements(grantId: string, section: string) {
    // Implementation to fetch grant requirements
    return [];
  }

  private async getSimilarExamples(prompt: string, context: EditorContext) {
    // Implementation to get similar successful examples
    return [];
  }
}

class StreamController {
  private _isAborted = false;

  get isAborted() {
    return this._isAborted;
  }

  abort() {
    this._isAborted = true;
  }
}

interface StreamingOptions {
  prompt: string;
  context: EditorContext;
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: Error) => void;
}
```

---

## 🎨 **Implementation Phase 4: AI Sidebar Integration**

### **4.1 Enhanced AI Sidebar**

#### **Multi-Tab AI Sidebar Component**
```typescript
// frontend/src/components/editor/AISidebar.tsx
import React, { useState, useCallback } from 'react';
import { useAIChat } from '../hooks/useAIChat';
import { useAISuggestions } from '../hooks/useAISuggestions';
import { useGrantRequirements } from '../hooks/useGrantRequirements';
import { useSemanticSearch } from '../hooks/useSemanticSearch';

interface AISidebarProps {
  applicationId: string;
  grantId: string;
  currentSection: string;
  editorContext: EditorContext;
  onInsertContent: (content: string, position?: number) => void;
  onNavigateToRequirement: (requirementId: string) => void;
}

type SidebarTab = 'chat' | 'suggestions' | 'requirements' | 'search' | 'examples';

export const AISidebar: React.FC<AISidebarProps> = ({
  applicationId,
  grantId,
  currentSection,
  editorContext,
  onInsertContent,
  onNavigateToRequirement
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  
  // AI hooks
  const { 
    messages, 
    sendMessage, 
    isLoading: chatLoading,
    clearMessages 
  } = useAIChat(applicationId, editorContext);
  
  const { 
    suggestions, 
    isGenerating: suggestionsLoading,
    acceptSuggestion,
    rejectSuggestion,
    refreshSuggestions
  } = useAISuggestions(editorContext);
  
  const { 
    requirements, 
    compliance, 
    isLoading: requirementsLoading,
    updateRequirementStatus
  } = useGrantRequirements(grantId, currentSection);
  
  const {
    searchResults,
    isSearching,
    performSearch,
    clearResults
  } = useSemanticSearch(editorContext);

  const tabConfig = {
    chat: {
      label: 'AI Chat',
      icon: '💬',
      badge: messages.filter(m => m.role === 'assistant' && !m.read).length,
      component: AIChatTab
    },
    suggestions: {
      label: 'Suggestions',
      icon: '💡',
      badge: suggestions.length,
      component: AISuggestionsTab
    },
    requirements: {
      label: 'Requirements',
      icon: '✅',
      badge: compliance.missingCount,
      component: RequirementsTab
    },
    search: {
      label: 'Search',
      icon: '🔍',
      badge: 0,
      component: SemanticSearchTab
    },
    examples: {
      label: 'Examples',
      icon: '📝',
      badge: 0,
      component: ExamplesTab
    }
  };

  return (
    <div className="ai-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="header-title">
          <span className="ai-icon">🤖</span>
          <h3>AI Assistant</h3>
        </div>
        
        <div className="context-info">
          <span className="grant-type">{editorContext.grantType}</span>
          <span className="section">{currentSection.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {Object.entries(tabConfig).map(([key, config]) => (
          <button
            key={key}
            className={`tab-button ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key as SidebarTab)}
            title={config.label}
          >
            <span className="tab-icon">{config.icon}</span>
            <span className="tab-label">{config.label}</span>
            {config.badge > 0 && (
              <span className="tab-badge">{config.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'chat' && (
          <AIChatTab
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={chatLoading}
            editorContext={editorContext}
            onInsertContent={onInsertContent}
          />
        )}
        
        {activeTab === 'suggestions' && (
          <AISuggestionsTab
            suggestions={suggestions}
            isLoading={suggestionsLoading}
            onAccept={acceptSuggestion}
            onReject={rejectSuggestion}
            onRefresh={refreshSuggestions}
            onInsertContent={onInsertContent}
          />
        )}
        
        {activeTab === 'requirements' && (
          <RequirementsTab
            requirements={requirements}
            compliance={compliance}
            isLoading={requirementsLoading}
            currentSection={currentSection}
            onUpdateStatus={updateRequirementStatus}
            onNavigate={onNavigateToRequirement}
          />
        )}
        
        {activeTab === 'search' && (
          <SemanticSearchTab
            results={searchResults}
            isSearching={isSearching}
            onSearch={performSearch}
            onClear={clearResults}
            onInsertContent={onInsertContent}
            context={editorContext}
          />
        )}
        
        {activeTab === 'examples' && (
          <ExamplesTab
            grantType={editorContext.grantType}
            section={currentSection}
            onInsertContent={onInsertContent}
          />
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="sidebar-footer">
        <QuickActionsPanel
          context={editorContext}
          onAction={handleQuickAction}
        />
      </div>
    </div>
  );

  function handleQuickAction(action: QuickAction) {
    switch (action.type) {
      case 'generate_content':
        setActiveTab('chat');
        sendMessage(`Generate content for ${action.target}`);
        break;
      case 'check_compliance':
        setActiveTab('requirements');
        // Trigger compliance check
        break;
      case 'find_examples':
        setActiveTab('search');
        performSearch(action.query || '');
        break;
      case 'improve_section':
        setActiveTab('chat');
        sendMessage(`How can I improve this ${currentSection} section?`);
        break;
    }
  }
};
```

#### **AI Chat Tab Component**
```typescript
// frontend/src/components/editor/tabs/AIChatTab.tsx
import React, { useState, useRef, useEffect } from 'react';

interface AIChatTabProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  editorContext: EditorContext;
  onInsertContent: (content: string, position?: number) => void;
}

export const AIChatTab: React.FC<AIChatTabProps> = ({
  messages,
  onSendMessage,
  isLoading,
  editorContext,
  onInsertContent
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');
    setSuggestions([]);

    await onSendMessage(message);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Generate input suggestions based on context
    if (value.length > 10) {
      generateInputSuggestions(value, editorContext);
    } else {
      setSuggestions([]);
    }
  };

  const generateInputSuggestions = useCallback(
    debounce(async (input: string, context: EditorContext) => {
      try {
        const response = await fetch('/api/ai/chat/input-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, context })
        });
        
        const { suggestions } = await response.json();
        setSuggestions(suggestions);
      } catch (error) {
        console.error('Failed to get input suggestions:', error);
      }
    }, 500),
    []
  );

  const quickPrompts = [
    'Generate an executive summary',
    'Improve the methodology section',
    'Check compliance requirements',
    'Find similar successful applications',
    'Suggest budget justifications',
    'Add impact measurements',
    'Review for clarity and flow',
    'Create a project timeline'
  ];

  return (
    <div className="ai-chat-tab">
      {/* Welcome Message */}
      {messages.length === 0 && (
        <div className="welcome-message">
          <div className="welcome-content">
            <h4>Hi! I'm your AI grant writing assistant.</h4>
            <p>I can help you with:</p>
            <ul>
              <li>🎯 Generating targeted content</li>
              <li>📝 Improving existing text</li>
              <li>✅ Checking compliance</li>
              <li>📊 Finding examples and patterns</li>
              <li>🔍 Researching requirements</li>
            </ul>
            <p>Try asking me something or use one of the quick prompts below!</p>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="messages-container">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onInsertContent={onInsertContent}
            onFollowUp={(followUp) => handleSendMessage(followUp)}
          />
        ))}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <TypingIndicator />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts (shown when input is empty) */}
      {!inputValue && messages.length === 0 && (
        <div className="quick-prompts">
          <p className="prompt-label">Quick prompts:</p>
          <div className="prompt-grid">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                className="quick-prompt-button"
                onClick={() => setInputValue(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Suggestions */}
      {suggestions.length > 0 && (
        <div className="input-suggestions">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-button"
              onClick={() => setInputValue(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input */}
      <div className="chat-input-container">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Ask me anything about your grant application..."
            className="chat-input"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          
          <div className="input-actions">
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="send-button"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
        
        <div className="input-help">
          <span className="help-text">
            Shift + Enter for new line • Enter to send
          </span>
        </div>
      </div>
    </div>
  );
};

const ChatMessage: React.FC<{
  message: ChatMessage;
  onInsertContent: (content: string) => void;
  onFollowUp: (message: string) => void;
}> = ({ message, onInsertContent, onFollowUp }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div 
      className={`message ${message.role}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="message-avatar">
        {message.role === 'user' ? '👤' : '🤖'}
      </div>
      
      <div className="message-content">
        <div className="message-text">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        
        {message.role === 'assistant' && showActions && (
          <div className="message-actions">
            <button
              onClick={() => onInsertContent(message.content)}
              className="action-button"
              title="Insert into editor"
            >
              📝 Insert
            </button>
            <button
              onClick={() => onFollowUp('Can you expand on this?')}
              className="action-button"
              title="Ask for more details"
            >
              🔍 Expand
            </button>
            <button
              onClick={() => onFollowUp('Can you improve this?')}
              className="action-button"
              title="Request improvements"
            >
              ✨ Improve
            </button>
          </div>
        )}
        
        <div className="message-meta">
          <span className="timestamp">
            {formatTime(message.timestamp)}
          </span>
          {message.confidence && (
            <span className="confidence">
              {Math.round(message.confidence * 100)}% confident
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="typing-indicator">
    <span></span>
    <span></span>
    <span></span>
  </div>
);
```

---

## 🔧 **Implementation Phase 5: State Management & Persistence**

### **5.1 Enhanced Zustand Store**

#### **AI Editor Store**
```typescript
// frontend/src/stores/aiEditorStore.ts
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AIEditorState {
  // Editor sessions
  sessions: Record<string, EditorSession>;
  activeSessionId: string | null;
  
  // AI interactions
  suggestions: Record<string, AISuggestion[]>;
  chatMessages: Record<string, ChatMessage[]>;
  searchResults: Record<string, SearchResult[]>;
  
  // User preferences
  preferences: {
    suggestionFrequency: 'high' | 'medium' | 'low';
    autoSave: boolean;
    showConfidenceScores: boolean;
    enableRealTimeCollab: boolean;
    preferredAIModel: string;
  };
  
  // UI state
  sidebarTab: SidebarTab;
  isProcessing: boolean;
  errors: Record<string, string>;
  
  // Actions
  createSession: (sessionData: CreateSessionData) => void;
  updateSession: (sessionId: string, updates: Partial<EditorSession>) => void;
  setActiveSession: (sessionId: string) => void;
  
  addSuggestion: (sessionId: string, suggestion: AISuggestion) => void;
  removeSuggestion: (sessionId: string, suggestionId: string) => void;
  updateSuggestionStatus: (sessionId: string, suggestionId: string, status: SuggestionStatus) => void;
  
  addChatMessage: (sessionId: string, message: ChatMessage) => void;
  clearChatMessages: (sessionId: string) => void;
  
  setSearchResults: (sessionId: string, results: SearchResult[]) => void;
  clearSearchResults: (sessionId: string) => void;
  
  updatePreferences: (updates: Partial<AIEditorState['preferences']>) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
}

export const useAIEditorStore = create<AIEditorState>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        sessions: {},
        activeSessionId: null,
        suggestions: {},
        chatMessages: {},
        searchResults: {},
        preferences: {
          suggestionFrequency: 'medium',
          autoSave: true,
          showConfidenceScores: true,
          enableRealTimeCollab: true,
          preferredAIModel: 'gpt-4-turbo'
        },
        sidebarTab: 'chat',
        isProcessing: false,
        errors: {},

        // Session management
        createSession: (sessionData) => set((state) => {
          const sessionId = generateSessionId();
          state.sessions[sessionId] = {
            id: sessionId,
            ...sessionData,
            createdAt: new Date(),
            lastActivity: new Date(),
            editorState: null,
            isDirty: false
          };
          state.activeSessionId = sessionId;
          state.suggestions[sessionId] = [];
          state.chatMessages[sessionId] = [];
          state.searchResults[sessionId] = [];
        }),

        updateSession: (sessionId, updates) => set((state) => {
          if (state.sessions[sessionId]) {
            Object.assign(state.sessions[sessionId], updates);
            state.sessions[sessionId].lastActivity = new Date();
          }
        }),

        setActiveSession: (sessionId) => set((state) => {
          if (state.sessions[sessionId]) {
            state.activeSessionId = sessionId;
          }
        }),

        // Suggestion management
        addSuggestion: (sessionId, suggestion) => set((state) => {
          if (!state.suggestions[sessionId]) {
            state.suggestions[sessionId] = [];
          }
          state.suggestions[sessionId].push({
            ...suggestion,
            createdAt: new Date(),
            status: 'pending'
          });
        }),

        removeSuggestion: (sessionId, suggestionId) => set((state) => {
          if (state.suggestions[sessionId]) {
            state.suggestions[sessionId] = state.suggestions[sessionId].filter(
              s => s.id !== suggestionId
            );
          }
        }),

        updateSuggestionStatus: (sessionId, suggestionId, status) => set((state) => {
          const suggestions = state.suggestions[sessionId];
          if (suggestions) {
            const suggestion = suggestions.find(s => s.id === suggestionId);
            if (suggestion) {
              suggestion.status = status;
              suggestion.respondedAt = new Date();
            }
          }
        }),

        // Chat management
        addChatMessage: (sessionId, message) => set((state) => {
          if (!state.chatMessages[sessionId]) {
            state.chatMessages[sessionId] = [];
          }
          state.chatMessages[sessionId].push({
            ...message,
            timestamp: new Date()
          });
        }),

        clearChatMessages: (sessionId) => set((state) => {
          state.chatMessages[sessionId] = [];
        }),

        // Search management
        setSearchResults: (sessionId, results) => set((state) => {
          state.searchResults[sessionId] = results.map(result => ({
            ...result,
            timestamp: new Date()
          }));
        }),

        clearSearchResults: (sessionId) => set((state) => {
          state.searchResults[sessionId] = [];
        }),

        // Preferences and UI
        updatePreferences: (updates) => set((state) => {
          Object.assign(state.preferences, updates);
        }),

        setSidebarTab: (tab) => set((state) => {
          state.sidebarTab = tab;
        }),

        setError: (key, error) => set((state) => {
          state.errors[key] = error;
        }),

        clearError: (key) => set((state) => {
          delete state.errors[key];
        })
      }))
    ),
    {
      name: 'ai-editor-store',
      version: 1,
      // Only persist certain parts of the state
      partialize: (state) => ({
        sessions: state.sessions,
        preferences: state.preferences,
        // Don't persist temporary data like suggestions and messages
      }),
      // Migration function for version updates
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migrate from version 0 to 1
          return {
            ...persistedState,
            preferences: {
              ...persistedState.preferences,
              preferredAIModel: 'gpt-4-turbo'
            }
          };
        }
        return persistedState;
      }
    }
  )
);

// Derived selectors
export const useActiveSession = () => {
  return useAIEditorStore((state) => {
    const activeId = state.activeSessionId;
    return activeId ? state.sessions[activeId] : null;
  });
};

export const useSessionSuggestions = (sessionId: string | null) => {
  return useAIEditorStore((state) => 
    sessionId ? state.suggestions[sessionId] || [] : []
  );
};

export const useSessionChatMessages = (sessionId: string | null) => {
  return useAIEditorStore((state) => 
    sessionId ? state.chatMessages[sessionId] || [] : []
  );
};

// Interfaces
interface EditorSession {
  id: string;
  applicationId: string;
  grantId: string;
  section: string;
  title: string;
  createdAt: Date;
  lastActivity: Date;
  editorState: any; // Lexical editor state
  isDirty: boolean;
  autoSaveEnabled: boolean;
}

interface CreateSessionData {
  applicationId: string;
  grantId: string;
  section: string;
  title: string;
}

type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'modified' | 'expired';

type SidebarTab = 'chat' | 'suggestions' | 'requirements' | 'search' | 'examples';
```

### **5.2 Auto-Save and Sync System**

#### **Auto-Save Hook and Service**
```typescript
// frontend/src/hooks/useAutoSave.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAIEditorStore } from '../stores/aiEditorStore';
import { debounce } from 'lodash';

interface AutoSaveOptions {
  sessionId: string;
  enabled: boolean;
  interval: number; // milliseconds
  onSave: (data: SaveData) => Promise<void>;
  onError: (error: Error) => void;
}

export const useAutoSave = (options: AutoSaveOptions) => {
  const { sessionId, enabled, interval, onSave, onError } = options;
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  const session = useAIEditorStore((state) => state.sessions[sessionId]);
  const updateSession = useAIEditorStore((state) => state.updateSession);

  const performSave = useCallback(async (editorState: any, content: string) => {
    if (!enabled || content === lastSavedRef.current) return;

    try {
      await onSave({
        sessionId,
        editorState,
        content,
        timestamp: new Date()
      });

      lastSavedRef.current = content;
      updateSession(sessionId, {
        isDirty: false,
        lastSaved: new Date()
      });

    } catch (error) {
      onError(error as Error);
      updateSession(sessionId, {
        saveError: (error as Error).message
      });
    }
  }, [sessionId, enabled, onSave, onError, updateSession]);

  const debouncedSave = useCallback(
    debounce(performSave, interval),
    [performSave, interval]
  );

  const triggerSave = useCallback((editorState: any, content: string) => {
    if (!enabled) return;

    // Mark as dirty immediately
    updateSession(sessionId, { isDirty: true });

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save
    debouncedSave(editorState, content);
  }, [enabled, sessionId, updateSession, debouncedSave]);

  const forceSave = useCallback(async (editorState: any, content: string) => {
    // Cancel debounced save
    debouncedSave.cancel();
    
    // Save immediately
    await performSave(editorState, content);
  }, [debouncedSave, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [debouncedSave]);

  return {
    triggerSave,
    forceSave,
    isDirty: session?.isDirty || false,
    lastSaved: session?.lastSaved,
    saveError: session?.saveError
  };
};

interface SaveData {
  sessionId: string;
  editorState: any;
  content: string;
  timestamp: Date;
}

// Auto-save API service
export class AutoSaveService {
  static async saveEditorState(data: SaveData): Promise<void> {
    const response = await fetch('/api/editor/auto-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        sessionId: data.sessionId,
        editorState: JSON.stringify(data.editorState),
        content: data.content,
        timestamp: data.timestamp.toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Auto-save failed: ${response.statusText}`);
    }
  }

  static async loadEditorState(sessionId: string): Promise<SaveData | null> {
    const response = await fetch(`/api/editor/load/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (response.status === 404) {
      return null; // No saved state
    }

    if (!response.ok) {
      throw new Error(`Failed to load editor state: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      sessionId: data.sessionId,
      editorState: JSON.parse(data.editorState),
      content: data.content,
      timestamp: new Date(data.timestamp)
    };
  }
}
```

---

## 🚀 **Deployment and Integration Strategy**

### **6.1 Database Migrations**

```bash
# Run new migrations
npm run db:migrate

# Seed vector database with existing grant data
npm run seed:vector-db

# Update existing applications with editor sessions
npm run migrate:editor-sessions
```

### **6.2 API Route Integration**

```typescript
// backend/src/routes/index.ts - Add new AI editor routes
import { AIEditorController } from '../controllers/aiEditorController';

const aiEditorController = new AIEditorController();

// Mount AI editor routes
router.use('/api/ai/editor', [
  express.Router()
    .post('/suggestions', aiEditorController.generateSuggestions.bind(aiEditorController))
    .post('/generate-content', aiEditorController.generateContent.bind(aiEditorController))
    .post('/semantic-search', aiEditorController.semanticSearch.bind(aiEditorController))
    .post('/analyze-content', aiEditorController.analyzeContent.bind(aiEditorController))
    .post('/suggestion-feedback', aiEditorController.recordSuggestionFeedback.bind(aiEditorController))
]);

// Auto-save routes
router.use('/api/editor', [
  express.Router()
    .post('/auto-save', autoSaveController.save.bind(autoSaveController))
    .get('/load/:sessionId', autoSaveController.load.bind(autoSaveController))
]);
```

### **6.3 Frontend Integration Points**

#### **Update Existing Application Page**
```typescript
// frontend/src/app/applications/[id]/page.tsx - Integration with existing application page
import { GrantEditor } from '../../../components/editor/GrantEditor';
import { AISidebar } from '../../../components/editor/AISidebar';

export default function ApplicationPage({ params }: { params: { id: string } }) {
  const applicationId = params.id;
  
  // Your existing application logic...
  const { application, grant, isLoading } = useApplication(applicationId);
  const [currentSection, setCurrentSection] = useState('executive_summary');
  
  // New editor integration
  const editorContext = {
    applicationId,
    grantId: application?.grantId || '',
    section: currentSection,
    grantType: grant?.type || '',
    userId: user.id,
    sessionId: generateSessionId()
  };

  return (
    <div className="application-page">
      {/* Your existing layout */}
      <div className="page-header">
        {/* Existing header content */}
      </div>

      <div className="page-content">
        {/* Three-column layout */}
        <div className="content-grid">
          {/* Left: Document Navigator (enhanced existing) */}
          <div className="navigator-panel">
            <DocumentNavigator
              sections={application?.sections || []}
              currentSection={currentSection}
              onSectionChange={setCurrentSection}
              requirements={grant?.requirements || []}
            />
          </div>

          {/* Center: AI Editor (new) */}
          <div className="editor-panel">
            <GrantEditor
              applicationId={applicationId}
              grantId={application?.grantId || ''}
              section={currentSection}
              initialContent={application?.sections?.[currentSection]?.content || ''}
              onContentChange={handleContentChange}
              onAIRequest={handleAIRequest}
            />
          </div>

          {/* Right: AI Sidebar (enhanced existing) */}
          <div className="ai-panel">
            <AISidebar
              applicationId={applicationId}
              grantId={application?.grantId || ''}
              currentSection={currentSection}
              editorContext={editorContext}
              onInsertContent={handleInsertContent}
              onNavigateToRequirement={handleNavigateToRequirement}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **6.4 Performance Considerations**

#### **Optimization Strategies**
```typescript
// Bundle splitting for editor components
const GrantEditor = lazy(() => import('../components/editor/GrantEditor'));
const AISidebar = lazy(() => import('../components/editor/AISidebar'));

// Service worker for offline editor state
// public/sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/editor/auto-save')) {
    event.respondWith(
      caches.open('editor-cache').then(cache => {
        // Cache editor states locally
        return cache.match(event.request) || fetch(event.request);
      })
    );
  }
});

// Memory management for large documents
const useEditorMemoryManagement = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      // Clear old suggestions and chat messages
      clearOldCacheEntries();
      
      // Garbage collect unused editor states
      if (window.gc) {
        window.gc();
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);
};
```

---

## ✅ **Implementation Checklist**

### **Phase 1: Vector Database Foundation**
- [ ] Implement VectorDatabaseService with Pinecone integration
- [ ] Create database migrations for vector tracking
- [ ] Enhance existing AI services for semantic search
- [ ] Index existing grant content in vector database
- [ ] Test vector search with sample queries

### **Phase 2: Lexical Editor Core**
- [ ] Set up Lexical composer with grant-specific configuration
- [ ] Implement custom nodes (AISuggestionNode, RequirementNode)
- [ ] Create editor plugins (AIAssist, AutoSave, Collaboration)
- [ ] Integrate with existing form system
- [ ] Test editor with real grant content

### **Phase 3: AI Services Enhancement**
- [ ] Build real-time AI suggestion API endpoints
- [ ] Implement streaming content generation
- [ ] Create contextual search and analysis services
- [ ] Add suggestion feedback tracking
- [ ] Test AI response quality and performance

### **Phase 4: AI Sidebar Integration**
- [ ] Enhance existing AI sidebar with new tabs
- [ ] Implement chat interface with contextual awareness
- [ ] Build suggestions management system
- [ ] Integrate semantic search UI
- [ ] Add examples and requirements tabs

### **Phase 5: State Management & Persistence**
- [ ] Enhance Zustand store for editor state
- [ ] Implement auto-save functionality
- [ ] Add real-time collaboration sync
- [ ] Create session management system
- [ ] Test cross-tab and cross-device sync

### **Phase 6: Integration & Testing**
- [ ] Integrate editor with existing application pages
- [ ] Update navigation and routing
- [ ] Add comprehensive error handling
- [ ] Implement performance optimizations
- [ ] Conduct user acceptance testing

---

This technical implementation plan builds directly on eTownz's existing infrastructure whilst adding the sophisticated AI-powered editor capabilities. The modular approach ensures each component can be developed and tested independently, minimising risk and enabling incremental delivery of value to users.