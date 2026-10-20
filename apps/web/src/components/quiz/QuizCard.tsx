import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QuizWithId } from '../../types/api';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

export interface QuizCardProps {
  quiz: QuizWithId;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  showActions?: boolean;
  className?: string;
}

export function QuizCard({ quiz, onDelete, onDuplicate, showActions = true, className }: QuizCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const difficultyColors = {
    1: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    3: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    4: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    5: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  };

  const difficultyLabels = {
    1: 'Facile',
    2: 'Moyen',
    3: 'Difficile',
    4: 'Expert',
    5: 'Maître',
  };

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Link to={`/quizzes/${quiz.id}/edit`} className="hover:underline">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{quiz.title}</h3>
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {quiz.subject}
            </span>
            {quiz.difficulty && (
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', difficultyColors[quiz.difficulty as keyof typeof difficultyColors])}>
                {difficultyLabels[quiz.difficulty as keyof typeof difficultyLabels]}
              </span>
            )}
          </div>
        </div>
        
        {showActions && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Plus d'options"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                <Link
                  to={`/quizzes/${quiz.id}/play`}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowMenu(false)}
                >
                  Jouer
                </Link>
                <Link
                  to={`/quizzes/${quiz.id}/edit`}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowMenu(false)}
                >
                  Modifier
                </Link>
                {onDuplicate && (
                  <button
                    onClick={() => {
                      onDuplicate(quiz.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Dupliquer
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(quiz.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{quiz.questions?.length || 0} questions</p>

      {quiz.tags && quiz.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quiz.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
