'use client';

import React, { useState, useEffect, useRef } from 'react';

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