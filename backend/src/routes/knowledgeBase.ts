import express from 'express';
import { ragKnowledgeBaseService } from '../services/ragKnowledgeBaseService';
import { logger } from '../services/logger';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/knowledge-base:
 *   post:
 *     summary: Add document to knowledge base
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - type
 *               - source
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [grant, policy, guideline, application, knowledge]
 *               source:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Document added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 documentId:
 *                   type: string
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, content, type, source, category, tags = [] } = req.body;

    if (!title || !content || !type || !source) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, type, and source are required'
      });
    }

    const validTypes = ['grant', 'policy', 'guideline', 'application', 'knowledge'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Type must be one of: ${validTypes.join(', ')}`
      });
    }

    const documentId = await ragKnowledgeBaseService.addDocumentToKnowledgeBase(
      title,
      content,
      type,
      source,
      category,
      tags
    );

    res.status(201).json({
      success: true,
      documentId,
      message: 'Document added to knowledge base successfully'
    });
  } catch (error) {
    logger.error('Error adding document to knowledge base:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add document to knowledge base'
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/search:
 *   get:
 *     summary: Search knowledge base documents
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [grant, policy, guideline, application, knowledge]
 *         description: Document type filter
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category filter
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      q: searchTerm = '',
      type,
      category,
      tags,
      page = 1,
      limit = 20
    } = req.query;

    const filters: any = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (tags) filters.tags = (tags as string).split(',').map(tag => tag.trim());

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const results = await ragKnowledgeBaseService.searchKnowledgeBase(
      searchTerm as string,
      filters,
      pagination
    );

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    logger.error('Error searching knowledge base:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search knowledge base'
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/{id}:
 *   put:
 *     summary: Update document in knowledge base
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Document updated successfully
 */
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    await ragKnowledgeBaseService.updateDocument(id, updates);

    res.json({
      success: true,
      message: 'Document updated successfully'
    });
  } catch (error) {
    logger.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update document'
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/{id}:
 *   delete:
 *     summary: Delete document from knowledge base
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted successfully
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    await ragKnowledgeBaseService.deleteDocument(id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/stats:
 *   get:
 *     summary: Get knowledge base statistics
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Knowledge base statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalDocuments:
 *                       type: number
 *                     totalEmbeddings:
 *                       type: number
 *                     documentsByType:
 *                       type: object
 *                     embeddingStatus:
 *                       type: object
 */
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await ragKnowledgeBaseService.getKnowledgeBaseStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error getting knowledge base stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get knowledge base statistics'
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/initialize:
 *   post:
 *     summary: Initialize Pinecone index
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pinecone index initialized successfully
 */
router.post('/initialize', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await ragKnowledgeBaseService.initializePineconeIndex();

    res.json({
      success: true,
      message: 'Pinecone index initialized successfully'
    });
  } catch (error) {
    logger.error('Error initializing Pinecone index:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Pinecone index'
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/bulk-upload:
 *   post:
 *     summary: Bulk upload documents to knowledge base
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - title
 *                     - content
 *                     - type
 *                     - source
 *                   properties:
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [grant, policy, guideline, application, knowledge]
 *                     source:
 *                       type: string
 *                     category:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       200:
 *         description: Bulk upload results
 */
router.post('/bulk-upload', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Documents array is required and must not be empty'
      });
    }

    const validTypes = ['grant', 'policy', 'guideline', 'application', 'knowledge'];
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      try {
        if (!doc.title || !doc.content || !doc.type || !doc.source) {
          errors.push({
            index: i,
            error: 'Title, content, type, and source are required',
            document: doc.title || `Document ${i}`
          });
          continue;
        }

        if (!validTypes.includes(doc.type)) {
          errors.push({
            index: i,
            error: `Type must be one of: ${validTypes.join(', ')}`,
            document: doc.title
          });
          continue;
        }

        const documentId = await ragKnowledgeBaseService.addDocumentToKnowledgeBase(
          doc.title,
          doc.content,
          doc.type,
          doc.source,
          doc.category,
          doc.tags || []
        );

        results.push({
          index: i,
          documentId,
          title: doc.title,
          status: 'success'
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          document: doc.title || `Document ${i}`
        });
      }
    }

    res.json({
      success: true,
      results,
      errors,
      summary: {
        total: documents.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    logger.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk upload'
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/categories:
 *   get:
 *     summary: Get all categories in knowledge base
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await ragKnowledgeBaseService.searchKnowledgeBase('', {}, { page: 1, limit: 1000 });
    
    const categories = new Set<string>();
    result.documents.forEach(doc => {
      if (doc.category) {
        categories.add(doc.category);
      }
    });

    res.json({
      success: true,
      categories: Array.from(categories).sort()
    });
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/tags:
 *   get:
 *     summary: Get all tags in knowledge base
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tags
 */
router.get('/tags', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await ragKnowledgeBaseService.searchKnowledgeBase('', {}, { page: 1, limit: 1000 });
    
    const tags = new Set<string>();
    result.documents.forEach(doc => {
      if (Array.isArray(doc.tags)) {
        doc.tags.forEach(tag => tags.add(tag));
      }
    });

    res.json({
      success: true,
      tags: Array.from(tags).sort()
    });
  } catch (error) {
    logger.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tags'
    });
  }
});

export default router;