import express from 'express';
import { ragKnowledgeBaseService } from '../services/ragKnowledgeBaseService';
import { embeddingService } from '../services/embeddingService';
import { logger } from '../services/logger';
import { auth } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/semantic-search:
 *   post:
 *     summary: Perform semantic search across knowledge base
 *     tags: [Semantic Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query
 *               topK:
 *                 type: number
 *                 default: 10
 *                 description: Number of results to return
 *               filter:
 *                 type: object
 *                 properties:
 *                   documentType:
 *                     type: string
 *                     enum: [grant, policy, guideline, application, knowledge]
 *                   category:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *               minScore:
 *                 type: number
 *                 default: 0.7
 *                 description: Minimum similarity score
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       metadata:
 *                         type: object
 *                       score:
 *                         type: number
 *                 query:
 *                   type: string
 *                 totalResults:
 *                   type: number
 */
router.post('/', auth, async (req, res) => {
  try {
    const { query, topK = 10, filter = {}, minScore = 0.7 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    const results = await ragKnowledgeBaseService.semanticSearch(query, {
      topK,
      filter,
      minScore,
      includeMetadata: true
    });

    res.json({
      success: true,
      results,
      query,
      totalResults: results.length
    });
  } catch (error) {
    logger.error('Error in semantic search:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform semantic search'
    });
  }
});

/**
 * @swagger
 * /api/semantic-search/context:
 *   post:
 *     summary: Get relevant context for a query
 *     tags: [Semantic Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *               documentType:
 *                 type: string
 *                 enum: [grant, policy, guideline, application, knowledge]
 *               maxTokens:
 *                 type: number
 *                 default: 4000
 *     responses:
 *       200:
 *         description: Relevant context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 context:
 *                   type: string
 *                 query:
 *                   type: string
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/context', auth, async (req, res) => {
  try {
    const { query, documentType, maxTokens = 4000 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    const context = await ragKnowledgeBaseService.getRelevantContext(
      query,
      documentType,
      maxTokens
    );

    // Extract source information
    const sourceMatches = context.match(/\[Source: ([^\]]+)\]/g) || [];
    const sources = sourceMatches.map(match => match.replace(/\[Source: ([^\]]+)\]/, '$1'));

    res.json({
      success: true,
      context,
      query,
      sources: [...new Set(sources)] // Remove duplicates
    });
  } catch (error) {
    logger.error('Error getting relevant context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get relevant context'
    });
  }
});

/**
 * @swagger
 * /api/semantic-search/similar:
 *   post:
 *     summary: Find similar text chunks
 *     tags: [Semantic Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - candidates
 *             properties:
 *               text:
 *                 type: string
 *                 description: Reference text
 *               candidates:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Candidate texts to compare
 *               threshold:
 *                 type: number
 *                 default: 0.7
 *               topK:
 *                 type: number
 *                 description: Maximum number of results
 *     responses:
 *       200:
 *         description: Similar texts with similarity scores
 */
router.post('/similar', auth, async (req, res) => {
  try {
    const { text, candidates, threshold = 0.7, topK } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string'
      });
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Candidates array is required and must not be empty'
      });
    }

    const results = await embeddingService.findSimilarTexts(
      text,
      candidates,
      threshold,
      topK
    );

    res.json({
      success: true,
      results,
      referenceText: text,
      threshold
    });
  } catch (error) {
    logger.error('Error finding similar texts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find similar texts'
    });
  }
});

/**
 * @swagger
 * /api/semantic-search/embeddings:
 *   post:
 *     summary: Generate embeddings for text
 *     tags: [Semantic Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Single text to embed
 *               texts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Multiple texts to embed
 *               model:
 *                 type: string
 *                 default: text-embedding-3-small
 *     responses:
 *       200:
 *         description: Generated embeddings
 */
router.post('/embeddings', auth, async (req, res) => {
  try {
    const { text, texts, model } = req.body;

    if (!text && !texts) {
      return res.status(400).json({
        success: false,
        error: 'Either text or texts array is required'
      });
    }

    if (text && texts) {
      return res.status(400).json({
        success: false,
        error: 'Provide either text or texts, not both'
      });
    }

    let result;

    if (text) {
      result = await embeddingService.generateEmbedding(text, model);
    } else {
      result = await embeddingService.generateBatchEmbeddings(texts, model);
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error generating embeddings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate embeddings'
    });
  }
});

/**
 * @swagger
 * /api/semantic-search/chunk:
 *   post:
 *     summary: Chunk text for processing
 *     tags: [Semantic Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *               options:
 *                 type: object
 *                 properties:
 *                   maxChunkSize:
 *                     type: number
 *                     default: 1000
 *                   chunkOverlap:
 *                     type: number
 *                     default: 200
 *                   preserveSentences:
 *                     type: boolean
 *                     default: true
 *                   preserveParagraphs:
 *                     type: boolean
 *                     default: true
 *                   semantic:
 *                     type: boolean
 *                     default: false
 *                     description: Use semantic chunking
 *               semanticOptions:
 *                 type: object
 *                 properties:
 *                   similarityThreshold:
 *                     type: number
 *                     default: 0.8
 *                   useSemanticBoundaries:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Text chunks
 */
router.post('/chunk', auth, async (req, res) => {
  try {
    const { text, options = {}, semanticOptions = {} } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string'
      });
    }

    let chunks;
    
    if (options.semantic) {
      chunks = await embeddingService.semanticChunking(text, {
        ...options,
        ...semanticOptions
      });
    } else {
      chunks = embeddingService.chunkText(text, options);
    }

    res.json({
      success: true,
      chunks,
      totalChunks: chunks.length,
      options: options.semantic ? { ...options, ...semanticOptions } : options
    });
  } catch (error) {
    logger.error('Error chunking text:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to chunk text'
    });
  }
});

export default router;