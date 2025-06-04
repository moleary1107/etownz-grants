import { embeddingService } from '../services/embeddingService';
import { openaiService } from '../services/openaiService';

// Mock dependencies
jest.mock('../services/openaiService');

describe('Embedding Service', () => {
  const mockOpenaiService = openaiService as jest.Mocked<typeof openaiService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenaiService.createEmbedding.mockResolvedValue(mockEmbedding);

      const result = await embeddingService.generateEmbedding('test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockOpenaiService.createEmbedding).toHaveBeenCalledWith('test text');
    });

    it('should handle embedding generation errors', async () => {
      mockOpenaiService.createEmbedding.mockRejectedValue(new Error('API error'));

      await expect(embeddingService.generateEmbedding('test')).rejects.toThrow('API error');
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['text1', 'text2', 'text3'];
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9]
      ];

      mockOpenaiService.createEmbedding
        .mockResolvedValueOnce(mockEmbeddings[0])
        .mockResolvedValueOnce(mockEmbeddings[1])
        .mockResolvedValueOnce(mockEmbeddings[2]);

      const results = await embeddingService.generateBatchEmbeddings(texts);

      expect(results).toHaveLength(3);
      expect(results).toEqual(mockEmbeddings);
      expect(mockOpenaiService.createEmbedding).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch processing', async () => {
      const texts = ['text1', 'text2', 'text3'];
      
      mockOpenaiService.createEmbedding
        .mockResolvedValueOnce([0.1, 0.2, 0.3])
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce([0.7, 0.8, 0.9]);

      const results = await embeddingService.generateBatchEmbeddings(texts);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual([0.1, 0.2, 0.3]);
      expect(results[1]).toEqual([0.7, 0.8, 0.9]);
    });

    it('should respect batch size limits', async () => {
      const texts = Array.from({ length: 150 }, (_, i) => `text${i}`);
      const mockEmbedding = [0.1, 0.2, 0.3];
      
      mockOpenaiService.createEmbedding.mockResolvedValue(mockEmbedding);

      const results = await embeddingService.generateBatchEmbeddings(texts, 50);

      expect(results).toHaveLength(150);
      expect(mockOpenaiService.createEmbedding).toHaveBeenCalledTimes(150);
    });
  });

  describe('chunkDocument', () => {
    it('should chunk document into smaller pieces', () => {
      const longText = 'This is a very long document. '.repeat(100);
      
      const chunks = embeddingService.chunkDocument(longText, 500, 50);

      expect(chunks).toBeInstanceOf(Array);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(500);
      });
    });

    it('should handle overlap between chunks', () => {
      const text = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.';
      
      const chunks = embeddingService.chunkDocument(text, 30, 10);

      expect(chunks.length).toBeGreaterThan(1);
      
      // Check overlap exists
      for (let i = 1; i < chunks.length; i++) {
        const prevChunk = chunks[i - 1];
        const currentChunk = chunks[i];
        const overlap = prevChunk.slice(-10);
        expect(currentChunk.startsWith(overlap.trim())).toBeTruthy();
      }
    });

    it('should handle short documents', () => {
      const shortText = 'This is a short document.';
      
      const chunks = embeddingService.chunkDocument(shortText, 500, 50);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(shortText);
    });

    it('should handle empty documents', () => {
      const chunks = embeddingService.chunkDocument('', 500, 50);

      expect(chunks).toHaveLength(0);
    });
  });

  describe('preprocessText', () => {
    it('should clean and normalize text', () => {
      const dirtyText = '  This is a\n\ntest   document with\textra\r\nwhitespace.  ';
      
      const cleaned = embeddingService.preprocessText(dirtyText);

      expect(cleaned).toBe('This is a test document with extra whitespace.');
    });

    it('should remove special characters', () => {
      const textWithSpecialChars = 'Test document with special chars: @#$%^&*()';
      
      const cleaned = embeddingService.preprocessText(textWithSpecialChars);

      expect(cleaned).toBe('Test document with special chars');
    });

    it('should handle empty or whitespace-only text', () => {
      expect(embeddingService.preprocessText('')).toBe('');
      expect(embeddingService.preprocessText('   \n\t  ')).toBe('');
    });

    it('should convert to lowercase', () => {
      const mixedCase = 'This Has Mixed CASE Text';
      
      const cleaned = embeddingService.preprocessText(mixedCase);

      expect(cleaned).toBe('this has mixed case text');
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate cosine similarity between embeddings', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];
      const embedding3 = [1, 0, 0];

      const similarity1 = embeddingService.calculateSimilarity(embedding1, embedding2);
      const similarity2 = embeddingService.calculateSimilarity(embedding1, embedding3);

      expect(similarity1).toBe(0); // Orthogonal vectors
      expect(similarity2).toBe(1); // Identical vectors
    });

    it('should handle zero vectors', () => {
      const embedding1 = [0, 0, 0];
      const embedding2 = [1, 0, 0];

      const similarity = embeddingService.calculateSimilarity(embedding1, embedding2);

      expect(similarity).toBe(0);
    });

    it('should handle different vector lengths', () => {
      const embedding1 = [1, 0];
      const embedding2 = [1, 0, 0];

      expect(() => {
        embeddingService.calculateSimilarity(embedding1, embedding2);
      }).toThrow();
    });
  });

  describe('findSimilarChunks', () => {
    it('should find similar chunks based on embeddings', async () => {
      const queryEmbedding = [1, 0, 0];
      const chunks = [
        { text: 'chunk1', embedding: [0.9, 0.1, 0] },
        { text: 'chunk2', embedding: [0, 1, 0] },
        { text: 'chunk3', embedding: [0.8, 0.2, 0] }
      ];

      const similar = await embeddingService.findSimilarChunks(
        queryEmbedding,
        chunks,
        2,
        0.5
      );

      expect(similar).toHaveLength(2);
      expect(similar[0].text).toBe('chunk1');
      expect(similar[1].text).toBe('chunk3');
      expect(similar[0].similarity).toBeGreaterThan(similar[1].similarity);
    });

    it('should filter by similarity threshold', async () => {
      const queryEmbedding = [1, 0, 0];
      const chunks = [
        { text: 'chunk1', embedding: [0.9, 0.1, 0] },
        { text: 'chunk2', embedding: [0, 1, 0] },
        { text: 'chunk3', embedding: [0.1, 0.9, 0] }
      ];

      const similar = await embeddingService.findSimilarChunks(
        queryEmbedding,
        chunks,
        5,
        0.8
      );

      expect(similar).toHaveLength(1);
      expect(similar[0].text).toBe('chunk1');
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'This is a test document about machine learning and artificial intelligence';
      
      const keywords = embeddingService.extractKeywords(text);

      expect(keywords).toBeInstanceOf(Array);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('machine');
      expect(keywords).toContain('learning');
      expect(keywords).toContain('artificial');
      expect(keywords).toContain('intelligence');
    });

    it('should filter out common stop words', () => {
      const text = 'This is a test with the and or but words';
      
      const keywords = embeddingService.extractKeywords(text);

      expect(keywords).not.toContain('this');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('and');
      expect(keywords).not.toContain('or');
      expect(keywords).not.toContain('but');
    });

    it('should handle empty text', () => {
      const keywords = embeddingService.extractKeywords('');

      expect(keywords).toHaveLength(0);
    });
  });

  describe('performance and error handling', () => {
    it('should handle rate limiting gracefully', async () => {
      mockOpenaiService.createEmbedding.mockRejectedValue({
        error: { type: 'rate_limit_exceeded' }
      });

      await expect(embeddingService.generateEmbedding('test')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockOpenaiService.createEmbedding.mockRejectedValue(new Error('Network error'));

      await expect(embeddingService.generateEmbedding('test')).rejects.toThrow('Network error');
    });

    it('should validate embedding dimensions', () => {
      const invalidEmbedding = [1, 2]; // Too short
      const validEmbedding = new Array(1536).fill(0.1);

      expect(() => {
        embeddingService.validateEmbedding(invalidEmbedding);
      }).toThrow();

      expect(() => {
        embeddingService.validateEmbedding(validEmbedding);
      }).not.toThrow();
    });
  });

  describe('caching', () => {
    it('should cache embedding results', async () => {
      const text = 'test text for caching';
      const mockEmbedding = [0.1, 0.2, 0.3];
      
      mockOpenaiService.createEmbedding.mockResolvedValue(mockEmbedding);

      // First call
      const result1 = await embeddingService.generateEmbedding(text);
      
      // Second call should use cache
      const result2 = await embeddingService.generateEmbedding(text);

      expect(result1).toEqual(mockEmbedding);
      expect(result2).toEqual(mockEmbedding);
      expect(mockOpenaiService.createEmbedding).toHaveBeenCalledTimes(1);
    });

    it('should respect cache expiration', async () => {
      const text = 'test text for cache expiration';
      const mockEmbedding = [0.1, 0.2, 0.3];
      
      mockOpenaiService.createEmbedding.mockResolvedValue(mockEmbedding);

      // Mock cache expiration
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000000); // Far in the future

      await embeddingService.generateEmbedding(text);
      await embeddingService.generateEmbedding(text);

      expect(mockOpenaiService.createEmbedding).toHaveBeenCalledTimes(2);
    });
  });
});