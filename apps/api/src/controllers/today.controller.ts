/**
 * Contrôleur de la page "Aujourd'hui"
 */

import { Request, Response } from 'express';
import {
  ReviewQueueItem,
  generateTodaySession,
  identifyWeakAreas,
  filterEvents,
} from '@qcm/shared';
import { BadRequestError } from '../middleware/error.middleware';
import prisma from '../prisma';



/**
 * Obtenir la recommandation du jour
 */
export async function getTodayRecommendation(req: Request, res: Response) {
  const userId = (req as any).user?.userId;

  // Obtenir l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      streak: true,
      dailyGoal: true,
    },
  });

  if (!user) {
    throw new BadRequestError('Utilisateur non trouvé');
  }

  // Obtenir tous les quiz de l'utilisateur
  const quizzesRaw = await prisma.quiz.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      subject: true,
      tags: true,
      jsonContent: true,
    },
  });

  // Parser les champs JSON
  const quizzes = quizzesRaw.map(q => ({
    ...q,
    tags: typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags,
    jsonContent: typeof q.jsonContent === 'string' ? JSON.parse(q.jsonContent) : q.jsonContent,
  }));

  // Obtenir tous les états de révision
  const reviewStates = await prisma.reviewState.findMany({
    where: { userId },
  });

  // Convertir en Map
  const reviewStatesMap = new Map(
    reviewStates.map(rs => [rs.questionId, {
      questionId: rs.questionId,
      nextReviewDate: rs.nextReviewDate,
      interval: rs.interval,
      easeFactor: rs.easeFactor,
      repetitionCount: rs.repetitionCount,
      lastReviewDate: rs.updatedAt,
      consecutiveCorrect: rs.consecutiveCorrect,
      consecutiveIncorrect: rs.consecutiveIncorrect,
    }])
  );

  // Obtenir toutes les réponses
  const answerEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      usedHint: true,
      timestamp: true,
      quizId: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  // Grouper par question
  const answerHistory = new Map(
    answerEvents.reduce((acc, event) => {
      if (!acc.has(event.questionId)) {
        acc.set(event.questionId, []);
      }
      acc.get(event.questionId)!.push({
        correct: event.correct,
        timestamp: event.timestamp,
      });
      return acc;
    }, new Map<string, Array<{ correct: boolean; timestamp: Date }>>())
  );

  // Obtenir les zones faibles
  const allEventsExtended = answerEvents.map(e => ({
    ...e,
    questionId: e.questionId,
    quizId: e.quizId ?? undefined,
    // Parser tags si c'est une string JSON
    tags: e.tags ? (typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags) : [],
    subject: e.subject ?? undefined,
    difficulty: e.difficulty || 1,
  }));

  const weakAreas = identifyWeakAreas(allEventsExtended, 5);

  // Générer la session recommandée
  const session = generateTodaySession({
    userId,
    quizzes: quizzes.map(q => ({
      id: q.id,
      title: q.title,
      subject: q.subject,
      tags: q.tags,
      questions: (q.jsonContent as any).questions || [],
    })),
    reviewStates: reviewStatesMap,
    answerHistory,
    weakAreas,
    dailyGoal: user.dailyGoal,
    maxQuestions: user.dailyGoal,
  });

  // Compter les questions dues
  const dueQuestions = await prisma.reviewState.count({
    where: {
      userId,
      nextReviewDate: { lte: new Date() },
    },
  });

  // Compter les nouvelles questions
  const allQuestionIds = new Set(
    quizzes.flatMap(q => 
      ((q.jsonContent as any).questions || []).map((q: any) => q.id)
    )
  );

  const reviewedQuestionIds = new Set(reviewStates.map(rs => rs.questionId));
  const newQuestionsCount = allQuestionIds.size - reviewedQuestionIds.size;

  res.json({
    data: {
      session,
      counts: {
        dueToday: dueQuestions,
        newQuestions: newQuestionsCount,
        totalToReview: session.totalQuestions,
      },
      streak: user.streak,
      dailyGoal: user.dailyGoal,
    },
  });
}

/**
 * Obtenir la file d'attente de révision
 */
export async function getReviewQueue(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const { limit = 50 } = req.query;

  // Obtenir tous les quiz
  const quizzesRaw = await prisma.quiz.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      subject: true,
      tags: true,
      jsonContent: true,
    },
  });

  // Parser les champs JSON
  const quizzes = quizzesRaw.map(q => ({
    ...q,
    tags: typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags,
    jsonContent: typeof q.jsonContent === 'string' ? JSON.parse(q.jsonContent) : q.jsonContent,
  }));

  // Obtenir les états de révision
  const reviewStates = await prisma.reviewState.findMany({
    where: { userId },
  });

  const reviewStatesMap = new Map(
    reviewStates.map(rs => [rs.questionId, rs])
  );

  // Obtenir les réponses
  const answerEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      usedHint: true,
      timestamp: true,
      quizId: true,
      tags: true,
      subject: true,
    },
  });

  const answerHistory = new Map(
    answerEvents.reduce((acc, event) => {
      if (!acc.has(event.questionId)) {
        acc.set(event.questionId, []);
      }
      acc.get(event.questionId)!.push({
        correct: event.correct,
        timestamp: event.timestamp,
      });
      return acc;
    }, new Map<string, Array<{ correct: boolean; timestamp: Date }>>())
  );

  // Obtenir les zones faibles
  const weakAreas = identifyWeakAreas(
    answerEvents.map(e => ({
      ...e,
      questionId: e.questionId,
      quizId: e.quizId ?? undefined,
      // Parser tags si c'est une string JSON
      tags: e.tags ? (typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags) : [],
      subject: e.subject ?? undefined,
      difficulty: 1,
    })),
    5
  );

  // Générer la session
  const session = generateTodaySession({
    userId,
    quizzes: quizzes.map(q => ({
      id: q.id,
      title: q.title,
      subject: q.subject,
      tags: q.tags,
      questions: (q.jsonContent as any).questions || [],
    })),
    reviewStates: reviewStatesMap,
    answerHistory,
    weakAreas,
    maxQuestions: parseInt(limit as string),
  });

  res.json({
    data: {
      queue: session.questions,
      total: session.totalQuestions,
      reasons: Object.fromEntries(session.reasons),
    },
  });
}
