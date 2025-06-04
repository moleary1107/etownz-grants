import { OpenAI } from 'openai';
import { logger } from './logger';

export interface TextChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    wordCount: number;
    characterCount: number;
    sentenceCount: number;
  };
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  totalUsage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ChunkingOptions {
  maxChunkSize: number;
  chunkOverlap: number;
  preserveSentences: boolean;
  preserveParagraphs: boolean;
  minChunkSize: number;
  respectWordBoundaries: boolean;
}

export interface SemanticChunkingOptions extends ChunkingOptions {
  similarityThreshold: number;
  maxChunksToCompare: number;
  useSemanticBoundaries: boolean;
}

export class EmbeddingService {
  private openai: OpenAI;
  private readonly defaultModel = 'text-embedding-3-small';
  private readonly batchSize = 100;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  async generateEmbedding(
    text: string,
    model: string = this.defaultModel
  ): Promise<EmbeddingResult> {
    try {
      if (!text.trim()) {
        throw new Error('Text cannot be empty');
      }

      const response = await this.openai.embeddings.create({
        model,
        input: text,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embedding returned from OpenAI');
      }

      return {
        embedding: response.data[0].embedding,
        model,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        }
      };
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(
    texts: string[],
    model: string = this.defaultModel
  ): Promise<BatchEmbeddingResult> {
    try {
      if (!texts.length) {
        throw new Error('No texts provided');
      }

      const validTexts = texts.filter(text => text.trim());
      if (validTexts.length !== texts.length) {
        logger.warn(`Filtered out ${texts.length - validTexts.length} empty texts`);
      }

      let allEmbeddings: Array<{ embedding: number[]; index: number }> = [];
      let totalPromptTokens = 0;
      let totalTokens = 0;

      // Process in batches to avoid API limits
      for (let i = 0; i < validTexts.length; i += this.batchSize) {
        const batch = validTexts.slice(i, i + this.batchSize);
        const batchIndices = Array.from({ length: batch.length }, (_, idx) => i + idx);

        const response = await this.openai.embeddings.create({
          model,
          input: batch,
        });

        if (!response.data || response.data.length === 0) {
          throw new Error(`No embeddings returned for batch starting at index ${i}`);
        }

        const batchEmbeddings = response.data.map((item, idx) => ({
          embedding: item.embedding,
          index: batchIndices[idx]
        }));

        allEmbeddings = allEmbeddings.concat(batchEmbeddings);
        totalPromptTokens += response.usage?.prompt_tokens || 0;
        totalTokens += response.usage?.total_tokens || 0;

        // Add small delay between batches to respect rate limits
        if (i + this.batchSize < validTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        embeddings: allEmbeddings,
        model,
        totalUsage: {
          prompt_tokens: totalPromptTokens,
          total_tokens: totalTokens,
        }
      };
    } catch (error) {
      logger.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  chunkText(
    text: string,
    options: Partial<ChunkingOptions> = {}
  ): TextChunk[] {
    const opts: ChunkingOptions = {
      maxChunkSize: 1000,
      chunkOverlap: 200,
      preserveSentences: true,
      preserveParagraphs: true,
      minChunkSize: 100,
      respectWordBoundaries: true,
      ...options
    };

    try {
      if (!text.trim()) {
        return [];
      }

      if (opts.preserveParagraphs) {
        return this.chunkByParagraphs(text, opts);
      } else if (opts.preserveSentences) {
        return this.chunkBySentences(text, opts);
      } else {
        return this.chunkByCharacters(text, opts);
      }
    } catch (error) {
      logger.error('Error chunking text:', error);
      throw error;
    }
  }

  private chunkByParagraphs(text: string, options: ChunkingOptions): TextChunk[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let startIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

      if (potentialChunk.length > options.maxChunkSize && currentChunk) {
        // Create chunk from current content
        const chunk = this.createTextChunk(
          currentChunk,
          startIndex,
          startIndex + currentChunk.length,
          chunks.length
        );
        chunks.push(chunk);

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, options.chunkOverlap);
        currentChunk = overlapText + (overlapText ? '\n\n' : '') + paragraph;
        startIndex = text.indexOf(currentChunk, chunk.endIndex);
      } else {
        currentChunk = potentialChunk;
        if (!startIndex && currentChunk) {
          startIndex = text.indexOf(currentChunk);
        }
      }
    }

    // Add final chunk
    if (currentChunk.trim() && currentChunk.length >= options.minChunkSize) {
      chunks.push(this.createTextChunk(
        currentChunk,
        startIndex,
        startIndex + currentChunk.length,
        chunks.length
      ));
    }

    return this.finalizeChunks(chunks);
  }

  private chunkBySentences(text: string, options: ChunkingOptions): TextChunk[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let startIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim() + (i < sentences.length - 1 ? '. ' : '');
      const potentialChunk = currentChunk + sentence;

      if (potentialChunk.length > options.maxChunkSize && currentChunk) {
        // Create chunk from current content
        const chunk = this.createTextChunk(
          currentChunk.trim(),
          startIndex,
          startIndex + currentChunk.length,
          chunks.length
        );
        chunks.push(chunk);

        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(currentChunk, options.chunkOverlap);
        currentChunk = overlapSentences + sentence;
        startIndex = text.indexOf(currentChunk.trim(), chunk.endIndex);
      } else {
        currentChunk = potentialChunk;
        if (!startIndex && currentChunk) {
          startIndex = text.indexOf(currentChunk.trim());
        }
      }
    }

    // Add final chunk
    if (currentChunk.trim() && currentChunk.length >= options.minChunkSize) {
      chunks.push(this.createTextChunk(
        currentChunk.trim(),
        startIndex,
        startIndex + currentChunk.length,
        chunks.length
      ));
    }

    return this.finalizeChunks(chunks);
  }

  private chunkByCharacters(text: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + options.maxChunkSize, text.length);

      // Respect word boundaries if requested
      if (options.respectWordBoundaries && endIndex < text.length) {
        const lastSpace = text.lastIndexOf(' ', endIndex);
        if (lastSpace > startIndex) {
          endIndex = lastSpace;
        }
      }

      const chunkContent = text.slice(startIndex, endIndex).trim();
      
      if (chunkContent.length >= options.minChunkSize) {
        chunks.push(this.createTextChunk(
          chunkContent,
          startIndex,
          endIndex,
          chunks.length
        ));
      }

      // Move start index with overlap
      startIndex = Math.max(endIndex - options.chunkOverlap, startIndex + 1);
    }

    return this.finalizeChunks(chunks);
  }

