import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { asyncHandler } from '../middleware/errorHandler';
import { DocumentUploadService } from '../services/documentUploadService';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/database';
import { OpenAIService } from '../services/openaiService';
import { AITransparencyService } from '../services/aiTransparencyService';

const router = express.Router();

// Initialize services
const dbService = DatabaseService.getInstance();
const openaiService = new OpenAIService();
const aiTransparencyService = new AITransparencyService(dbService.getPool());
const documentUploadService = new DocumentUploadService(dbService.getPool(), openaiService, aiTransparencyService);

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT'));
    }
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         filename:
 *           type: string
 *         originalFilename:
 *           type: string
 *         fileType:
 *           type: string
 *         fileSize:
 *           type: integer
 *         documentType:
 *           type: string
 *           enum: [profile, proposal, report, other]
 *         extractedText:
 *           type: string
 *         metadata:
 *           type: object
 *         isProcessed:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get organization documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [profile, proposal, report, other]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  const documents = await documentUploadService.getUserDocuments(
    req.user.id,
    Number(limit),
    offset
  );
  
  res.json({
    documents: documents.map(doc => ({
      id: doc.id,
      filename: doc.fileName,
      originalFilename: doc.originalName,
      fileType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadStatus: doc.uploadStatus,
      processingProgress: doc.processingProgress,
      metadata: doc.metadata,
      createdAt: doc.createdAt
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: documents.length
    }
  });
}));

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     summary: Upload document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [profile, proposal, report, other]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 */
router.post('/upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { applicationId, description } = req.body;
  
  try {
    const documentId = await documentUploadService.createDocumentUpload({
      userId: req.user.id,
      applicationId: applicationId || undefined,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadStatus: 'uploaded',
      processingProgress: 0,
      metadata: { description: description || '' }
    });

    // Start async analysis
    documentUploadService.analyzeDocument(documentId).catch(error => {
      console.error('Document analysis failed:', error);
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: documentId,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadStatus: 'uploaded',
        processingProgress: 0,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    try {
      await fs.unlink(req.file.path);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}));

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 */
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const document = await documentUploadService.getDocumentUpload(req.params.id);
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  if (document.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json({
    id: document.id,
    filename: document.fileName,
    originalFilename: document.originalName,
    fileType: document.mimeType,
    fileSize: document.fileSize,
    uploadStatus: document.uploadStatus,
    processingProgress: document.processingProgress,
    metadata: document.metadata,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  });
}));

/**
 * @swagger
 * /documents/{id}/status:
 *   get:
 *     summary: Get document processing status
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document status retrieved successfully
 */
router.get('/:id/status', authenticateToken, asyncHandler(async (req, res) => {
  const document = await documentUploadService.getDocumentUpload(req.params.id);
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  if (document.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const status = await documentUploadService.getDocumentStatus(req.params.id);
  
  res.json({
    document: {
      id: status.document.id,
      uploadStatus: status.document.uploadStatus,
      processingProgress: status.document.processingProgress
    },
    jobs: status.jobs.map(job => ({
      id: job.id,
      type: job.jobType,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage
    })),
    overallProgress: status.overallProgress
  });
}));

/**
 * @swagger
 * /documents/{id}/analysis:
 *   get:
 *     summary: Get document analysis results
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Analysis results retrieved successfully
 */
router.get('/:id/analysis', authenticateToken, asyncHandler(async (req, res) => {
  const document = await documentUploadService.getDocumentUpload(req.params.id);
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  if (document.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (document.uploadStatus !== 'completed') {
    return res.status(400).json({ error: 'Document analysis not yet completed' });
  }
  
  // Get the latest completed analysis job
  const jobs = await documentUploadService.getDocumentJobs(req.params.id);
  const analysisJob = jobs.find(job => job.jobType === 'ai_analysis' && job.status === 'completed');
  
  if (!analysisJob || !analysisJob.resultData) {
    return res.status(404).json({ error: 'Analysis results not found' });
  }
  
  res.json({
    documentId: req.params.id,
    processingTime: analysisJob.processingTimeMs,
    completedAt: analysisJob.completedAt,
    results: analysisJob.resultData
  });
}));

/**
 * @swagger
 * /documents/{id}/download:
 *   get:
 *     summary: Download document file
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/download', asyncHandler(async (req, res) => {
  // TODO: Serve file download
  res.json({ message: 'File download endpoint - TODO' });
}));

export default router;