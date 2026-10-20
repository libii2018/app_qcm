/**
 * Contrôleur des réponses
 */

import { Request, Response } from 'express';
import { AnswerEventData, AnswerEventSchema, QuizSessionSchema } from '@qcm/shared';
import { updateReviewState, createInitialReviewState } from '@qcm/shared';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';
import prisma from '../prisma';



/**
 * Enregistrer une réponse individuelle
 */
export async function recordAnswer(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const data: AnswerEventData = req.body;

  // Obtenir le quiz pour extraire les métadonnées
  let quiz = null;
  if (data.quizId) {
    quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId },
    });
  }

  // Si on a un quiz, extraire les métadonnées de la question
  let subject: string | undefined;
  let tags: string[] = [];
  let difficulty = 1;

  if (quiz) {
    const quizJson = typeof quiz.jsonContent === 'string' ? JSON.parse(quiz.jsonContent) : quiz.jsonContent;
    const question = quizJson?.questions?.find((q: any) => q.id === data.questionId);
    
    if (question) {
      tags = question.tags || [];
      subject = quizJson.subject;
      difficulty = question.difficulty || 1;
    }
  }

  // Créer l'événement de réponse
  const answerEvent = await prisma.answerEvent.create({
    data: {
      id: require('crypto').randomUUID(),
      userId,
      quizId: data.quizId,
      questionId: data.questionId,
      correct: data.correct,
      responseTime: data.responseTime,
      usedHint: data.usedHint || false,
      timestamp: data.timestamp || new Date(),
      selectedOptions: JSON.stringify(data.selectedOptions || []),
      tags: JSON.stringify(tags),
      subject,
      difficulty,
    },
    select: {
      id: true,
      questionId: true,
      quizId: true,
      correct: true,
      responseTime: true,
      usedHint: true,
      timestamp: true,
      tags: true,
      subject: true,
      difficulty: true,
    },
  });

  // Parser selectedOptions et tags pour la réponse
  const parsedAnswerEvent = {
    ...answerEvent,
    selectedOptions: typeof answerEvent.selectedOptions === 'string' ? JSON.parse(answerEvent.selectedOptions) : answerEvent.selectedOptions,
    tags: typeof answerEvent.tags === 'string' ? JSON.parse(answerEvent.tags) : answerEvent.tags,
  };

  // Mettre à jour l'état de révision (répétition espacée)
  await updateReviewStateForQuestion(userId, data.questionId, data.correct, difficulty);

  // Mettre à jour le streak
  await updateStreak(userId);

  res.status(201).json({
    data: { answerEvent: parsedAnswerEvent },
    message: 'Réponse enregistrée avec succès',
  });
}

/**
 * Enregistrer les réponses d'une session complète
 */
export async function recordSessionAnswers(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const sessionData = req.body;

  // Valider les données de la session
  const validation = QuizSessionSchema.safeParse(sessionData);
  if (!validation.success) {
    throw new BadRequestError('Données de session invalides');
  }

  const { questions, totalQuestions, correctCount, totalTime, startedAt, completedAt } = validation.data;

  // Obtenir le quiz pour les métadonnées
  let quizSubject: string | undefined;
  let quizTags: string[] = [];

  if (sessionData.quizId) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: sessionData.quizId },
    });
    
    if (quiz) {
      const quizJson = typeof quiz.jsonContent === 'string' ? JSON.parse(quiz.jsonContent) : quiz.jsonContent;
      quizSubject = quizJson?.subject;
      quizTags = quizJson?.tags || [];
    }
  }

  // Créer tous les événements de réponse
  const createdAnswers = [];
  const questionIds = new Set<string>();

  for (const questionData of questions) {
    // Éviter les doublons
    if (questionIds.has(questionData.questionId)) continue;
    questionIds.add(questionData.questionId);

    // Obtenir les métadonnées de la question
    let subject: string | undefined = quizSubject;
    let tags: string[] = quizTags;
    let difficulty = 1;

    if (sessionData.quizId) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: sessionData.quizId },
      });
      
      if (quiz) {
        const quizJson = typeof quiz.jsonContent === 'string' ? JSON.parse(quiz.jsonContent) : quiz.jsonContent;
        const question = quizJson?.questions?.find((q: any) => q.id === questionData.questionId);
        
        if (question) {
          tags = [...new Set([...tags, ...(question.tags || [])])];
          subject = subject || quizJson.subject;
          difficulty = question.difficulty || 1;
        }
      }
    }

    // Créer l'événement
    const answerEvent = await prisma.answerEvent.create({
      data: {
        id: require('crypto').randomUUID(),
        userId,
        quizId: sessionData.quizId,
        questionId: questionData.questionId,
        correct: questionData.correct,
        responseTime: questionData.responseTime,
        usedHint: questionData.usedHint || false,
        timestamp: new Date(),
        selectedOptions: JSON.stringify(questionData.selectedOptions || []),
        tags: JSON.stringify(tags),
        subject,
        difficulty,
      },
    });

    createdAnswers.push(answerEvent);

    // Mettre à jour l'état de révision
    await updateReviewStateForQuestion(
      userId, 
      questionData.questionId, 
      questionData.correct, 
      difficulty
    );
  }

  // Parser selectedOptions et tags pour les réponses
  const parsedAnswers = createdAnswers.map(a => ({
    ...a,
    selectedOptions: typeof a.selectedOptions === 'string' ? JSON.parse(a.selectedOptions) : a.selectedOptions,
    tags: typeof a.tags === 'string' ? JSON.parse(a.tags) : a.tags,
  }));

  // Mettre à jour le streak
  await updateStreak(userId);

  res.status(201).json({
    data: {
      session: {
        totalQuestions,
        correctCount,
        totalTime,
        startedAt,
        completedAt,
      },
      answers: parsedAnswers,
    },
    message: `${createdAnswers.length} réponse${createdAnswers.length > 1 ? 's' : ''} enregistrée${createdAnswers.length > 1 ? 's' : ''} avec succès`,
  });
}

