# 🚀 AI Implementation Roadmap - eTownz Grants Platform

## 🎯 **Executive Summary**

Based on the comprehensive analysis, the eTownz Grants platform has **excellent AI foundations** but is missing critical vector database and semantic search capabilities. This roadmap provides specific implementation steps to achieve the full AI vision.

**Current Status**: 60% of AI features implemented  
**Target**: 100% comprehensive AI platform  
**Timeline**: 22 weeks  
**Investment**: €15,000-25,000 development + €400-730/month AI services

---

## 📋 **Phase-by-Phase Implementation Plan**

### **🔥 PHASE 1: Vector Database Foundation (4 weeks)**

#### **Week 1: Pinecone Setup & Integration**

**Goal**: Establish vector database infrastructure

**Tasks:**
1. **Install Dependencies**
   ```bash
   cd backend
   npm install @pinecone-database/pinecone
   ```

2. **Create Vector Database Service**
   ```bash
   touch backend/src/services/vectorDatabase.ts
   ```

3. **Implementation Code**:
   ```typescript
   // backend/src/services/vectorDatabase.ts
   import { Pinecone } from '@pinecone-database/pinecone';
   import { logger } from './logger';

   export interface VectorMetadata {
     id: string;
     type: 'grant' | 'application' | 'document';
     title: string;
     content: string;
     organizationId?: string;
     createdAt: string;
   }

   export class VectorDatabaseService {
     private pinecone: Pinecone;
     private indexName = 'etownz-grants';

     constructor() {
       this.pinecone = new Pinecone({
         apiKey: process.env.PINECONE_API_KEY!
       });
     }

     async initializeIndex(): Promise<void> {
       try {
         const indexList = await this.pinecone.listIndexes();
         const exists = indexList.indexes?.some(index => index.name === this.indexName);
         
         if (!exists) {
           await this.pinecone.createIndex({
             name: this.indexName,
             dimension: 1536,
             metric: 'cosine',
             spec: {
               serverless: {
                 cloud: 'aws',
                 region: 'us-east-1'
               }
             }
           });
           logger.info('Created Pinecone index:', this.indexName);
         }
       } catch (error) {
         logger.error('Failed to initialize Pinecone index:', error);
         throw error;
       }
     }

     async storeVector(
       id: string, 
       embedding: number[], 
       metadata: VectorMetadata,
       namespace: string = 'default'
     ): Promise<void> {
       const index = this.pinecone.index(this.indexName);
       await index.namespace(namespace).upsert([{
         id,
         values: embedding,
         metadata
       }]);
     }

     async searchSimilar(
       queryEmbedding: number[], 
       namespace: string = 'default',
       topK: number = 10,
       filter?: Record<string, any>
     ): Promise<any> {
       const index = this.pinecone.index(this.indexName);
       return await index.namespace(namespace).query({
         vector: queryEmbedding,
         topK,
         includeMetadata: true,
         filter
       });
     }

     async deleteVector(id: string, namespace: string = 'default'): Promise<void> {
       const index = this.pinecone.index(this.indexName);
       await index.namespace(namespace).deleteOne(id);
     }
   }
   ```

#### **Week 2: Enhanced OpenAI Service**

**Goal**: Add embedding generation and improve existing AI service

**Tasks:**
1. **Update OpenAI Service**
   ```typescript
   // backend/src/services/openaiService.ts (enhance existing)
   import OpenAI from 'openai';
   import { VectorDatabaseService } from './vectorDatabase';

   export class OpenAIService {
     private openai: OpenAI;
     private vectorDB: VectorDatabaseService;

     constructor() {
       this.openai = new OpenAI({
         apiKey: process.env.OPENAI_API_KEY!
       });
       this.vectorDB = new VectorDatabaseService();
     }

     async generateEmbedding(text: string): Promise<number[]> {
       try {
         const response = await this.openai.embeddings.create({
           model: 'text-embedding-3-small',
           input: text.substring(0, 8192) // Limit to max tokens
         });
         return response.data[0].embedding;
       } catch (error) {
         logger.error('Failed to generate embedding:', error);
         throw error;
       }
     }

     async semanticSearch(query: string, filters?: any): Promise<any[]> {
       const queryEmbedding = await this.generateEmbedding(query);
       const results = await this.vectorDB.searchSimilar(
         queryEmbedding, 
         'grants', 
         10, 
         filters
       );
       return results.matches || [];
     }

     async analyzeGrantRelevance(
       organizationProfile: string, 
       grantDescription: string
     ): Promise<{score: number, reasoning: string}> {
       const prompt = `
         Analyze the relevance between this organization profile and grant opportunity.
         Return a JSON object with 'score' (0-100) and 'reasoning'.
         
         Organization: ${organizationProfile}
         Grant: ${grantDescription}
       `;

       const response = await this.openai.chat.completions.create({
         model: 'gpt-4-turbo',
         messages: [{ role: 'user', content: prompt }],
         response_format: { type: 'json_object' }
       });

       return JSON.parse(response.choices[0].message.content!);
     }
   }
   ```

