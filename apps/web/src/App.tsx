import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';
import { ThemeProvider } from './contexts/ThemeContext';
import { SyncProvider } from './contexts/SyncContext';
import { AuthProvider } from './contexts/AuthContext';

// Import pages
import { Home } from './pages/Home';
import { Today } from './pages/Today/Today';
import { Library } from './pages/Library/Library';
import { QuizEditor } from './pages/QuizEditor/QuizEditor';
import { QuizPlayer } from './pages/QuizPlayer/QuizPlayer';
import { QuizResults } from './pages/QuizResults/QuizResults';
import { Stats } from './pages/Stats/Stats';
import { Settings } from './pages/Settings/Settings';
import { Backup } from './pages/Backup/Backup';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Initialiser la base de données IndexedDB
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const location = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SyncProvider>
            <Routes>
              {/* Routes publiques */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Routes protégées */}
              <Route element={<AuthGuard><Layout /></AuthGuard>}>
                <Route path="/" element={<Home />} />
                <Route path="/today" element={<Today />} />
                <Route path="/library" element={<Library />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/backup" element={<Backup />} />
                <Route path="/quizzes/new/edit" element={<QuizEditor />} />
                <Route path="/quizzes/:id/edit" element={<QuizEditor />} />
                <Route path="/quizzes/:id/play" element={<QuizPlayer />} />
                <Route path="/play" element={<QuizPlayer />} />
                <Route path="/results" element={<QuizResults />} />
              </Route>

              {/* Redirections */}
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<Navigate to="/stats" replace />} />

              {/* 404 */}
              <Route path="*" element={<Home />} />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
