import { z } from 'zod';

// Schéma pour les paramètres de filtrage des statistiques
export const StatsFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  subject: z.string().optional(),
  tag: z.string().optional(),
  difficulty: z.number().min(1).max(5).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

// Schéma pour les statistiques de performance
export const PerformanceStatsSchema = z.object({
  totalQuestions: z.number().min(0),
  correctCount: z.number().min(0),
  incorrectCount: z.number().min(0),
  successRate: z.number().min(0).max(100),
  avgResponseTime: z.number().min(0),
  totalResponseTime: z.number().min(0),
});

// Schéma pour les statistiques par tag
export const TagStatsSchema = z.object({
  tag: z.string(),
  totalQuestions: z.number().min(0),
  correctCount: z.number().min(0),
  successRate: z.number().min(0).max(100),
});

// Schéma pour les statistiques par matière
export const SubjectStatsSchema = z.object({
  subject: z.string(),
  totalQuestions: z.number().min(0),
  correctCount: z.number().min(0),
  successRate: z.number().min(0).max(100),
});

// Schéma pour les statistiques journalières
export const DailyStatsSchema = z.object({
  date: z.string(),
  questionsAnswered: z.number().min(0),
  correctCount: z.number().min(0),
  successRate: z.number().min(0).max(100),
  responseTime: z.number().min(0),
});

// Schéma pour les statistiques d'apprentissage
export const LearningStatsSchema = z.object({
  newQuestions: z.number().min(0),
  learningQuestions: z.number().min(0),
  masteredQuestions: z.number().min(0),
  dueToday: z.number().min(0),
  dueThisWeek: z.number().min(0),
  forecast: z.array(
    z.object({
      date: z.string(),
      estimatedQuestions: z.number().min(0),
    })
  ),
});

// Schéma pour les zones faibles
export const WeakAreaSchema = z.object({
  type: z.enum(['tag', 'subject']),
  name: z.string(),
  successRate: z.number().min(0).max(100),
  totalQuestions: z.number().min(0),
  questionCount: z.number().min(0),
});

// Schéma pour les questions les plus ratées
export const FailedQuestionSchema = z.object({
  questionId: z.string(),
  quizId: z.string().optional(),
  title: z.string(),
  totalAttempts: z.number().min(0),
  correctAttempts: z.number().min(0),
  successRate: z.number().min(0).max(100),
  lastAttemptDate: z.string().datetime().optional(),
});

// Types ré-exportés depuis ../types pour éviter les exports ambigus
export type {
  DailyStats,
  FailedQuestion,
  LearningStats,
  PerformanceStats,
  StatsFilterParams,
  SubjectStats,
  TagStats,
  WeakArea,
} from '../types';