#### **Week 3: Database Schema Updates**

**Goal**: Add vector tracking to database

**Tasks:**
1. **Create Migration**
   ```sql
   -- infrastructure/db/migrations/003_add_vector_support.sql
   
   -- Vector embeddings tracking
   CREATE TABLE IF NOT EXISTS vector_embeddings (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       entity_type VARCHAR(50) NOT NULL, -- 'grant', 'application', 'document'
       entity_id UUID NOT NULL,
       vector_id VARCHAR(255) NOT NULL, -- Pinecone vector ID
       embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
       namespace VARCHAR(100) NOT NULL DEFAULT 'default',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       
       UNIQUE(entity_type, entity_id, namespace)
   );

   -- AI interaction logging
   CREATE TABLE IF NOT EXISTS ai_interactions (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID REFERENCES users(id),
       interaction_type VARCHAR(50) NOT NULL, -- 'search', 'generation', 'analysis', 'chat'
       input_text TEXT,
       output_text TEXT,
       model_used VARCHAR(100),
       tokens_used INTEGER,
       cost_cents INTEGER,
       metadata JSONB DEFAULT '{}',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Grant semantic tags
   CREATE TABLE IF NOT EXISTS grant_semantic_tags (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
       tag_name VARCHAR(100) NOT NULL,
       confidence_score FLOAT DEFAULT 0.0,
       extraction_method VARCHAR(50) DEFAULT 'ai_generated',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create indexes for performance
   CREATE INDEX idx_vector_embeddings_entity ON vector_embeddings(entity_type, entity_id);
   CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id, created_at);
   CREATE INDEX idx_grant_semantic_tags_grant ON grant_semantic_tags(grant_id);
   ```

#### **Week 4: Integration & Testing**

**Goal**: Integrate vector database into existing grant processing

**Tasks:**
1. **Update Grant Processing Service**
   ```typescript
   // backend/src/services/grantsService.ts (enhance existing)
   import { OpenAIService } from './openaiService';
   import { VectorDatabaseService } from './vectorDatabase';

   export class GrantsService {
     private openaiService: OpenAIService;
     private vectorDB: VectorDatabaseService;

     constructor() {
       this.openaiService = new OpenAIService();
       this.vectorDB = new VectorDatabaseService();
     }

     async processNewGrant(grant: Grant): Promise<void> {
       try {
         // Generate embedding for the grant
         const grantText = `${grant.title} ${grant.description} ${grant.eligibility_criteria}`;
         const embedding = await this.openaiService.generateEmbedding(grantText);
         
         // Store in vector database
         await this.vectorDB.storeVector(
           grant.id,
           embedding,
           {
             id: grant.id,
             type: 'grant',
             title: grant.title,
             content: grantText,
             createdAt: new Date().toISOString()
           },
           'grants'
         );

         // Store embedding tracking in SQL
         await this.database.query(`
           INSERT INTO vector_embeddings (entity_type, entity_id, vector_id, namespace)
           VALUES ('grant', $1, $1, 'grants')
           ON CONFLICT (entity_type, entity_id, namespace) 
           DO UPDATE SET updated_at = NOW()
         `, [grant.id]);

         logger.info(`Processed grant ${grant.id} for vector search`);
       } catch (error) {
         logger.error(`Failed to process grant ${grant.id}:`, error);
       }
     }

     async findSimilarGrants(organizationProfile: string, limit: number = 10): Promise<Grant[]> {
       const profileEmbedding = await this.openaiService.generateEmbedding(organizationProfile);
       const similarVectors = await this.vectorDB.searchSimilar(
         profileEmbedding,
         'grants',
         limit
       );

       const grantIds = similarVectors.map(match => match.id);
       return await this.getGrantsByIds(grantIds);
     }
   }
   ```

---

### **⚡ PHASE 2: AI Assistants & Chat (6 weeks)**

#### **Week 5-6: OpenAI Assistants API Integration**

**Goal**: Implement conversational AI assistant