/**
 * Met à jour l'état de révision pour une question
 */
async function updateReviewStateForQuestion(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  difficulty: number
) {
  try {
    // Obtenir l'état actuel
    const existingState = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });

    // Convertir en format pour l'algorithme
    const state = existingState ? {
      questionId,
      nextReviewDate: existingState.nextReviewDate,
      interval: existingState.interval,
      easeFactor: existingState.easeFactor,
      repetitionCount: existingState.repetitionCount,
      consecutiveCorrect: existingState.consecutiveCorrect,
      consecutiveIncorrect: existingState.consecutiveIncorrect,
    } : null;

    // Calculer le nouvel état
    const newState = updateReviewState(state, isCorrect, difficulty);

    // Mettre à jour ou créer
    if (existingState) {
      await prisma.reviewState.update({
        where: { userId_questionId: { userId, questionId } },
        data: {
          nextReviewDate: newState.nextReviewDate,
          interval: newState.interval,
          easeFactor: newState.easeFactor,
          repetitionCount: newState.repetitionCount,
          consecutiveCorrect: newState.consecutiveCorrect,
          consecutiveIncorrect: newState.consecutiveIncorrect,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.reviewState.create({
        data: {
          id: require('crypto').randomUUID(),
          userId,
          questionId,
          quizId: null, // À mettre à jour si nécessaire
          nextReviewDate: newState.nextReviewDate,
          interval: newState.interval,
          easeFactor: newState.easeFactor,
          repetitionCount: newState.repetitionCount,
          consecutiveCorrect: newState.consecutiveCorrect,
          consecutiveIncorrect: newState.consecutiveIncorrect,
        },
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'état de révision :', error);
  }
}

/**
 * Met à jour le streak de l'utilisateur
 */
async function updateStreak(userId: string) {
  try {
    // Obtenir l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, updatedAt: true },
    });

    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Obtenir la dernière réponse de l'utilisateur aujourd'hui
    const todayAnswer = await prisma.answerEvent.findFirst({
      where: {
        userId,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Obtenir la dernière réponse de l'utilisateur hier
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayAnswer = await prisma.answerEvent.findFirst({
      where: {
        userId,
        timestamp: { 
          gte: yesterday,
          lt: today,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    let newStreak = user.streak;

    // Si l'utilisateur a répondu aujourd'hui
    if (todayAnswer) {
      // Si l'utilisateur a aussi répondu hier, incrémenter le streak
      if (yesterdayAnswer) {
        newStreak = user.streak + 1;
      } else if (user.streak === 0) {
        // Pas de réponse hier, mais réponse aujourd'hui : streak = 1
        newStreak = 1;
      }
      // Si l'utilisateur a répondu hier mais pas avant-hier, streak = 1
      // Sinon, streak reste le même
    } else {
      // Pas de réponse aujourd'hui : réinitialiser le streak
      newStreak = 0;
    }

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: userId },
      data: { streak: newStreak },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du streak :', error);
  }
}
