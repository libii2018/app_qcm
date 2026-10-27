import { Quiz, Question, AnswerEvent, ReviewState, ReviewQueueItem } from '@qcm/shared';

// Aliases vers les types actuels du package partagé
export type QuizQuestion = Question;
export type SessionQuestion = ReviewQueueItem;

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// Auth Types
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Quiz Types
export interface QuizWithId extends Omit<Quiz, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
}

export interface QuizListResponse {
  quizzes: QuizWithId[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuizFilter {
  subject?: string;
  tags?: string[];
  difficulty?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

// Media Types
export interface MediaUpload {
  file: File;
  altText?: string;
}

export interface MediaResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  altText?: string;
  createdAt: string;
}

// Answer Types
export interface AnswerSubmission {
  quizId: string;
  questionId: string;
  selectedOptionIds: string[];
  correct: boolean;
  timeSpent: number;
  timestamp: string;
  hintUsed?: boolean;
}

export interface AnswerResponse extends AnswerEvent {
  id: string;
}

// Stats Types
export interface StatsFilter {
  from?: string;
  to?: string;
  subject?: string;
  tag?: string;
}

// Statistiques agrégées côté client depuis /api/stats/*
export interface DailyStatsEntry {
  date: string;
  totalAnswers: number;
  correctAnswers: number;
  successRate: number; // 0-1
  averageTime: number; // ms
}

export interface FailedQuestionEntry {
  questionId: string;
  questionText: string;
  quizTitle: string;
  failureRate: number; // 0-1
  totalAttempts: number;
}

export interface QuizStats {
  totalAnswers: number;
  correctAnswers: number;
  successRate: number; // 0-1
  bySubject: Record<string, { successRate: number; totalAnswers: number }>;
  byTag: Record<string, { successRate: number; totalAnswers: number }>;
  byDifficulty: Record<string, { successRate: number; totalAnswers: number }>;
  dailyStats: DailyStatsEntry[];
  mostFailedQuestions: FailedQuestionEntry[];
  reviewDistribution: { new: number; learning: number; mastered: number };
  streak: number;
  forecast: { date: string; count: number }[];
}

// Today Types
export interface TodaySession {
  questions: SessionQuestion[];
  totalCount: number;
  reasonSummary: string;
}

// Backup Types
export interface BackupResponse {
  url: string;
  size: number;
  createdAt: string;
}

// Settings Types
export interface UserSettings {
  dailyGoal: number;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  playSound: boolean;
  maxMediaSize: {
    image: number;
    audio: number;
    video: number;
  };
  streak?: number;
}

// Sync Types
export interface SyncQueueItem {
  id: string;
  type: 'answer' | 'quiz' | 'media';
  data: any;
  timestamp: number;
  retryCount: number;
}

// Full App State
export interface AppState {
  user: User | null;
  quizzes: QuizWithId[];
  currentQuiz: QuizWithId | null;
  currentQuestionIndex: number;
  answers: Record<string, string[]>;
  stats: QuizStats;
  reviewStates: ReviewState[];
  settings: UserSettings;
  isOnline: boolean;
  syncQueue: SyncQueueItem[];
}
