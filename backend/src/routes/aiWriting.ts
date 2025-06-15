import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { OpenAIService } from '../services/openaiService';
import { AITransparencyService } from '../services/aiTransparencyService';
import { DatabaseService } from '../services/database';
import { logger } from '../services/logger';

const router = express.Router();

// Initialize services
const dbService = DatabaseService.getInstance();
const openaiService = new OpenAIService();
const aiTransparencyService = new AITransparencyService(dbService.getPool());

interface GenerationSettings {
  tone: 'formal' | 'persuasive' | 'technical' | 'conversational';
  length: 'brief' | 'moderate' | 'detailed';
  focusArea?: string;
}

interface GenerateContentRequest {
  prompt: string;
  sectionType: string;
  settings: GenerationSettings;
  stream?: boolean;
  existingContent?: string;
}

// Generate content with optional streaming
router.post('/generate-content', authenticateToken, asyncHandler(async (req, res) => {
  const {
    prompt,
    sectionType,
    settings,
    stream = false,
    existingContent = ''
  }: GenerateContentRequest = req.body;

  if (!prompt || !sectionType) {
    return res.status(400).json({ error: 'Prompt and section type are required' });
  }

  try {
    // Create AI transparency record
    const interactionId = await aiTransparencyService.createInteraction({
      userId: req.user.id,
      interactionType: 'content_generation',
      promptText: prompt,
      modelUsed: 'gpt-4o',
      status: 'processing',
      metadata: {
        sectionType,
        settings,
        existingContent: !!existingContent
      }
    });

    if (stream) {
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      let streamedContent = '';
      let tokenCount = 0;
      const startTime = Date.now();

      try {
        // Enhanced prompt for better content generation
        const enhancedPrompt = buildEnhancedPrompt(prompt, settings, existingContent);
        
        const stream = await openaiService.chatCompletionStream(enhancedPrompt, {
          model: 'gpt-4o',
          temperature: getTemperatureForTone(settings.tone),
          maxTokens: getMaxTokensForLength(settings.length)
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            streamedContent += content;
            tokenCount++;
            
            // Send content chunk
            res.write(`data: ${JSON.stringify({
              type: 'content',
              text: content,
              totalLength: streamedContent.length
            })}\n\n`);
          }
        }

        // Generate suggestions based on content
        const suggestions = await generateContentSuggestions(streamedContent, sectionType);
        const confidence = calculateContentConfidence(streamedContent, settings);

        // Send metadata
        res.write(`data: ${JSON.stringify({
          type: 'metadata',
          confidence,
          suggestions,
          wordCount: streamedContent.split(/\s+/).length,
          tokenCount
        })}\n\n`);

        // Send completion signal
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          totalContent: streamedContent
        })}\n\n`);

        // Update AI transparency record
        await aiTransparencyService.updateInteraction(interactionId, {
          responseText: streamedContent,
          status: 'completed',
          tokensUsed: tokenCount,
          processingTimeMs: Date.now() - startTime,
          confidenceScore: confidence
        });

        res.end();

      } catch (streamError) {
        logger.error('Streaming generation failed', { error: streamError, userId: req.user.id });
        
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: 'Content generation failed'
        })}\n\n`);
        
        await aiTransparencyService.updateInteraction(interactionId, {
          status: 'failed',
          processingTimeMs: Date.now() - startTime
        });

        res.end();
      }

    } else {
      // Non-streaming generation
      const startTime = Date.now();
      
      try {
        const enhancedPrompt = buildEnhancedPrompt(prompt, settings, existingContent);
        
        const response = await openaiService.chatCompletion(enhancedPrompt, {
          model: 'gpt-4o',
          temperature: getTemperatureForTone(settings.tone),
          maxTokens: getMaxTokensForLength(settings.length)
        });

        const suggestions = await generateContentSuggestions(response, sectionType);
        const confidence = calculateContentConfidence(response, settings);

        // Update AI transparency record
        await aiTransparencyService.updateInteraction(interactionId, {
          responseText: response,
          status: 'completed',
          processingTimeMs: Date.now() - startTime,
          confidenceScore: confidence
        });

        res.json({
          content: response,
          confidence,
          suggestions,
          wordCount: response.split(/\s+/).length,
          processingTime: Date.now() - startTime
        });

      } catch (error) {
        await aiTransparencyService.updateInteraction(interactionId, {
          status: 'failed',
          processingTimeMs: Date.now() - startTime
        });
        throw error;
      }
    }

  } catch (error) {
    logger.error('Content generation failed', { error, userId: req.user.id });
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}));

