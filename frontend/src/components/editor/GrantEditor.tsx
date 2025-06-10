'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { $getRoot, $getSelection, EditorState, LexicalEditor } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { 
  $getSelection as lexicalGetSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  REDO_COMMAND,
  UNDO_COMMAND,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND
} from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TRANSFORMERS } from '@lexical/markdown';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAIEditorStore } from '../../lib/store/aiEditorStore';
import { aiEditorService } from '../../lib/api/aiEditorService';

interface GrantEditorProps {
  applicationId: string;
  grantId?: string;
  section?: string;
  initialContent?: string;
  onContentChange?: (content: string, editorState: EditorState) => void;
  readOnly?: boolean;
  placeholder?: string;
}

// Custom AI Suggestion Plugin
function AISuggestionPlugin({ applicationId, grantId, section }: { 
  applicationId: string; 
  grantId?: string; 
  section?: string; 
}) {
  const [editor] = useLexicalComposerContext();
  const { suggestions, isLoading, addSuggestion } = useAIEditorStore();

  const handleSuggestionRequest = useCallback(async () => {
    if (!editor || isLoading) return;

    const editorState = editor.getEditorState();
    let content = '';
    let selection = '';

    editorState.read(() => {
      const root = $getRoot();
      content = root.getTextContent();
      
      const currentSelection = lexicalGetSelection();
      if ($isRangeSelection(currentSelection)) {
        selection = currentSelection.getTextContent();
      }
    });

    try {
      const context = {
        applicationId,
        grantId,
        section,
        content,
        selection,
        cursorPosition: selection ? content.indexOf(selection) : content.length
      };

      const suggestion = await aiEditorService.generateSuggestion(context);
      if (suggestion) {
        addSuggestion(suggestion);
      }
    } catch (error) {
      console.error('Error generating AI suggestion:', error);
    }
  }, [editor, applicationId, grantId, section, isLoading, addSuggestion]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          // Debounced suggestion generation on selection change
          const timeoutId = setTimeout(handleSuggestionRequest, 1000);
          return () => clearTimeout(timeoutId);
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, handleSuggestionRequest]);

  return null;
}

// Auto-save Plugin
function AutoSavePlugin({ 
  applicationId, 
  section, 
  onContentChange 
}: { 
  applicationId: string; 
  section?: string; 
  onContentChange?: (content: string, editorState: EditorState) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const { setContent, setSaveStatus } = useAIEditorStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      const htmlContent = $generateHtmlFromNodes(editor, null);
      const textContent = $getRoot().getTextContent();
      
      setContent(htmlContent);
      onContentChange?.(htmlContent, editorState);

      // Auto-save with debouncing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus('saving');
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await aiEditorService.saveContent(applicationId, section || 'main', htmlContent);
          setSaveStatus('saved');
        } catch (error) {
          console.error('Auto-save failed:', error);
          setSaveStatus('error');
        }
      }, 2000);
    });
  }, [editor, applicationId, section, setContent, setSaveStatus, onContentChange]);

  return <OnChangePlugin onChange={handleChange} />;
}

// Toolbar Component
function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          const selection = lexicalGetSelection();
          if ($isRangeSelection(selection)) {
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor]);

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50">
      <Button
        variant={canUndo ? "outline" : "ghost"}
        size="sm"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
        className="h-8 w-8 p-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </Button>

      <Button
        variant={canRedo ? "outline" : "ghost"}
        size="sm"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
        className="h-8 w-8 p-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6" />
        </svg>
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        variant={isBold ? "default" : "ghost"}
        size="sm"
        onClick={() => formatText('bold')}
        className="h-8 w-8 p-0 font-bold"
      >
        B
      </Button>

      <Button
        variant={isItalic ? "default" : "ghost"}
        size="sm"
        onClick={() => formatText('italic')}
        className="h-8 w-8 p-0 italic"
      >
        I
      </Button>

      <Button
        variant={isUnderline ? "default" : "ghost"}
        size="sm"
        onClick={() => formatText('underline')}
        className="h-8 w-8 p-0 underline"
      >
        U
      </Button>
    </div>
  );
}

