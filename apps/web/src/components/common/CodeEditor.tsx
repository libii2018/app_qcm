import { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';
import { Question } from '@qcm/shared';
import { validateQuizJson } from '@qcm/shared';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  mode?: 'quiz' | 'question';
  className?: string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, mode = 'quiz', className, readOnly = false }: CodeEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [lineError, setLineError] = useState<number | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Validate on change
    const debounceTimer = setTimeout(() => {
      try {
        const parsed = JSON.parse(value);
        if (mode === 'quiz') {
          const result = validateQuizJson(parsed);
          if (!result.success) {
            throw new Error(result.errors.join('; '));
          }
        } else if (mode === 'question') {
          // For single question, wrap it in a quiz structure for validation
          const wrapper = { 
            schemaVersion: 1, 
            id: 'temp', 
            title: 'Temp', 
            subject: 'Temp',
            difficulty: 1,
            tags: [],
            questions: [parsed as unknown as Question] 
          };
          const result = validateQuizJson(wrapper);
          if (!result.success) {
            throw new Error(result.errors.join('; '));
          }
        }
        setError(null);
        setLineError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
          // Try to extract line number from error message
          const lineMatch = err.message.match(/line (\d+)/);
          if (lineMatch) {
            setLineError(parseInt(lineMatch[1], 10));
          }
        }
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [value, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch {
      // Invalid JSON, ignore
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Auto-indent on new line
    if (e.key === 'Enter') {
      const cursorPos = editorRef.current?.selectionStart;
      const text = editorRef.current?.value || '';
      if (cursorPos !== undefined) {
        const beforeCursor = text.substring(0, cursorPos);
        const line = beforeCursor.split('\n').pop() || '';
        const indent = line.match(/^\s*/)?.[0] || '';
        
        // Insert newline and same indent
        e.preventDefault();
        const newText = text.substring(0, cursorPos) + '\n' + indent + text.substring(cursorPos);
        onChange(newText);
        setTimeout(() => {
          if (editorRef.current) {
            const newPos = cursorPos + indent.length + 1;
            editorRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    }

    // Tab for indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const cursorPos = editorRef.current?.selectionStart;
      const text = editorRef.current?.value || '';
      if (cursorPos !== undefined) {
        const newText = text.substring(0, cursorPos) + '  ' + text.substring(cursorPos);
        onChange(newText);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.setSelectionRange(cursorPos + 2, cursorPos + 2);
          }
        }, 0);
      }
    }
  };

  // Syntax highlighting
  const getHighlightedText = () => {
    try {
      const parsed = JSON.parse(value);
      return syntaxHighlight(value);
    } catch {
      return value;
    }
  };

  return (
    <div className={cn('relative bg-gray-100 dark:bg-gray-800 rounded-lg', className)}>
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {mode === 'quiz' ? 'JSON du Quiz' : 'JSON de la Question'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={formatJson}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            title="Formater le JSON"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={copyToClipboard}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            title="Copier"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="relative">
        <textarea
          ref={editorRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          className={cn(
            'w-full h-64 p-3 text-sm font-mono bg-transparent text-gray-900 dark:text-gray-100 resize-none border-none outline-none',
            readOnly ? 'cursor-default' : 'cursor-text'
          )}
          spellCheck={false}
        />
        
        {/* Syntax highlighted overlay */}
        <pre
          className="absolute top-0 left-0 w-full h-full p-3 text-sm font-mono pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
          style={{ 
            color: 'transparent',
            backgroundColor: 'transparent',
            tabSize: 2
          }}
        >
          {getHighlightedText()}
        </pre>
      </div>
      
      {error && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Erreur ligne {lineError}: {error}
          </p>
        </div>
      )}
    </div>
  );
}

// Simple syntax highlighting for JSON
function syntaxHighlight(json: string): string {
  // Escape HTML
  let html = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Syntax highlighting
  html = html.replace(/("[^\"]*"(\s*:)?)/g, '<span class="text-green-600 dark:text-green-400">$1</span>');
  html = html.replace(/(\btrue\b|\bfalse\b)/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>');
  html = html.replace(/(\bnull\b)/g, '<span class="text-gray-500 dark:text-gray-400">$1</span>');
  html = html.replace(/(\b\d+(\.\d+)?\b)/g, '<span class="text-purple-600 dark:text-purple-400">$1</span>');
  html = html.replace(/(\{|\}|\[|\]|,)/g, '<span class="text-gray-500 dark:text-gray-400">$1</span>');
  html = html.replace(/(\s+)/g, ' ');

  return html;
}

// Add styles for syntax highlighting
const style = document.createElement('style');
style.textContent = `
  .json-key { color: #3b82f6; }
  .json-string { color: #10b981; }
  .json-number { color: #8b5cf6; }
  .json-boolean { color: #f59e0b; }
  .json-null { color: #6b7280; }
`;
document.head.appendChild(style);
