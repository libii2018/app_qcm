import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Quiz, QuizQuestion, SessionQuestion } from '@qcm/shared';
import { useQuiz } from '../../hooks/useQuizzes';
import { useSubmitAnswers } from '../../hooks/useAnswers';
import { QuestionRenderer } from '../../components/quiz/QuestionRenderer';
import { Button } from '../../components/common/Button';
import { Layout } from '../../components/Layout';
import { cn } from '../../utils/cn';

export interface QuizPlayerProps {
  quiz?: Quiz;
  sessionQuestions?: SessionQuestion[];
  sessionId?: string;
  title?: string;
  reasonSummary?: string;
}

export function QuizPlayer() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state as QuizPlayerProps;
  const { data: quiz } = useQuiz(id!);
  
  const submitAnswersMutation = useSubmitAnswers();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [answerTimes, setAnswerTimes] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, boolean>>({});
  const [hintUsed, setHintUsed] = useState<Record<string, boolean>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine questions to use
  const questions: QuizQuestion[] = state.sessionQuestions 
    ? state.sessionQuestions.map(q => ({
        ...q,
        id: q.questionId,
        prompt: q.prompt || [],
        options: q.options || [],
        multiple: q.multiple || false,
        hint: q.hint,
        explanation: q.explanation,
        tags: q.tags || [],
        difficulty: q.difficulty || 1
      }))
    : quiz?.questions || [];

  const isSession = !!state.sessionQuestions;
  const title = state.title || quiz?.title || 'Quiz';

  // Shuffle options if enabled
  const getShuffledOptions = useCallback((q: QuizQuestion) => {
    if (!shuffleAnswers || q.options.length <= 1) return q.options;
    return [...q.options].sort(() => Math.random() - 0.5);
  }, [shuffleAnswers]);

  // Start timer
  useEffect(() => {
    if (currentIndex === 0 && startTime === null) {
      setStartTime(Date.now());
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, startTime]);

  // Set question start time
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];

  const handleSelect = useCallback((questionId: string, optionId: string, isSelected: boolean) => {
    setSelectedOptions(prev => {
      const questionSelections = prev[questionId] || [];
      const newSelections = isSelected
        ? [...questionSelections, optionId]
        : questionSelections.filter(id => id !== optionId);
      
      // Record answer time
      if (questionStartTime) {
        setAnswerTimes(prevTimes => ({
          ...prevTimes,
          [questionId]: Date.now() - questionStartTime
        }));
      }

      return { ...prev, [questionId]: newSelections };
    });
  }, [questionStartTime]);

  const handleHint = useCallback((questionId: string) => {
    setHintUsed(prev => ({ ...prev, [questionId]: true }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  }, [currentIndex, questions.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleSubmitAnswer = useCallback(async () => {
    const question = questions[currentIndex];
    const selections = selectedOptions[question.id] || [];
    
    // Check if answer is correct
    const correctOptionIds = question.options.filter(o => o.correct).map(o => o.id);
    const isCorrect = selections.length > 0 && 
      (question.multiple
        ? selections.length === correctOptionIds.length && 
          correctOptionIds.every(id => selections.includes(id))
        : selections[0] === correctOptionIds[0]);

    setCorrectAnswers(prev => ({ ...prev, [question.id]: isCorrect }));

    // If instant feedback, check answer
    // Otherwise, continue
    if (currentIndex < questions.length - 1) {
      // Small delay to show feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  }, [currentIndex, questions, selectedOptions]);

  const handleEndQuiz = useCallback(async () => {
    // Submit all answers to server
    const submissions = questions.map(q => {
      const selections = selectedOptions[q.id] || [];
      const correctOptionIds = q.options.filter(o => o.correct).map(o => o.id);
      const isCorrect = selections.length > 0 && 
        (q.multiple
          ? selections.length === correctOptionIds.length && 
            correctOptionIds.every(id => selections.includes(id))
          : selections[0] === correctOptionIds[0]);

      return {
        quizId: quiz?.id || state.sessionId || 'unknown',
        questionId: q.id,
        selectedOptionIds: selections,
        correct: isCorrect,
        timeSpent: answerTimes[q.id] || 0,
        timestamp: new Date().toISOString(),
        hintUsed: hintUsed[q.id] || false
      };
    });

    try {
      if (!isSession) {
        await submitAnswersMutation.mutateAsync(submissions);
      }
    } catch (error) {
      console.error('Failed to submit answers:', error);
    }

    navigate('/results', {
      state: {
        quiz: quiz,
        questions,
        selectedOptions,
        correctAnswers,
        answerTimes,
        startTime,
        totalQuestions: questions.length,
        title
      }
    });
  }, [questions, selectedOptions, correctAnswers, answerTimes, startTime, quiz, submitAnswersMutation, isSession, state.sessionId, title, navigate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle keyboard shortcuts for answer selection
    if (e.key >= '1' && e.key <= '9' && currentQuestion) {
      const optionIndex = parseInt(e.key) - 1;
      if (optionIndex < currentQuestion.options.length) {
        const optionId = currentQuestion.options[optionIndex].id;
        const isSelected = selectedOptions[currentQuestion.id]?.includes(optionId) || false;
        handleSelect(currentQuestion.id, optionId, !isSelected);
      }
    }

    // Enter key to submit
    if (e.key === 'Enter' && currentIndex < questions.length) {
      handleSubmitAnswer();
    }

    // Arrow keys for navigation
    if (e.key === 'ArrowRight') {
      handleNext();
    }
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    }
  }, [currentIndex, currentQuestion, selectedOptions, handleSelect, handleSubmitAnswer, handleNext, handlePrevious, questions.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!currentQuestion) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Quiz introuvable
          </h2>
          <Button onClick={() => navigate('/library')}>
            Retour à la bibliothèque
          </Button>
        </div>
      </Layout>
    );
  }

  if (showResults) {
    // This would redirect to results page
    return null;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentIndex + 1} / {questions.length}
              </span>
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 dark:bg-blue-500" 
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Timer */}
          {startTime && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Temps: {formatTime(Date.now() - startTime)}
            </p>
          )}
        </div>

        {/* Question */}
        <div className="mb-6">
          {currentQuestion && (
            <QuestionRenderer
              question={currentQuestion}
              onSelect={(optionId, isSelected) => {
                if (currentQuestion) {
                  handleSelect(currentQuestion.id, optionId, isSelected);
                }
              }}
              selectedOptions={selectedOptions[currentQuestion.id] || []}
              showCorrect={false}
              showExplanation={false}
            />
          )}
        </div>

        {/* Hint button */}
        {currentQuestion?.hint && !hintUsed[currentQuestion.id] && (
          <Button
            variant="outline"
            onClick={() => handleHint(currentQuestion.id)}
            className="mb-6"
          >
            Montrer l'indice
          </Button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Précédent
          </Button>
          
          {currentIndex < questions.length - 1 ? (
            <Button 
              onClick={handleSubmitAnswer}
              disabled={!selectedOptions[currentQuestion.id] || selectedOptions[currentQuestion.id]?.length === 0}
            >
              Répondre
            </Button>
          ) : (
            <Button 
              onClick={handleSubmitAnswer}
              disabled={!selectedOptions[currentQuestion.id] || selectedOptions[currentQuestion.id]?.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Terminer
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex >= questions.length - 1}
          >
            Suivant
          </Button>
        </div>

        {/* Help */}
        <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Raccourcis clavier: 1-9 pour sélectionner, Entrée pour valider, ← → pour naviguer
          </p>
        </div>
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
