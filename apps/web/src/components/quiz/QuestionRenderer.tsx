import { QuizQuestion, MediaContent, Option } from '@qcm/shared';
import { useState } from 'react';
import { MediaPlayer } from '../common/MediaPlayer';
import { cn } from '../../utils/cn';

export interface QuestionRendererProps {
  question: QuizQuestion;
  onSelect?: (optionId: string, isSelected: boolean) => void;
  selectedOptions?: string[];
  showCorrect?: boolean;
  showExplanation?: boolean;
  className?: string;
}

export function QuestionRenderer({
  question,
  onSelect,
  selectedOptions = [],
  showCorrect = false,
  showExplanation = false,
  className,
}: QuestionRendererProps) {
  const [showHint, setShowHint] = useState(false);

  const handleOptionClick = (optionId: string) => {
    if (onSelect) {
      const isSelected = selectedOptions.includes(optionId);
      onSelect(optionId, !isSelected);
    }
  };

  const renderContent = (content: MediaContent[], className?: string) => {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {content.map((item, index) => (
          <div key={index}>
            {item.type === 'text' && (
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeMarkdown(item.value) 
                }}
              />
            )}
            {['image', 'audio', 'video'].includes(item.type) && (
              <MediaPlayer media={item} className="w-full" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const isOptionSelected = (optionId: string) => selectedOptions.includes(optionId);
  const isOptionCorrect = (option: Option) => option.correct;
  const isOptionWrong = (option: Option) => !option.correct && isOptionSelected(option.id);
  const isCorrectSelected = (option: Option) => option.correct && isOptionSelected(option.id);

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700', className)}>
      {/* Question prompt */}
      <div className="mb-6">
        {renderContent(question.prompt)}
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option) => {
          const selected = isOptionSelected(option.id);
          const correct = isOptionCorrect(option);
          const wrong = isOptionWrong(option);
          const correctAndSelected = isCorrectSelected(option);

          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              disabled={showCorrect}
              className={cn(
                'w-full p-4 rounded-lg border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2',
                !showCorrect ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'cursor-default',
                selected && !showCorrect ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : '',
                showCorrect && correctAndSelected ? 'border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-500' : '',
                showCorrect && correct && !selected ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20' : '',
                showCorrect && wrong ? 'border-red-500 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-500' : '',
                !selected && !showCorrect ? 'border-gray-300 dark:border-gray-600'
              )}
              aria-pressed={selected}
              aria-label={`Option ${option.id}: ${option.content[0]?.value || 'Contenu média'}`}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium',
                  selected && !showCorrect ? 'bg-blue-600 text-white' : '',
                  showCorrect && correctAndSelected ? 'bg-green-600 text-white' : '',
                  showCorrect && correct && !selected ? 'bg-green-600 text-white opacity-50' : '',
                  showCorrect && wrong ? 'bg-red-600 text-white' : '',
                  !selected && !showCorrect ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                )}>
                  {correct ? '✓' : wrong ? '✗' : selected ? '•' : option.id.toUpperCase()}
                </div>
                <div className="flex-1">
                  {renderContent(option.content)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hint */}
      {question.hint && !showHint && !showCorrect && (
        <button
          onClick={() => setShowHint(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
        >
          Montrer l'indice
        </button>
      )}
      
      {question.hint && (showHint || showCorrect) && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Indice:</strong> {question.hint}</p>
        </div>
      )}

      {/* Explanation */}
      {showExplanation && question.explanation && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200"><strong>Explication:</strong> {question.explanation}</p>
        </div>
      )}
    </div>
  );
}

// Simple markdown sanitization (basic support)
function sanitizeMarkdown(text: string): string {
  return text
    .replace(/\*(\*[^*]*\*)/g, '<em>$1</em>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/#\s+(.+)/g, '<h3>$1</h3>')
    .replace(/##\s+(.+)/g, '<h4>$1</h4>')
    .replace(/\-(.+)/g, '<li>$1</li>')
    .replace(/\d\.\s+(.+)/g, '<li>$1</li>');
}
