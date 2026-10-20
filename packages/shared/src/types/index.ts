// Types partagés entre frontend et backend

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  streak: number;
  dailyGoal: number;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  subject: string;
  description?: string;
  tags: string[];
  difficulty: number;
  jsonContent: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface Media {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: Date;
}

export interface ReviewState {
  id: string;
  userId: string;
  questionId: string;
  quizId?: string;
  nextReviewDate: Date;
  interval: number; // jours
  easeFactor: number;
  repetitionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnswerEvent {
  id: string;
  userId: string;
  quizId?: string;
  questionId: string;
  correct: boolean;
  responseTime: number; // ms
  usedHint: boolean;
  timestamp: Date;
  tags: string[];
  subject?: string;
}

// Types pour le format JSON des QCM
export type MediaType = 'text' | 'image' | 'audio' | 'video';

export interface MediaContent {
  type: MediaType;
  value?: string; // Pour text
  src?: string; // Pour image, audio, video (URL ou chemin relatif)
  alt?: string; // Texte alternatif (obligatoire pour image)
  duration?: number; // Durée en secondes (pour audio/video)
  poster?: string; // Poster pour vidéo
}

export interface Option {
  id: string;
  content: MediaContent[];
  correct: boolean;
}

export interface Question {
  id: string;
  prompt: MediaContent[];
  options: Option[];
  multiple: boolean;
  hint?: string;
  explanation?: string;
  tags: string[];
  difficulty: number;
  metadata?: Record<string, unknown>;
}

export interface QuizJson {
  schemaVersion: number;
  id: string;
  title: string;
  subject: string;
  description?: string;
  tags: string[];
  difficulty: number;
  questions: Question[];
  metadata?: Record<string, unknown>;
}

// Types pour l'API
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface FilterParams {
  subject?: string;
  tag?: string;
  difficulty?: number;
  search?: string;
}

export interface QuizFilterParams extends PaginationParams, FilterParams {}

// Types pour les statistiques
export interface StatsFilterParams extends FilterParams {
  from?: Date;
  to?: Date;
}

export interface PerformanceStats {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  successRate: number;
  avgResponseTime: number;
  totalResponseTime: number;
}

export interface TagStats {
  tag: string;
  totalQuestions: number;
  correctCount: number;
  successRate: number;
}

export interface SubjectStats {
  subject: string;
  totalQuestions: number;
  correctCount: number;
  successRate: number;
}

export interface DailyStats {
  date: string;
  questionsAnswered: number;
  correctCount: number;
  successRate: number;
  responseTime: number;
}

export interface QuestionStatus {
  questionId: string;
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
  lastAttemptDate?: Date;
  nextReviewDate?: Date;
}

export interface ReviewQueueItem {
  question: Question;
  quizId: string;
  quizTitle: string;
  subject: string;
  tags: string[];
  reason: string;
  dueDate: Date;
}

// Types pour l'apprentissage
export interface LearningStats {
  newQuestions: number;
  learningQuestions: number;
  masteredQuestions: number;
  dueToday: number;
  dueThisWeek: number;
  forecast: DailyForecast[];
}

export interface DailyForecast {
  date: string;
  estimatedQuestions: number;
}

export interface WeakArea {
  type: 'tag' | 'subject';
  name: string;
  successRate: number;
  totalQuestions: number;
  questionCount: number;
}
