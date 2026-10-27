/**
 * Contrôleur des statistiques
 */

import { Request, Response } from 'express';
import {
  PerformanceStats,
  TagStats,
  SubjectStats,
  DailyStats,
  LearningStats,
  FailedQuestion,
  WeakArea,
  StatsFilterParams,
  calculatePerformanceStats,
  calculateTagStats,
  calculateSubjectStats,
  calculateDailyStats,
  identifyWeakAreas,
  calculateQuestionStatuses,
  findFailedQuestions,
  calculateLearningStats,
  calculateStreak,
  calculateResponseTimeStats,
  filterEvents,
} from '@qcm/shared';
import { asyncHandler } from '../middleware/error.middleware';
import prisma from '../prisma';



/**
 * Convertit un événement AnswerEvent en format étendu
 */
function toExtendedAnswerEvent(event: any): any {
  // Parser tags si c'est une string JSON
  let parsedTags: string[] = [];
  if (event.tags) {
    if (typeof event.tags === 'string') {
      try {
        parsedTags = JSON.parse(event.tags);
      } catch {
        parsedTags = [event.tags];
      }
    } else if (Array.isArray(event.tags)) {
      parsedTags = event.tags;
    }
  }
  
  return {
    ...event,
    questionId: event.questionId,
    quizId: event.quizId,
    tags: parsedTags,
    subject: event.subject,
    difficulty: event.difficulty || 1,
    questionPrompt: event.questionId, // À améliorer
  };
}

/**
 * Obtenir les statistiques globales
 */
export async function getOverallStats(req: Request, res: Response) {
  const userId = (req as any).user?.userId;

  // Compter les quiz
  const quizCount = await prisma.quiz.count({ where: { userId } });

  // Compter les réponses
  const answerCount = await prisma.answerEvent.count({ where: { userId } });

  // Obtenir les dernières réponses
  const recentAnswers = await prisma.answerEvent.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 10,
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  // Compter les réponses correctes/incorrectes
  const correctCount = await prisma.answerEvent.count({
    where: { userId, correct: true },
  });

  const incorrectCount = await prisma.answerEvent.count({
    where: { userId, correct: false },
  });

  const successRate = answerCount > 0 ? (correctCount / answerCount) * 100 : 0;

  // Obtenir le streak
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, dailyGoal: true },
  });

  // Obtenir les statistiques d'apprentissage
  const reviewStates = await prisma.reviewState.findMany({
    where: { userId },
  });

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  const learningStats = calculateLearningStats(
    new Map(reviewStates.map(rs => [
      rs.questionId,
      {
        nextReviewDate: rs.nextReviewDate,
        interval: rs.interval,
        repetitionCount: rs.repetitionCount,
      },
    ])),
    answerCount
  );

  // Obtenir les zones faibles
  const weakAreas = identifyWeakAreas(
    allEvents.map(toExtendedAnswerEvent),
    5
  );

  res.json({
    data: {
      overview: {
        quizCount,
        answerCount,
        correctCount,
        incorrectCount,
        successRate: Math.round(successRate * 100) / 100,
        streak: user?.streak || 0,
        dailyGoal: user?.dailyGoal || 10,
      },
      learningStats,
      weakAreas: weakAreas.slice(0, 5),
      recentAnswers: recentAnswers.map(a => ({
        ...a,
        timestamp: a.timestamp.toISOString(),
      })),
    },
  });
}

/**
 * Obtenir les statistiques de performance
 */
export async function getPerformanceStats(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const filterParams: StatsFilterParams = req.query;

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  const filteredEvents = filterEvents(
    allEvents.map(toExtendedAnswerEvent),
    filterParams
  );

  const stats = calculatePerformanceStats(filteredEvents);

  res.json({
    data: { stats },
  });
}

/**
 * Obtenir les statistiques par tag
 */
export async function getTagStats(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const filterParams: StatsFilterParams = req.query;

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  const filteredEvents = filterEvents(
    allEvents.map(toExtendedAnswerEvent),
    filterParams
  );

  const stats = calculateTagStats(filteredEvents);

  res.json({
    data: { stats },
  });
}

/**
 * Obtenir les statistiques par matière
 */