**Tasks:**
1. **Create AI Assistant Service**
   ```typescript
   // backend/src/services/aiAssistant.ts
   import OpenAI from 'openai';
   import { logger } from './logger';

   export interface ChatMessage {
     role: 'user' | 'assistant';
     content: string;
     timestamp: Date;
   }

   export class AIAssistantService {
     private openai: OpenAI;
     private assistantId: string | null = null;

     constructor() {
       this.openai = new OpenAI({
         apiKey: process.env.OPENAI_API_KEY!
       });
     }

     async initializeAssistant(): Promise<void> {
       try {
         const assistant = await this.openai.beta.assistants.create({
           name: "eTownz Grant Writing Assistant",
           instructions: `You are an expert grant writing assistant specializing in Irish grants and funding opportunities. 
           
           Your expertise includes:
           - Irish government grants (Enterprise Ireland, SFI, etc.)
           - EU funding programs (Horizon Europe, Interreg)
           - Local council funding
           - Foundation grants
           - Application writing best practices
           - Compliance checking
           - Budget planning

           Always provide specific, actionable advice tailored to Irish context.
           Help users write compelling proposals that address reviewers' key concerns.
           Reference successful patterns from Irish grant applications when relevant.`,
           
           model: "gpt-4-turbo",
           tools: [
             { type: "file_search" },
             { type: "code_interpreter" }
           ]
         });

         this.assistantId = assistant.id;
         logger.info('Created AI Assistant:', this.assistantId);
       } catch (error) {
         logger.error('Failed to create AI assistant:', error);
         throw error;
       }
     }

     async createThread(): Promise<string> {
       const thread = await this.openai.beta.threads.create();
       return thread.id;
     }

     async sendMessage(threadId: string, message: string): Promise<string> {
       if (!this.assistantId) {
         await this.initializeAssistant();
       }

       // Add message to thread
       await this.openai.beta.threads.messages.create(threadId, {
         role: "user",
         content: message
       });

       // Run the assistant
       const run = await this.openai.beta.threads.runs.create(threadId, {
         assistant_id: this.assistantId!
       });

       // Wait for completion
       let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
       
       while (runStatus.status === 'running' || runStatus.status === 'queued') {
         await new Promise(resolve => setTimeout(resolve, 1000));
         runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
       }

       if (runStatus.status === 'completed') {
         const messages = await this.openai.beta.threads.messages.list(threadId);
         const lastMessage = messages.data[0];
         
         if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
           return lastMessage.content[0].text.value;
         }
       }

       throw new Error('Assistant failed to respond');
     }

     async analyzeGrantRequirements(grantText: string): Promise<any> {
       const analysis = await this.openai.chat.completions.create({
         model: 'gpt-4-turbo',
         messages: [{
           role: 'user',
           content: `Analyze this grant opportunity and extract key requirements:
           
           ${grantText}
           
           Return JSON with:
           - eligibility_criteria: array of specific requirements
           - application_sections: required sections with descriptions
           - deadlines: important dates
           - budget_requirements: funding rules and restrictions
           - evaluation_criteria: how applications will be scored
           - tips: specific advice for this grant`
         }],
         response_format: { type: 'json_object' }
       });

       return JSON.parse(analysis.choices[0].message.content!);
     }
   }
   ```

#### **Week 7-8: Chat API Endpoints**

**Goal**: Create REST and WebSocket APIs for chat functionality

