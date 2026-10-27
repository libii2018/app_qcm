import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodaySession } from '../../hooks/useToday';
import { useSettings } from '../../hooks/useSettings';
import { Button } from '../../components/common/Button';
import { QuizCard } from '../../components/quiz/QuizCard';
import { Layout } from '../../components/Layout';
import { cn } from '../../utils/cn';

export function Today() {
  const navigate = useNavigate();
  const { data: session, isLoading, error, refetch } = useTodaySession();
  const { data: settings } = useSettings();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleStartSession = () => {
    navigate('/play', { 
      state: { 
        sessionQuestions: session?.questions || [],
        sessionId: `today-${Date.now()}`,
        title: 'Session du jour',
        reasonSummary: session?.reasonSummary || ''
      } 
    });
  };

  if (isLoading && !session) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Erreur: {error.message}</p>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">
              Réessayer
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Aujourd'hui</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {session?.questions.length || 0} questions à réviser
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} isLoading={isRefreshing}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">À réviser</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{session?.questions.length || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Objectif quotidien</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {settings?.dailyGoal || 20}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Streak</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {settings?.streak || 0} jours
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main CTA */}
        {session && session.questions.length > 0 ? (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 text-white">
            <h2 className="text-xl font-bold mb-2">Session recommandée</h2>
            <p className="mb-4">{session.reasonSummary}</p>
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={handleStartSession}
            >
              Commencer la session ({session.questions.length} questions)
            </Button>
          </div>
        ) : (
          <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-6 mb-8 text-center">
            <svg className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              Tout est à jour !
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-4">
              Aucune question à réviser aujourd'hui. Continuez demain !
            </p>
            <Button variant="outline" onClick={() => navigate('/library')}>
              Explorer les quiz
            </Button>
          </div>
        )}

        {/* Session preview */}
        {session && session.questions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Aperçu des questions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {session.questions.slice(0, 3).map((q, index) => (
                <div 
                  key={q.question.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{q.question.prompt.find(p => p.type === 'text')?.value || 'Question'}</p>
                      {q.reason && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{q.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {session.questions.length > 3 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  + {session.questions.length - 3} autres questions
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick access to library */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Accès rapide
          </h3>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate('/library')}>
              Voir tous les quiz
            </Button>
            <Button variant="outline" onClick={() => navigate('/stats')}>
              Statistiques
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