// Save Status Indicator
function SaveStatus() {
  const { saveStatus } = useAIEditorStore();

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (saveStatus) {
      case 'saving':
        return 'text-blue-600';
      case 'saved':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (!saveStatus) return null;

  return (
    <div className={`text-xs ${getStatusColor()} flex items-center gap-1 px-2 py-1`}>
      {saveStatus === 'saving' && (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
      )}
      {saveStatus === 'saved' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {saveStatus === 'error' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{getStatusText()}</span>
    </div>
  );
}

// Main Editor Configuration
const theme = {
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
  paragraph: 'mb-2',
  heading: {
    h1: 'text-2xl font-bold mb-4',
    h2: 'text-xl font-bold mb-3',
    h3: 'text-lg font-bold mb-2',
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal list-inside mb-2',
    ul: 'list-disc list-inside mb-2',
    listitem: 'mb-1',
  },
  quote: 'border-l-4 border-gray-300 pl-4 italic text-gray-700 mb-4',
  code: 'bg-gray-100 rounded px-2 py-1 font-mono text-sm',
  codeHighlight: {
    atrule: 'text-purple-600',
    attr: 'text-blue-600',
    boolean: 'text-red-600',
    builtin: 'text-purple-600',
    cdata: 'text-gray-600',
    char: 'text-green-600',
    class: 'text-blue-600',
    'class-name': 'text-blue-600',
    comment: 'text-gray-500',
    constant: 'text-red-600',
    deleted: 'text-red-600',
    doctype: 'text-gray-600',
    entity: 'text-orange-600',
    function: 'text-purple-600',
    important: 'text-red-600',
    inserted: 'text-green-600',
    keyword: 'text-blue-600',
    namespace: 'text-blue-600',
    number: 'text-red-600',
    operator: 'text-gray-600',
    prolog: 'text-gray-600',
    property: 'text-blue-600',
    punctuation: 'text-gray-600',
    regex: 'text-green-600',
    selector: 'text-green-600',
    string: 'text-green-600',
    symbol: 'text-red-600',
    tag: 'text-blue-600',
    url: 'text-blue-600',
    variable: 'text-orange-600',
  },
};

const editorNodes = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
];

export default function GrantEditor({
  applicationId,
  grantId,
  section = 'main',
  initialContent = '',
  onContentChange,
  readOnly = false,
  placeholder = 'Start writing your grant application...'
}: GrantEditorProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const initialConfig = {
    namespace: 'GrantEditor',
    theme,
    nodes: editorNodes,
    onError: (error: Error) => {
      console.error('Lexical editor error:', error);
    },
    editable: !readOnly,
  };

  // Load initial content
  useEffect(() => {
    const loadContent = async () => {
      if (initialContent) {
        setIsLoaded(true);
        return;
      }

      try {
        const savedContent = await aiEditorService.getContent(applicationId, section);
        if (savedContent) {
          // Set initial content in the editor
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load content:', error);
        setIsLoaded(true);
      }
    };

    loadContent();
  }, [applicationId, section, initialContent]);

  const handleEditorError = (error: Error) => {
    console.error('Editor error:', error);
  };

  if (!isLoaded) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-200">
            <Toolbar />
            <SaveStatus />
          </div>

          {/* Editor Content */}
          <div className="flex-1 relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable 
                  className="resize-none text-base p-4 h-full outline-none"
                  style={{ minHeight: '400px' }}
                />
              }
              placeholder={
                <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                  {placeholder}
                </div>
              }
              ErrorBoundary={({ children }) => {
                return (
                  <div className="p-4 text-red-600">
                    <p>Something went wrong with the editor.</p>
                    {children}
                  </div>
                );
              }}
            />

            {/* Plugins */}
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            
            {/* Custom AI Plugins */}
            <AISuggestionPlugin 
              applicationId={applicationId}
              grantId={grantId}
              section={section}
            />
            <AutoSavePlugin 
              applicationId={applicationId}
              section={section}
              onContentChange={onContentChange}
            />
          </div>
        </div>
      </LexicalComposer>
    </Card>
  );
}