export async function getSubjectStats(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const filterParams: StatsFilterParams = req.query;

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  const filteredEvents = filterEvents(
    allEvents.map(toExtendedAnswerEvent),
    filterParams
  );

  const stats = calculateSubjectStats(filteredEvents);

  res.json({
    data: { stats },
  });
}

/**
 * Obtenir les statistiques journalières
 */
export async function getDailyStats(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const filterParams: StatsFilterParams = req.query;
  const { days = 30 } = req.query;

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  const filteredEvents = filterEvents(
    allEvents.map(toExtendedAnswerEvent),
    filterParams
  );

  const stats = calculateDailyStats(filteredEvents, parseInt(days as string));

  res.json({
    data: { stats },
  });
}

/**
 * Obtenir les statistiques d'apprentissage
 */
export async function getLearningStats(req: Request, res: Response) {
  const userId = (req as any).user?.userId;

  const reviewStates = await prisma.reviewState.findMany({
    where: { userId },
    select: {
      questionId: true,
      nextReviewDate: true,
      interval: true,
      repetitionCount: true,
    },
  });

  const totalQuestions = await prisma.answerEvent.count({
    where: { userId },
  });

  const learningStats = calculateLearningStats(
    new Map(reviewStates.map(rs => [
      rs.questionId,
      {
        nextReviewDate: rs.nextReviewDate,
        interval: rs.interval,
        repetitionCount: rs.repetitionCount,
      },
    ])),
    totalQuestions
  );

  res.json({
    data: { learningStats },
  });
}

/**
 * Obtenir les questions les plus ratées
 */
export async function getFailedQuestions(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const filterParams: StatsFilterParams = req.query;
  const { limit = 10 } = req.query;

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  const filteredEvents = filterEvents(
    allEvents.map(toExtendedAnswerEvent),
    filterParams
  );

  // Obtenir les titres des quiz pour plus de contexte
  const quizIds = [...new Set(filteredEvents.map(e => e.quizId).filter((id): id is string => Boolean(id)))];
  const quizzes = await prisma.quiz.findMany({
    where: { id: { in: quizIds } },
    select: { id: true, title: true },
  });

  const quizTitleMap = new Map(quizzes.map(q => [q.id, q.title]));

  // Ajouter le titre du quiz aux événements
  const eventsWithTitles = filteredEvents.map(event => ({
    ...event,
    quizTitle: event.quizId ? quizTitleMap.get(event.quizId) : undefined,
  }));

  const failedQuestions = findFailedQuestions(
    eventsWithTitles.map(toExtendedAnswerEvent),
    parseInt(limit as string)
  );

  res.json({
    data: { failedQuestions },
  });
}

/**
 * Obtenir les zones faibles
 */
export async function getWeakAreas(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const filterParams: StatsFilterParams = req.query;

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  const filteredEvents = filterEvents(
    allEvents.map(toExtendedAnswerEvent),
    filterParams
  );

  const weakAreas = identifyWeakAreas(filteredEvents.map(toExtendedAnswerEvent), 5);

  res.json({
    data: { weakAreas },
  });
}

/**
 * Obtenir le streak
 */
export async function getStreak(req: Request, res: Response) {
  const userId = (req as any).user?.userId;

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      timestamp: true,
    },
  });

  const streak = calculateStreak(
    allEvents.map(e => toExtendedAnswerEvent({ ...e, id: '' }))
  );

  // Mettre à jour le streak de l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true },
  });

  if (user && user.streak !== streak.currentStreak) {
    await prisma.user.update({
      where: { id: userId },
      data: { streak: streak.currentStreak },
    });
  }

  res.json({
    data: { streak },
  });
}

/**
 * Obtenir les statistiques de temps de réponse
 */
export async function getResponseTimeStats(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const filterParams: StatsFilterParams = req.query;

  const allEvents = await prisma.answerEvent.findMany({
    where: { userId },
    select: {
      id: true,
      quizId: true,
      questionId: true,
      correct: true,
      responseTime: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  const filteredEvents = filterEvents(
    allEvents.map(toExtendedAnswerEvent),
    filterParams
  );

  const stats = calculateResponseTimeStats(filteredEvents);

  res.json({
    data: {
      avgBySubject: Object.fromEntries(stats.avgBySubject),
      avgByTag: Object.fromEntries(stats.avgByTag),
      avgByDifficulty: Object.fromEntries(stats.avgByDifficulty),
    },
  });
}
