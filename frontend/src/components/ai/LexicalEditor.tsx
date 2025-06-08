'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Lexical components to avoid SSR hydration issues
const LexicalComposer = dynamic(
  () => import('@lexical/react/LexicalComposer').then(mod => mod.LexicalComposer),
  { ssr: false }
);
const RichTextPlugin = dynamic(
  () => import('@lexical/react/LexicalRichTextPlugin').then(mod => mod.RichTextPlugin),
  { ssr: false }
);
const ContentEditable = dynamic(
  () => import('@lexical/react/LexicalContentEditable').then(mod => mod.ContentEditable),
  { ssr: false }
);
const HistoryPlugin = dynamic(
  () => import('@lexical/react/LexicalHistoryPlugin').then(mod => mod.HistoryPlugin),
  { ssr: false }
);
const OnChangePlugin = dynamic(
  () => import('@lexical/react/LexicalOnChangePlugin').then(mod => mod.OnChangePlugin),
  { ssr: false }
);
const LexicalErrorBoundary = dynamic(
  () => import('@lexical/react/LexicalErrorBoundary').then(mod => mod.default),
  { ssr: false }
);

interface LexicalEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export default function LexicalEditor({
  content,
  onContentChange,
  placeholder = "Start writing...",
  className = "",
  minHeight = "200px"
}: LexicalEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // For now, use a simple textarea to ensure content updates work properly
  // TODO: Replace with Lexical when content update issues are resolved
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(e.target.value);
  };

  if (!isClient) {
    return (
      <div 
        className={`p-4 border border-gray-200 rounded-md ${className}`}
        style={{ minHeight }}
      >
        <div className="text-gray-500">{placeholder}</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        onChange={handleChange}
        value={content}
        placeholder={placeholder}
        className={`w-full p-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 ${className}`}
        style={{ minHeight }}
      />
    </div>
  );
}