// Provide feedback on generated content
router.post('/feedback', authenticateToken, asyncHandler(async (req, res) => {
  const {
    sectionType,
    content,
    feedback,
    settings,
    confidence
  } = req.body;

  if (!feedback || !['positive', 'negative'].includes(feedback)) {
    return res.status(400).json({ error: 'Valid feedback type required' });
  }

  try {
    // Store feedback for model improvement
    await aiTransparencyService.createInteraction({
      userId: req.user.id,
      interactionType: 'content_feedback',
      promptText: `Feedback on ${sectionType}`,
      responseText: content,
      modelUsed: 'gpt-4o',
      status: 'completed',
      userRating: feedback === 'positive' ? 5 : 1,
      confidenceScore: confidence,
      metadata: {
        sectionType,
        settings,
        feedbackType: feedback
      }
    });

    res.json({ success: true });

  } catch (error) {
    logger.error('Failed to store feedback', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to store feedback' });
  }
}));

// Get content suggestions for improvement
router.post('/suggestions', authenticateToken, asyncHandler(async (req, res) => {
  const { content, sectionType, grantType, fundingBody } = req.body;

  if (!content || !sectionType) {
    return res.status(400).json({ error: 'Content and section type are required' });
  }

  try {
    const suggestions = await generateDetailedSuggestions(content, sectionType, grantType, fundingBody);
    
    res.json({
      suggestions,
      contentAnalysis: {
        wordCount: content.split(/\s+/).length,
        readabilityScore: calculateReadabilityScore(content),
        keywordDensity: analyzeKeywordDensity(content),
        structure: analyzeContentStructure(content)
      }
    });

  } catch (error) {
    logger.error('Failed to generate suggestions', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}));

// Helper functions
function buildEnhancedPrompt(basePrompt: string, settings: GenerationSettings, existingContent: string): string {
  const toneInstructions = {
    formal: 'Use formal, academic language with proper structure and professional terminology.',
    persuasive: 'Write in a compelling, persuasive manner that emphasizes benefits and impact.',
    technical: 'Focus on technical accuracy, precise terminology, and detailed explanations.',
    conversational: 'Use clear, accessible language that is easy to understand while remaining professional.'
  };

  const lengthInstructions = {
    brief: 'Keep the content concise and to the point, focusing on key elements only.',
    moderate: 'Provide a balanced level of detail with clear explanations and examples.',
    detailed: 'Include comprehensive information with thorough explanations and supporting details.'
  };

  const enhancedPrompt = `${basePrompt}

Writing Guidelines:
- ${toneInstructions[settings.tone]}
- ${lengthInstructions[settings.length]}
${settings.focusArea ? `- Special focus on: ${settings.focusArea}` : ''}

${existingContent ? `
Existing content to improve or build upon:
"${existingContent}"

Please enhance, expand, or rewrite this content while maintaining its core intent.` : ''}

Please generate high-quality, grant-specific content that follows these guidelines.`;

  return enhancedPrompt;
}

function getTemperatureForTone(tone: string): number {
  const temperatures = {
    formal: 0.3,
    technical: 0.2,
    persuasive: 0.7,
    conversational: 0.6
  };
  return temperatures[tone as keyof typeof temperatures] || 0.5;
}

function getMaxTokensForLength(length: string): number {
  const tokenLimits = {
    brief: 500,
    moderate: 1000,
    detailed: 2000
  };
  return tokenLimits[length as keyof typeof tokenLimits] || 1000;
}

async function generateContentSuggestions(content: string, sectionType: string): Promise<string[]> {
  const suggestions: string[] = [];
  
  // Basic content analysis
  const wordCount = content.split(/\s+/).length;
  const hasNumbers = /\d/.test(content);
  const hasQuestions = /\?/.test(content);
  
  // Section-specific suggestions
  switch (sectionType) {
    case 'executive_summary':
      if (wordCount > 300) suggestions.push('Consider shortening for better executive readability');
      if (!hasNumbers) suggestions.push('Include specific metrics or numbers for impact');
      break;
      
    case 'budget_justification':
      if (!hasNumbers) suggestions.push('Include specific cost breakdowns and calculations');
      suggestions.push('Explain the necessity of each budget item');
      break;
      
    case 'methodology':
      if (!content.includes('approach') && !content.includes('method')) {
        suggestions.push('Clearly describe your methodological approach');
      }
      break;
      
    case 'impact':
      if (!hasNumbers) suggestions.push('Quantify expected outcomes with specific metrics');
      suggestions.push('Address both short-term and long-term impacts');
      break;
  }
  
  return suggestions;
}

function calculateContentConfidence(content: string, settings: GenerationSettings): number {
  let confidence = 0.8; // Base confidence
  
  const wordCount = content.split(/\s+/).length;
  const expectedLength = getExpectedWordCount(settings.length);
  
  // Adjust based on length appropriateness
  const lengthRatio = wordCount / expectedLength;
  if (lengthRatio >= 0.8 && lengthRatio <= 1.2) {
    confidence += 0.1;
  } else if (lengthRatio < 0.5 || lengthRatio > 2) {
    confidence -= 0.2;
  }
  
  // Adjust based on content quality indicators
  if (content.includes('innovative') || content.includes('comprehensive')) confidence += 0.05;
  if (content.includes('TODO') || content.includes('placeholder')) confidence -= 0.3;
  
  return Math.max(0, Math.min(1, confidence));
}

function getExpectedWordCount(length: string): number {
  const counts = {
    brief: 225,     // 150-300
    moderate: 450,  // 300-600
    detailed: 800   // 600-1000
  };
  return counts[length as keyof typeof counts] || 450;
}

async function generateDetailedSuggestions(
  content: string, 
  sectionType: string, 
  grantType?: string, 
  fundingBody?: string
): Promise<string[]> {
  // This could be enhanced with AI-powered suggestion generation
  const suggestions = await generateContentSuggestions(content, sectionType);
  
  // Add grant-specific suggestions
  if (grantType === 'research') {
    suggestions.push('Consider emphasizing research methodology and expected publications');
  }
  
  if (fundingBody === 'European Commission') {
    suggestions.push('Highlight European collaboration and impact');
  }
  
  return suggestions;
}

function calculateReadabilityScore(content: string): number {
  // Simple readability calculation (Flesch Reading Ease approximation)
  const sentences = content.split(/[.!?]+/).length;
  const words = content.split(/\s+/).length;
  const syllables = estimateSyllables(content);
  
  if (sentences === 0 || words === 0) return 0;
  
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, score));
}

function estimateSyllables(text: string): number {
  // Simple syllable estimation
  return text.toLowerCase().replace(/[^a-z]/g, '').replace(/[aeiou]+/g, 'a').length;
}

function analyzeKeywordDensity(content: string): Record<string, number> {
  const words = content.toLowerCase().match(/\b\w+\b/g) || [];
  const density: Record<string, number> = {};
  
  words.forEach(word => {
    if (word.length > 3) { // Only count meaningful words
      density[word] = (density[word] || 0) + 1;
    }
  });
  
  // Return top 5 most frequent words
  return Object.fromEntries(
    Object.entries(density)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
  );
}

function analyzeContentStructure(content: string): {
  hasParagraphs: boolean;
  hasSubheadings: boolean;
  hasBulletPoints: boolean;
} {
  return {
    hasParagraphs: content.includes('\n\n'),
    hasSubheadings: /^[A-Z][^.]*:/.test(content) || content.includes('#'),
    hasBulletPoints: content.includes('•') || content.includes('-') || content.includes('*')
  };
}

export default router;