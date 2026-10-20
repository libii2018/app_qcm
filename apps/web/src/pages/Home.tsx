import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTodaySession } from '../hooks/useToday';
import { useQuizzes } from '../hooks/useQuizzes';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { QuizCard } from '../components/quiz/QuizCard';
import { Layout } from '../components/Layout';
import { cn } from '../utils/cn';
import { Logo } from '../components/Logo';

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: session, isLoading: sessionLoading } = useTodaySession();
  const { data: quizzes, isLoading: quizzesLoading } = useQuizzes({ pageSize: 5 });

  // Remove AuthGuard from Home to avoid redirect loop
  // This is a public-ish page that shows different content based on auth
  
  if (sessionLoading || quizzesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Bonjour {user ? user.email.split('@')[0] : 'visiteur'} !
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Prêt à apprendre aujourd'hui ?
            </p>
          </div>
          
          <Button onClick={() => navigate('/quizzes/new/edit')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Quiz
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Objectif quotidien</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">20</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quiz créés</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{quizzes?.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dernière activité</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">Aujourd'hui</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/today')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white hover:from-blue-700 hover:to-purple-700 transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">Session du jour</h3>
                <p className="text-blue-100">{session?.questions.length || 0} questions à réviser</p>
              </div>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => navigate('/library')}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Bibliothèque</h3>
                <p className="text-gray-500 dark:text-gray-400">{quizzes?.total || 0} quiz disponibles</p>
              </div>
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M12 4v16" />
              </svg>
            </div>
          </button>
        </div>

        {/* Recent Quizzes */}
        {quizzes && quizzes.quizzes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Quiz récents
              </h2>
              <Button variant="outline" onClick={() => navigate('/library')}>
                Voir tous
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.quizzes.slice(0, 3).map((quiz) => (
                <QuizCard 
                  key={quiz.id} 
                  quiz={quiz} 
                  showActions={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* CTA for unauthenticated users */}
        {!user && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white text-center">
            <h3 className="text-xl font-bold mb-2">
              Créer un compte pour sauvegarder vos progrès
            </h3>
            <p className="text-blue-100 mb-4">
              Accédez à toutes les fonctionnalités d'apprentissage
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Se connecter
              </Button>
              <Button onClick={() => navigate('/register')}>
                S'inscrire
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