**Tasks:**
1. **Create Chat Routes**
   ```typescript
   // backend/src/routes/aiChat.ts
   import express from 'express';
   import { AIAssistantService } from '../services/aiAssistant';
   import { authenticateToken } from '../middleware/auth';

   const router = express.Router();
   const assistantService = new AIAssistantService();

   // Initialize assistant on startup
   assistantService.initializeAssistant();

   // Create new chat session
   router.post('/chat/sessions', authenticateToken, async (req, res) => {
     try {
       const threadId = await assistantService.createThread();
       
       // Store thread in database
       await req.db.query(`
         INSERT INTO ai_chat_sessions (id, user_id, thread_id, created_at)
         VALUES (uuid_generate_v4(), $1, $2, NOW())
       `, [req.user.userId, threadId]);

       res.json({ threadId, sessionId: threadId });
     } catch (error) {
       logger.error('Failed to create chat session:', error);
       res.status(500).json({ error: 'Failed to create chat session' });
     }
   });

   // Send message to assistant
   router.post('/chat/sessions/:threadId/messages', authenticateToken, async (req, res) => {
     try {
       const { threadId } = req.params;
       const { message } = req.body;

       // Verify user owns this thread
       const session = await req.db.query(`
         SELECT id FROM ai_chat_sessions 
         WHERE thread_id = $1 AND user_id = $2
       `, [threadId, req.user.userId]);

       if (session.rows.length === 0) {
         return res.status(403).json({ error: 'Access denied' });
       }

       const response = await assistantService.sendMessage(threadId, message);

       // Log interaction
       await req.db.query(`
         INSERT INTO ai_interactions (user_id, interaction_type, input_text, output_text, model_used)
         VALUES ($1, 'chat', $2, $3, 'gpt-4-turbo')
       `, [req.user.userId, message, response]);

       res.json({ response });
     } catch (error) {
       logger.error('Failed to send message:', error);
       res.status(500).json({ error: 'Failed to send message' });
     }
   });

   // Analyze grant requirements
   router.post('/chat/analyze-grant', authenticateToken, async (req, res) => {
     try {
       const { grantText, grantId } = req.body;
       
       const analysis = await assistantService.analyzeGrantRequirements(grantText);
       
       // Store analysis for future reference
       await req.db.query(`
         INSERT INTO grant_ai_analysis (grant_id, user_id, analysis_result, created_at)
         VALUES ($1, $2, $3, NOW())
       `, [grantId, req.user.userId, JSON.stringify(analysis)]);

       res.json(analysis);
     } catch (error) {
       logger.error('Failed to analyze grant:', error);
       res.status(500).json({ error: 'Failed to analyze grant' });
     }
   });

   export default router;
   ```

#### **Week 9-10: Frontend Chat Interface**

**Goal**: Build interactive chat UI component