  private createTextChunk(
    content: string,
    startIndex: number,
    endIndex: number,
    chunkIndex: number
  ): TextChunk {
    const words = content.split(/\s+/).filter(w => w.trim());
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());

    return {
      id: `chunk_${chunkIndex}_${startIndex}_${endIndex}`,
      content: content.trim(),
      startIndex,
      endIndex,
      metadata: {
        chunkIndex,
        totalChunks: 0, // Will be updated in finalizeChunks
        wordCount: words.length,
        characterCount: content.length,
        sentenceCount: sentences.length
      }
    };
  }

  private finalizeChunks(chunks: TextChunk[]): TextChunk[] {
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        totalChunks: chunks.length
      }
    }));
  }

  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }

    const overlapText = text.slice(-overlapSize);
    const lastSentenceEnd = overlapText.lastIndexOf('.');
    
    if (lastSentenceEnd > 0) {
      return overlapText.slice(lastSentenceEnd + 1).trim();
    }
    
    return overlapText;
  }

  private getOverlapSentences(text: string, overlapSize: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    let overlap = '';
    let currentLength = 0;

    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i].trim() + '. ';
      if (currentLength + sentence.length <= overlapSize) {
        overlap = sentence + overlap;
        currentLength += sentence.length;
      } else {
        break;
      }
    }

    return overlap;
  }

  async semanticChunking(
    text: string,
    options: Partial<SemanticChunkingOptions> = {}
  ): Promise<TextChunk[]> {
    const opts: SemanticChunkingOptions = {
      maxChunkSize: 1000,
      chunkOverlap: 200,
      preserveSentences: true,
      preserveParagraphs: false,
      minChunkSize: 100,
      respectWordBoundaries: true,
      similarityThreshold: 0.8,
      maxChunksToCompare: 5,
      useSemanticBoundaries: true,
      ...options
    };

    try {
      // First, create initial chunks using traditional methods
      const initialChunks = this.chunkText(text, opts);
      
      if (!opts.useSemanticBoundaries || initialChunks.length <= 1) {
        return initialChunks;
      }

      // Generate embeddings for initial chunks
      const chunkTexts = initialChunks.map(chunk => chunk.content);
      const embeddingResult = await this.generateBatchEmbeddings(chunkTexts);
      
      // Merge semantically similar adjacent chunks
      const semanticChunks: TextChunk[] = [];
      let currentChunk = initialChunks[0];
      let currentEmbedding = embeddingResult.embeddings.find(e => e.index === 0)?.embedding;

      for (let i = 1; i < initialChunks.length; i++) {
        const nextChunk = initialChunks[i];
        const nextEmbedding = embeddingResult.embeddings.find(e => e.index === i)?.embedding;

        if (currentEmbedding && nextEmbedding) {
          const similarity = this.cosineSimilarity(currentEmbedding, nextEmbedding);

          // If similarity is high and combined length is reasonable, merge chunks
          if (similarity >= opts.similarityThreshold && 
              (currentChunk.content.length + nextChunk.content.length) <= opts.maxChunkSize * 1.5) {
            
            currentChunk = {
              ...currentChunk,
              content: currentChunk.content + '\n\n' + nextChunk.content,
              endIndex: nextChunk.endIndex,
              metadata: {
                ...currentChunk.metadata,
                wordCount: currentChunk.metadata.wordCount + nextChunk.metadata.wordCount,
                characterCount: currentChunk.metadata.characterCount + nextChunk.metadata.characterCount,
                sentenceCount: currentChunk.metadata.sentenceCount + nextChunk.metadata.sentenceCount
              }
            };
            
            // Update embedding to be average of the two
            currentEmbedding = this.averageEmbeddings([currentEmbedding, nextEmbedding]);
          } else {
            // Add current chunk to results and start new one
            semanticChunks.push(currentChunk);
            currentChunk = nextChunk;
            currentEmbedding = nextEmbedding;
          }
        } else {
          // If we can't get embeddings, fall back to traditional chunking
          semanticChunks.push(currentChunk);
          currentChunk = nextChunk;
        }
      }

      // Add the last chunk
      semanticChunks.push(currentChunk);

      return this.finalizeChunks(semanticChunks);
    } catch (error) {
      logger.error('Error in semantic chunking, falling back to traditional chunking:', error);
      return this.chunkText(text, opts);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      throw new Error('Cannot average empty embeddings array');
    }

    const length = embeddings[0].length;
    const average = new Array(length).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < length; i++) {
        average[i] += embedding[i];
      }
    }

    for (let i = 0; i < length; i++) {
      average[i] /= embeddings.length;
    }

    return average;
  }

  async findSimilarTexts(
    queryText: string,
    candidateTexts: string[],
    threshold: number = 0.7,
    topK?: number
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    try {
      const allTexts = [queryText, ...candidateTexts];
      const embeddingResult = await this.generateBatchEmbeddings(allTexts);
      
      const queryEmbedding = embeddingResult.embeddings.find(e => e.index === 0)?.embedding;
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      const similarities = candidateTexts.map((text, index) => {
        const candidateEmbedding = embeddingResult.embeddings.find(e => e.index === index + 1)?.embedding;
        if (!candidateEmbedding) {
          return { text, similarity: 0, index };
        }

        const similarity = this.cosineSimilarity(queryEmbedding, candidateEmbedding);
        return { text, similarity, index };
      });

      let filteredResults = similarities.filter(result => result.similarity >= threshold);
      filteredResults.sort((a, b) => b.similarity - a.similarity);

      if (topK) {
        filteredResults = filteredResults.slice(0, topK);
      }

      return filteredResults;
    } catch (error) {
      logger.error('Error finding similar texts:', error);
      throw error;
    }
  }

  getEmbeddingDimensions(model: string = this.defaultModel): number {
    const dimensionMap: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };

    return dimensionMap[model] || 1536;
  }

  estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  estimateEmbeddingCost(tokenCount: number, model: string = this.defaultModel): number {
    // Pricing as of 2024 (per 1M tokens)
    const pricingMap: Record<string, number> = {
      'text-embedding-3-small': 0.02,
      'text-embedding-3-large': 0.13,
      'text-embedding-ada-002': 0.10,
    };

    const pricePerMillion = pricingMap[model] || 0.02;
    return (tokenCount / 1000000) * pricePerMillion;
  }
}

export const embeddingService = new EmbeddingService();