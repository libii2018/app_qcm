import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QuizQuestion } from '../../types/api';
import { QuestionRenderer } from '../../components/quiz/QuestionRenderer';
import { Button } from '../../components/common/Button';
import { Layout } from '../../components/Layout';
import { QuizCard } from '../../components/quiz/QuizCard';
import { cn } from '../../utils/cn';

export function QuizResults() {
  const navigate = useNavigate();
  const location = useLocation();

  const resultsState = (location.state || {}) as {
    quiz?: unknown;
    questions?: QuizQuestion[];
    selectedOptions?: Record<string, string[]>;
    correctAnswers?: Record<string, boolean>;
    answerTimes?: Record<string, number>;
    startTime?: number;
    totalQuestions?: number;
    title?: string;
  };
  const {
    questions = [],
    selectedOptions = {},
    correctAnswers = {},
    answerTimes = {},
    startTime,
    totalQuestions = 0,
    title
  } = resultsState;

  const [activeIndex, setActiveIndex] = useState(0);

  // Calculate statistics
  const totalCorrect = Object.values(correctAnswers).filter(Boolean).length;
  const score = Math.round((totalCorrect / totalQuestions) * 100);
  const totalTime = startTime ? Date.now() - startTime : Object.values(answerTimes).reduce((a, b) => a + b, 0);
  const avgTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;

  // Group by correct/incorrect
  const correctQuestions = questions.filter(q => correctAnswers[q.id]);
  const incorrectQuestions = questions.filter(q => !correctAnswers[q.id]);

  if (!questions || questions.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Aucun résultat à afficher
          </h2>
          <Button onClick={() => navigate('/library')}>
            Retour à la bibliothèque
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Summary */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title || 'Résultats du Quiz'}</h1>
          
          <div className="flex items-center justify-center gap-4 my-6">
            <div className={cn(
              'px-8 py-4 rounded-2xl',
              score >= 70 ? 'bg-green-600' : score >= 40 ? 'bg-yellow-600' : 'bg-red-600'
            )}>
              <p className="text-5xl font-bold text-white">{score}%</p>
              <p className="text-white/80 text-sm">{totalCorrect} / {totalQuestions} bonnes réponses</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatTime(totalTime)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Temps total</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatTime(avgTime)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Temps moyen / question</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button onClick={() => navigate('/library')} variant="outline">
              Retour à la bibliothèque
            </Button>
            <Button onClick={() => navigate('/play', { state: { sessionQuestions: questions, title } })}>
              Rejouer
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveIndex(0)}
            className={cn(
              'px-4 py-2 text-sm font-medium',
              activeIndex === 0 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            Toutes les questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveIndex(1)}
            className={cn(
              'px-4 py-2 text-sm font-medium',
              activeIndex === 1 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            Correctes ({correctQuestions.length})
          </button>
          <button
            onClick={() => setActiveIndex(2)}
            className={cn(
              'px-4 py-2 text-sm font-medium',
              activeIndex === 2 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            Incorrectes ({incorrectQuestions.length})
          </button>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {(() => {
            let filteredQuestions = questions;
            if (activeIndex === 1) filteredQuestions = correctQuestions;
            if (activeIndex === 2) filteredQuestions = incorrectQuestions;

            return filteredQuestions.map((q: QuizQuestion, index: number) => {
              const isCorrect = correctAnswers[q.id];
              const selected = selectedOptions[q.id] || [];
              const time = answerTimes[q.id] || 0;

              return (
                <div
                  key={q.id}
                  className={cn(
                    'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-2',
                    isCorrect 
                      ? 'border-green-500' 
                      : 'border-red-500'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Question {questions.indexOf(q) + 1}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span 
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          isCorrect 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                        )}
                      >
                        {isCorrect ? 'Correcte' : 'Incorrecte'}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Temps: {formatTime(time)}
                      </span>
                    </div>
                  </div>

                  <QuestionRenderer
                    question={q}
                    selectedOptions={selected}
                    showCorrect={true}
                    showExplanation={true}
                  />

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {incorrectQuestions.length === 0 && activeIndex === 2 && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">Aucune question incorrecte</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