**Tasks:**
1. **Create Chat Component**
   ```tsx
   // frontend/src/components/ui/ai-chat.tsx
   import React, { useState, useEffect, useRef } from 'react';
   import { Button } from './button';
   import { Input } from './input';
   import { Card } from './card';

   interface Message {
     role: 'user' | 'assistant';
     content: string;
     timestamp: Date;
   }

   interface AIChatProps {
     grantId?: string;
     onAnalysisComplete?: (analysis: any) => void;
   }

   export function AIChat({ grantId, onAnalysisComplete }: AIChatProps) {
     const [messages, setMessages] = useState<Message[]>([]);
     const [input, setInput] = useState('');
     const [isLoading, setIsLoading] = useState(false);
     const [threadId, setThreadId] = useState<string | null>(null);
     const messagesEndRef = useRef<HTMLDivElement>(null);

     const scrollToBottom = () => {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     };

     useEffect(() => {
       scrollToBottom();
     }, [messages]);

     useEffect(() => {
       initializeChat();
     }, []);

     const initializeChat = async () => {
       try {
         const response = await fetch('/api/ai/chat/sessions', {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${localStorage.getItem('token')}`,
             'Content-Type': 'application/json'
           }
         });
         const data = await response.json();
         setThreadId(data.threadId);
         
         // Add welcome message
         setMessages([{
           role: 'assistant',
           content: 'Hello! I\'m your AI grant writing assistant. I can help you analyze grant requirements, write compelling proposals, and improve your applications. How can I assist you today?',
           timestamp: new Date()
         }]);
       } catch (error) {
         console.error('Failed to initialize chat:', error);
       }
     };

     const sendMessage = async () => {
       if (!input.trim() || !threadId || isLoading) return;

       const userMessage: Message = {
         role: 'user',
         content: input,
         timestamp: new Date()
       };

       setMessages(prev => [...prev, userMessage]);
       setInput('');
       setIsLoading(true);

       try {
         const response = await fetch(`/api/ai/chat/sessions/${threadId}/messages`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${localStorage.getItem('token')}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({ message: input })
         });

         const data = await response.json();
         
         const assistantMessage: Message = {
           role: 'assistant',
           content: data.response,
           timestamp: new Date()
         };

         setMessages(prev => [...prev, assistantMessage]);
       } catch (error) {
         console.error('Failed to send message:', error);
         setMessages(prev => [...prev, {
           role: 'assistant',
           content: 'Sorry, I encountered an error. Please try again.',
           timestamp: new Date()
         }]);
       } finally {
         setIsLoading(false);
       }
     };

     const analyzeCurrentGrant = async () => {
       if (!grantId || !threadId) return;

       setIsLoading(true);
       try {
         // Get grant details
         const grantResponse = await fetch(`/api/grants/${grantId}`, {
           headers: {
             'Authorization': `Bearer ${localStorage.getItem('token')}`
           }
         });
         const grant = await grantResponse.json();

         // Send for analysis
         const analysisResponse = await fetch('/api/ai/chat/analyze-grant', {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${localStorage.getItem('token')}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({
             grantText: `${grant.title}\n${grant.description}\n${grant.eligibility_criteria}`,
             grantId
           })
         });

         const analysis = await analysisResponse.json();
         
         setMessages(prev => [...prev, {
           role: 'assistant',
           content: `I've analyzed the grant "${grant.title}". Here are the key requirements and my recommendations:\n\n${JSON.stringify(analysis, null, 2)}`,
           timestamp: new Date()
         }]);

         onAnalysisComplete?.(analysis);
       } catch (error) {
         console.error('Failed to analyze grant:', error);
       } finally {
         setIsLoading(false);
       }
     };

     return (
       <Card className="h-96 flex flex-col">
         <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {messages.map((message, index) => (
             <div
               key={index}
               className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
             >
               <div
                 className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                   message.role === 'user'
                     ? 'bg-blue-500 text-white'
                     : 'bg-gray-200 text-gray-800'
                 }`}
               >
                 <p className="whitespace-pre-wrap">{message.content}</p>
                 <p className="text-xs opacity-70 mt-1">
                   {message.timestamp.toLocaleTimeString()}
                 </p>
               </div>
             </div>
           ))}
           {isLoading && (
             <div className="flex justify-start">
               <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                 <p>Thinking...</p>
               </div>
             </div>
           )}
           <div ref={messagesEndRef} />
         </div>
         
         <div className="border-t p-4">
           {grantId && (
             <Button
               onClick={analyzeCurrentGrant}
               disabled={isLoading}
               className="w-full mb-2"
               variant="outline"
             >
               Analyze This Grant
             </Button>
           )}
           
           <div className="flex space-x-2">
             <Input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Ask me anything about grant writing..."
               onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
               disabled={isLoading}
             />
             <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
               Send
             </Button>
           </div>
         </div>
       </Card>
     );
   }
   ```

---

### **🎯 PHASE 3: Advanced AI Features (8 weeks)**

#### **Week 11-14: Semantic Search & Enhanced Matching**

**Goal**: Implement sophisticated grant discovery using embeddings

**Tasks:**
1. **Enhanced Grant Search API**
   ```typescript
   // backend/src/routes/grantsSearch.ts
   import express from 'express';
   import { OpenAIService } from '../services/openaiService';

   const router = express.Router();
   const openaiService = new OpenAIService();

   // Semantic search endpoint
   router.post('/search/semantic', async (req, res) => {
     try {
       const { query, organizationProfile, filters } = req.body;
       
       // Combine query with organization context
       const contextualQuery = `${query}\n\nOrganization Context: ${organizationProfile}`;
       
       // Get semantic matches
       const matches = await openaiService.semanticSearch(contextualQuery, filters);
       
       // Enhance results with AI relevance scoring
       const enhancedResults = await Promise.all(
         matches.map(async (match) => {
           const relevanceAnalysis = await openaiService.analyzeGrantRelevance(
             organizationProfile,
             match.metadata.content
           );
           
           return {
             ...match,
             aiScore: relevanceAnalysis.score,
             reasoning: relevanceAnalysis.reasoning
           };
         })
       );

       // Sort by combined vector similarity and AI score
       const sortedResults = enhancedResults.sort((a, b) => {
         const aScore = (a.score * 0.6) + (a.aiScore * 0.4);
         const bScore = (b.score * 0.6) + (b.aiScore * 0.4);
         return bScore - aScore;
       });

       res.json({
         query,
         results: sortedResults,
         totalFound: sortedResults.length
       });
     } catch (error) {
       logger.error('Semantic search failed:', error);
       res.status(500).json({ error: 'Search failed' });
     }
   });

   // Smart grant recommendations
   router.get('/recommendations/:organizationId', async (req, res) => {
     try {
       const { organizationId } = req.params;
       
       // Get organization profile
       const orgResult = await req.db.query(
         'SELECT * FROM organizations WHERE id = $1',
         [organizationId]
       );
       
       if (orgResult.rows.length === 0) {
         return res.status(404).json({ error: 'Organization not found' });
       }

       const organization = orgResult.rows[0];
       const orgProfile = `${organization.description}\nSector: ${organization.sector}\nSize: ${organization.size}`;
       
       // Get historical successful applications for pattern analysis
       const successfulApps = await req.db.query(`
         SELECT a.*, g.title as grant_title, g.description as grant_description
         FROM applications a
         JOIN grants g ON a.grant_id = g.id
         WHERE a.organization_id = $1 AND a.status = 'APPROVED'
         ORDER BY a.created_at DESC
         LIMIT 5
       `, [organizationId]);

       // Find similar grants based on profile and history
       const recommendations = await openaiService.findSimilarGrants(orgProfile);
       
       res.json({
         organizationId,
         recommendations,
         basedOnHistory: successfulApps.rows.length > 0
       });
     } catch (error) {
       logger.error('Failed to generate recommendations:', error);
       res.status(500).json({ error: 'Failed to generate recommendations' });
     }
   });

   export default router;
   ```

#### **Week 15-18: Automated Proposal Generation**

**Goal**: Implement AI-powered proposal writing with voice simulation

**Tasks:**
1. **Proposal Generation Service**
   ```typescript
   // backend/src/services/proposalGenerator.ts
   import { OpenAIService } from './openaiService';
   import { logger } from './logger';

   export interface ProposalSection {
     type: 'executive_summary' | 'methodology' | 'budget' | 'timeline' | 'impact';
     title: string;
     content: string;
     wordLimit?: number;
   }

   export interface VoiceProfile {
     tone: 'formal' | 'conversational' | 'academic';
     complexity: 'simple' | 'moderate' | 'complex';
     persuasionStyle: 'logical' | 'emotional' | 'evidence_based';
     characteristics: string[];
   }

   export class ProposalGeneratorService {
     private openaiService: OpenAIService;

     constructor() {
       this.openaiService = new OpenAIService();
     }

     async analyzeWritingVoice(sampleDocuments: string[]): Promise<VoiceProfile> {
       const analysisPrompt = `
         Analyze the writing style from these document samples and create a voice profile.
         
         Documents:
         ${sampleDocuments.join('\n\n---\n\n')}
         
         Return JSON with:
         - tone: "formal", "conversational", or "academic"
         - complexity: "simple", "moderate", or "complex" 
         - persuasionStyle: "logical", "emotional", or "evidence_based"
         - characteristics: array of specific style traits
       `;

       const response = await this.openaiService.openai.chat.completions.create({
         model: 'gpt-4-turbo',
         messages: [{ role: 'user', content: analysisPrompt }],
         response_format: { type: 'json_object' }
       });

       return JSON.parse(response.choices[0].message.content!);
     }

     async generateSection(
       sectionType: ProposalSection['type'],
       grantRequirements: any,
       organizationContext: any,
       voiceProfile: VoiceProfile,
       wordLimit?: number
     ): Promise<string> {
       const sectionPrompts = {
         executive_summary: `Write a compelling executive summary that:
           - Clearly states the problem and proposed solution
           - Highlights expected impact and outcomes
           - Mentions funding amount and timeline
           - Captures reviewer attention in first paragraph`,
           
         methodology: `Develop a detailed methodology section that:
           - Outlines step-by-step approach
           - Includes timeline and milestones
           - Addresses potential risks and mitigation
           - Shows feasibility and innovation`,
           
         budget: `Create a detailed budget justification that:
           - Breaks down costs by category
           - Justifies each major expense
           - Shows value for money
           - Aligns with grant guidelines`,
           
         timeline: `Develop a project timeline that:
           - Shows realistic milestones
           - Includes dependencies and critical path
           - Allows for potential delays
           - Aligns with grant period`,
           
         impact: `Write an impact section that:
           - Quantifies expected outcomes
           - Shows societal/economic benefits
           - Includes measurement methods
           - Demonstrates long-term sustainability`
       };

       const prompt = `
         You are writing a ${sectionType} for a grant proposal.
         
         Voice Profile:
         - Tone: ${voiceProfile.tone}
         - Complexity: ${voiceProfile.complexity}
         - Style: ${voiceProfile.persuasionStyle}
         - Characteristics: ${voiceProfile.characteristics.join(', ')}
         
         Grant Requirements:
         ${JSON.stringify(grantRequirements, null, 2)}
         
         Organization Context:
         ${JSON.stringify(organizationContext, null, 2)}
         
         Instructions: ${sectionPrompts[sectionType]}
         
         ${wordLimit ? `Word limit: ${wordLimit} words` : ''}
         
         Write in the organization's voice profile and ensure compliance with grant requirements.
       `;

       const response = await this.openaiService.openai.chat.completions.create({
         model: 'gpt-4-turbo',
         messages: [{ role: 'user', content: prompt }],
         temperature: 0.7
       });

       return response.choices[0].message.content!;
     }

     async generateFullProposal(
       grantId: string,
       organizationId: string,
       customRequirements?: any
     ): Promise<ProposalSection[]> {
       try {
         // Get grant and organization details
         const [grantResult, orgResult] = await Promise.all([
           this.database.query('SELECT * FROM grants WHERE id = $1', [grantId]),
           this.database.query('SELECT * FROM organizations WHERE id = $1', [organizationId])
         ]);

         const grant = grantResult.rows[0];
         const organization = orgResult.rows[0];

         // Get organization's writing samples
         const samplesResult = await this.database.query(`
           SELECT content FROM documents 
           WHERE organization_id = $1 AND document_type IN ('proposal', 'report')
           ORDER BY created_at DESC LIMIT 3
         `, [organizationId]);

         const samples = samplesResult.rows.map(row => row.content);
         const voiceProfile = samples.length > 0 
           ? await this.analyzeWritingVoice(samples)
           : this.getDefaultVoiceProfile();

         // Generate each section
         const sections: ProposalSection[] = [];
         const sectionTypes: ProposalSection['type'][] = [
           'executive_summary',
           'methodology', 
           'budget',
           'timeline',
           'impact'
         ];

         for (const sectionType of sectionTypes) {
           const content = await this.generateSection(
             sectionType,
             grant,
             organization,
             voiceProfile,
             this.getWordLimit(sectionType)
           );

           sections.push({
             type: sectionType,
             title: this.getSectionTitle(sectionType),
             content
           });
         }

         return sections;
       } catch (error) {
         logger.error('Failed to generate proposal:', error);
         throw error;
       }
     }

     private getDefaultVoiceProfile(): VoiceProfile {
       return {
         tone: 'formal',
         complexity: 'moderate',
         persuasionStyle: 'evidence_based',
         characteristics: ['clear', 'concise', 'professional']
       };
     }

     private getWordLimit(sectionType: ProposalSection['type']): number {
       const limits = {
         executive_summary: 500,
         methodology: 1500,
         budget: 800,
         timeline: 600,
         impact: 1000
       };
       return limits[sectionType];
     }

     private getSectionTitle(sectionType: ProposalSection['type']): string {
       const titles = {
         executive_summary: 'Executive Summary',
         methodology: 'Methodology and Approach',
         budget: 'Budget and Justification',
         timeline: 'Project Timeline',
         impact: 'Expected Impact and Outcomes'
       };
       return titles[sectionType];
     }
   }
   ```

---

### **⚡ PHASE 4: Production Optimization (4 weeks)**

#### **Week 19-20: Performance & Cost Optimization**

**Goal**: Implement cost-saving measures and improve performance

**Tasks:**
1. **Smart Model Routing**
   ```typescript
   // backend/src/services/aiOrchestrator.ts
   export class AIOrchestrator {
     private openaiService: OpenAIService;

     constructor() {
       this.openaiService = new OpenAIService();
     }

     async smartCompletion(
       prompt: string,
       complexity: 'simple' | 'medium' | 'complex',
       options?: any
     ): Promise<string> {
       // Route to appropriate model based on complexity
       const model = this.selectModel(complexity, prompt.length);
       
       // Check cache first
       const cachedResult = await this.checkCache(prompt, model);
       if (cachedResult) {
         return cachedResult;
       }

       // Use batch processing for non-urgent requests
       if (options?.urgent !== true) {
         return await this.batchProcess(prompt, model);
       }

       return await this.directCompletion(prompt, model);
     }

     private selectModel(complexity: string, promptLength: number): string {
       if (complexity === 'simple' || promptLength < 1000) {
         return 'gpt-4o-mini'; // Cheaper for simple tasks
       }
       return 'gpt-4-turbo'; // Full model for complex tasks
     }

     private async batchProcess(prompt: string, model: string): Promise<string> {
       // Add to batch queue, process when batch is full or timeout reached
       return await this.addToBatch(prompt, model);
     }
   }
   ```

#### **Week 21-22: Monitoring & Analytics**

**Goal**: Implement comprehensive AI usage monitoring

**Tasks:**
1. **AI Analytics Dashboard**
   ```typescript
   // backend/src/routes/aiAnalytics.ts
   router.get('/analytics/usage', async (req, res) => {
     try {
       const { startDate, endDate } = req.query;
       
       const usageStats = await req.db.query(`
         SELECT 
           interaction_type,
           model_used,
           COUNT(*) as request_count,
           SUM(tokens_used) as total_tokens,
           SUM(cost_cents) as total_cost_cents,
           AVG(tokens_used) as avg_tokens_per_request
         FROM ai_interactions 
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY interaction_type, model_used
         ORDER BY total_cost_cents DESC
       `, [startDate, endDate]);

       const costByUser = await req.db.query(`
         SELECT 
           u.email,
           COUNT(ai.id) as interactions,
           SUM(ai.cost_cents) as total_cost_cents
         FROM ai_interactions ai
         JOIN users u ON ai.user_id = u.id
         WHERE ai.created_at BETWEEN $1 AND $2
         GROUP BY u.id, u.email
         ORDER BY total_cost_cents DESC
         LIMIT 20
       `, [startDate, endDate]);

       res.json({
         usageByType: usageStats.rows,
         topUsers: costByUser.rows,
         totalCost: usageStats.rows.reduce((sum, row) => sum + row.total_cost_cents, 0)
       });
     } catch (error) {
       logger.error('Failed to get AI analytics:', error);
       res.status(500).json({ error: 'Failed to get analytics' });
     }
   });
   ```

---

## 📊 **Success Metrics & KPIs**

### **Technical Metrics**
- **Vector Search Accuracy**: >85% relevance score
- **AI Response Time**: <3s average
- **Cost per Interaction**: <€0.50
- **System Uptime**: >99.5%

### **Business Metrics**
- **User Adoption**: >70% users engage with AI features
- **Grant Match Success**: +40% application success rate
- **Time Savings**: 60% faster proposal creation
- **User Satisfaction**: >4.5/5 rating

### **Cost Monitoring**
- **Monthly AI Budget**: €400-730
- **Cost per User**: <€10/month
- **ROI Tracking**: Revenue increase vs. AI investment

---

## 🚀 **Quick Start Commands**

### **Phase 1 Implementation (Week 1)**
```bash
# Install dependencies
cd backend && npm install @pinecone-database/pinecone

# Create service files
touch backend/src/services/vectorDatabase.ts
touch backend/src/services/enhancedOpenAI.ts

# Run database migrations
psql -d etownz_grants -f infrastructure/db/migrations/003_add_vector_support.sql

# Update environment variables
echo "PINECONE_API_KEY=your_key_here" >> .env

# Test integration
npm run test:vector-db
```

### **Development Environment Setup**
```bash
# Start with AI services enabled
./scripts/dev-start.sh --ai-enabled

# Run AI-specific tests
npm run test:ai

# Monitor AI costs
npm run ai:cost-report
```

---

## 📋 **Final Implementation Checklist**

### **Phase 1: Vector Database** ✅
- [ ] Pinecone setup and configuration
- [ ] Vector embedding generation
- [ ] Database schema updates
- [ ] Grant processing integration
- [ ] Semantic search endpoints

### **Phase 2: AI Assistants** ✅
- [ ] OpenAI Assistants API integration
- [ ] Chat service implementation
- [ ] REST API endpoints
- [ ] Frontend chat component
- [ ] Grant analysis features

### **Phase 3: Advanced Features** ✅
- [ ] Enhanced semantic search
- [ ] Smart recommendations
- [ ] Voice profile analysis
- [ ] Automated proposal generation
- [ ] Compliance checking

### **Phase 4: Production** ✅
- [ ] Performance optimization
- [ ] Cost monitoring
- [ ] Analytics dashboard
- [ ] Load testing
- [ ] Documentation

---

## 🎯 **Expected Outcomes**

After full implementation, the eTownz Grants platform will have:

✅ **World-class AI capabilities** matching the comprehensive OpenAI guide  
✅ **Semantic grant discovery** with 85%+ accuracy  
✅ **Conversational AI assistant** for real-time help  
✅ **Automated proposal generation** with voice simulation  
✅ **Advanced analytics** and cost optimization  
✅ **Production-ready** AI infrastructure  

**Total Investment**: €15,000-25,000 + €400-730/month  
**Expected ROI**: 3-5x through improved success rates and efficiency  
**Competitive Advantage**: Leading AI-powered grants platform in Ireland  

The implementation roadmap provides a clear path from the current solid foundation to a comprehensive AI-powered grants management platform that will significantly enhance user success and platform differentiation.

---

*Last updated: $(date)*  
*Version: 1.0 - Complete Implementation Roadmap*  
*Status: ✅ READY FOR IMPLEMENTATION*