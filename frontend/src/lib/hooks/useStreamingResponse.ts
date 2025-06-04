'use client';

import { useState, useCallback, useRef } from 'react';

interface StreamingState {
  isStreaming: boolean;
  streamedText: string;
  isComplete: boolean;
  error: string | null;
  abortController: AbortController | null;
}

interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
  onMetadata?: (metadata: any) => void;
}

export const useStreamingResponse = () => {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    streamedText: '',
    isComplete: false,
    error: null,
    abortController: null
  });

  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      streamedText: '',
      isComplete: false,
      error: null,
      abortController: null
    });
  }, []);

  const startStream = useCallback(async (
    url: string,
    requestBody: any,
    options: StreamingOptions = {}
  ) => {
    // Cancel any existing stream
    if (state.abortController) {
      state.abortController.abort();
    }

    const abortController = new AbortController();
    setState(prev => ({
      ...prev,
      isStreaming: true,
      streamedText: '',
      isComplete: false,
      error: null,
      abortController
    }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                accumulatedText += data.text;
                setState(prev => ({
                  ...prev,
                  streamedText: accumulatedText
                }));
                options.onChunk?.(data.text);
              } else if (data.type === 'metadata') {
                options.onMetadata?.(data);
              } else if (data.type === 'complete') {
                setState(prev => ({
                  ...prev,
                  isComplete: true,
                  isStreaming: false,
                  abortController: null
                }));
                options.onComplete?.(accumulatedText);
                return accumulatedText;
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Streaming error');
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
      
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage,
        abortController: null
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [state.abortController]);

  const cancelStream = useCallback(() => {
    if (state.abortController) {
      state.abortController.abort();
      setState(prev => ({
        ...prev,
        isStreaming: false,
        abortController: null
      }));
    }
  }, [state.abortController]);

  return {
    // State
    isStreaming: state.isStreaming,
    streamedText: state.streamedText,
    isComplete: state.isComplete,
    error: state.error,
    canCancel: !!state.abortController,
    
    // Actions
    startStream,
    cancelStream,
    reset
  };
};