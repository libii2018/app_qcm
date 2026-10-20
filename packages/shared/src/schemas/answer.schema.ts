import { z } from 'zod';

// Schéma pour l'enregistrement d'une réponse
export const AnswerEventSchema = z.object({
  questionId: z.string().min(1, 'L\'ID de la question est obligatoire'),
  quizId: z.string().optional(),
  selectedOptions: z.array(z.string()).min(1, 'Au moins une option doit être sélectionnée'),
  correct: z.boolean(),
  responseTime: z.number().min(0, 'Le temps de réponse doit être positif'),
  usedHint: z.boolean().default(false),
  timestamp: z.date().default(() => new Date()),
  tags: z.array(z.string()).default([]),
  subject: z.string().optional(),
});

// Schéma pour une session de quiz
export const QuizSessionSchema = z.object({
  quizId: z.string().optional(),
  questions: z.array(
    z.object({
      questionId: z.string(),
      quizId: z.string(),
      selectedOptions: z.array(z.string()),
      correct: z.boolean(),
      responseTime: z.number(),
      usedHint: z.boolean(),
    })
  ),
  totalQuestions: z.number().min(1),
  correctCount: z.number().min(0),
  totalTime: z.number().min(0),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date(),
});

// Schéma pour les paramètres de session
export const QuizSessionParamsSchema = z.object({
  quizIds: z.array(z.string()).optional(),
  tag: z.string().optional(),
  subject: z.string().optional(),
  difficulty: z.number().min(1).max(5).optional(),
  questionCount: z.number().min(1).max(100).default(10),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  timeLimit: z.number().min(0).optional(), // en secondes
  immediateFeedback: z.boolean().default(false),
});

export type AnswerEventData = z.infer<typeof AnswerEventSchema>;
export type QuizSession = z.infer<typeof QuizSessionSchema>;
export type QuizSessionParams = z.infer<typeof QuizSessionParamsSchema>;
