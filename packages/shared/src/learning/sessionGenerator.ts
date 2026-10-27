/**
 * Générateur de sessions de révision basées sur la répétition espacée
 */

import { Question, ReviewQueueItem, WeakArea } from '../types';
import { ReviewState, calculateQuestionPriority, isDueForReview, getQuestionCategory, generateReviewReason } from './algorithm';
import { ALGORITHM_CONSTANTS } from './algorithm';

interface QuizInfo {
  id: string;
  title: string;
  subject: string;
  tags: string[];
  questions: Question[];
}

interface QuestionWithState extends Question {
  quizId: string;
  quizTitle: string;
  quizSubject: string;
  subject: string;
  reviewState: ReviewState | null;
  lastAnswer?: {
    correct: boolean;
    timestamp: Date;
  };
}

interface SessionGenerationOptions {
  userId: string;
  quizzes: QuizInfo[];
  reviewStates: Map<string, ReviewState>; // questionId -> ReviewState
  answerHistory: Map<string, { correct: boolean; timestamp: Date }[]>; // questionId -> history
  weakAreas: WeakArea[];
  dailyGoal?: number;
  maxQuestions?: number;
  includeNewQuestions?: boolean;
  includeReviewQuestions?: boolean;
  shuffle?: boolean;
  maxFromSameTag?: number;
}

interface GeneratedSession {
  questions: ReviewQueueItem[];
  totalQuestions: number;
  newQuestionsCount: number;
  reviewQuestionsCount: number;
  reasons: Map<string, string>; // questionId -> reason
}

/**
 * Génère une session de révision recommandée pour aujourd'hui
 */
export function generateTodaySession(options: SessionGenerationOptions): GeneratedSession {
  const {
    quizzes,
    reviewStates,
    answerHistory,
    weakAreas,
    dailyGoal = 20,
    maxQuestions = dailyGoal,
    includeNewQuestions = true,
    includeReviewQuestions = true,
    shuffle = true,
    maxFromSameTag = 2,
  } = options;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Collecter toutes les questions avec leur état
  const allQuestions: QuestionWithState[] = [];
  const weakAreaSet = new Set<string>();

  // Créer un set des zones faibles
  weakAreas.forEach(wa => weakAreaSet.add(wa.name));

  // Parcourir tous les quiz
  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const questionId = question.id;
      const reviewState = reviewStates.get(questionId) || null;
      const lastAnswer = answerHistory.get(questionId)?.[0]; // Dernière réponse

      allQuestions.push({
        ...question,
        quizId: quiz.id,
        quizTitle: quiz.title,
        quizSubject: quiz.subject,
        subject: quiz.subject,
        reviewState,
        lastAnswer,
      });
    }
  }

  // Séparer les questions en catégories
  const dueQuestions: QuestionWithState[] = [];
  const newQuestions: QuestionWithState[] = [];
  const learningQuestions: QuestionWithState[] = [];
  const masteredQuestions: QuestionWithState[] = [];
  const weakAreaQuestions: QuestionWithState[] = [];

  for (const q of allQuestions) {
    const category = getQuestionCategory(q.reviewState);
    const isWeakArea = q.tags.some(t => weakAreaSet.has(t)) || weakAreaSet.has(q.quizSubject);

    if (isDueForReview(q.reviewState)) {
      dueQuestions.push(q);
    }

    switch (category) {
      case 'new':
        newQuestions.push(q);
        break;
      case 'learning':
        learningQuestions.push(q);
        break;
      case 'mastered':
        masteredQuestions.push(q);
        break;
    }

    if (isWeakArea) {
      weakAreaQuestions.push(q);
    }
  }

  // Priorité : questions dues > questions ratées > zones faibles > nouvelles > apprentissage
  
  // 1. Questions dues (par date de révision)
  const sortedDueQuestions = [...dueQuestions]
    .sort((a, b) => {
      const aState = a.reviewState;
      const bState = b.reviewState;
      
      if (!aState && !bState) return 0;
      if (!aState) return 1;
      if (!bState) return -1;
      
      const aDaysOverdue = Math.max(0, Math.floor(
        (now.getTime() - aState.nextReviewDate.getTime()) / (24 * 60 * 60 * 1000)
      ));
      const bDaysOverdue = Math.max(0, Math.floor(
        (now.getTime() - bState.nextReviewDate.getTime()) / (24 * 60 * 60 * 1000)
      ));
      
      // Plus en retard = plus prioritaire
      return bDaysOverdue - aDaysOverdue;
    });

  // 2. Questions des zones faibles (pas encore dues)
  const nonDueWeakAreaQuestions = weakAreaQuestions.filter(
    q => !isDueForReview(q.reviewState) && q.reviewState !== null
  );

  // 3. Nouvelles questions (si demandées)
  const availableNewQuestions = includeNewQuestions ? [...newQuestions] : [];

  // 4. Questions en apprentissage (si demandées et que l'on a besoin de plus)
  const availableLearningQuestions = includeReviewQuestions ? [...learningQuestions] : [];

  // 5. Questions maîtrisées (si on a vraiment besoin de remplir)
  const availableMasteredQuestions = includeReviewQuestions ? [...masteredQuestions] : [];

  // Fusionner toutes les questions candidates avec leur priorité
  const candidates: { question: QuestionWithState; priority: number; category: string }[] = [];

  // Ajouter les questions dues
  sortedDueQuestions.forEach(q => {
    const priority = calculateQuestionPriority(q.reviewState, q, weakAreaSet, q.lastAnswer);
    candidates.push({ question: q, priority, category: 'due' });
  });

  // Ajouter les questions des zones faibles non dues
  nonDueWeakAreaQuestions.forEach(q => {
    const priority = calculateQuestionPriority(q.reviewState, q, weakAreaSet, q.lastAnswer);
    candidates.push({ question: q, priority: priority - 10, category: 'weak-area' });
  });

  // Ajouter les nouvelles questions
  availableNewQuestions.forEach(q => {
    const priority = calculateQuestionPriority(q.reviewState, q, weakAreaSet, q.lastAnswer);
    candidates.push({ question: q, priority: priority - 20, category: 'new' });
  });

  // Ajouter les questions en apprentissage
  availableLearningQuestions.forEach(q => {
    const priority = calculateQuestionPriority(q.reviewState, q, weakAreaSet, q.lastAnswer);
    candidates.push({ question: q, priority: priority - 30, category: 'learning' });
  });

  // Ajouter les questions maîtrisées
  availableMasteredQuestions.forEach(q => {
    const priority = calculateQuestionPriority(q.reviewState, q, weakAreaSet, q.lastAnswer);
    candidates.push({ question: q, priority: priority - 40, category: 'mastered' });
  });

  // Trier par priorité
  candidates.sort((a, b) => b.priority - a.priority);

  // Sélectionner les questions pour la session
  const selectedQuestions: QuestionWithState[] = [];
  const tagCount = new Map<string, number>();
  const quizCount = new Map<string, number>();
  const reasons = new Map<string, string>();
  const usedQuestionIds = new Set<string>();

  for (const candidate of candidates) {
    if (selectedQuestions.length >= maxQuestions) break;
    if (usedQuestionIds.has(candidate.question.id)) continue;

    const q = candidate.question;
    const maxTag = maxFromSameTag;

    // Vérifier les limites par tag
    let canAdd = true;
    for (const tag of [...q.tags, q.quizSubject]) {
      const currentCount = tagCount.get(tag) || 0;
      if (currentCount >= maxTag) {
        canAdd = false;
        break;
      }
    }

    if (!canAdd) continue;

    // Vérifier la limite par quiz
    const quizCurrentCount = quizCount.get(q.quizId) || 0;
    if (quizCurrentCount >= Math.ceil(maxTag * 1.5)) continue;

    // Ajouter la question
    selectedQuestions.push(q);
    usedQuestionIds.add(q.id);

    // Mettre à jour les compteurs
    for (const tag of [...q.tags, q.quizSubject]) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
    quizCount.set(q.quizId, (quizCount.get(q.quizId) || 0) + 1);

    // Générer la raison
    const reason = generateReviewReason(q.reviewState, q, q.lastAnswer);
    reasons.set(q.id, reason);
  }

  // Convertir en ReviewQueueItem
  const queueItems: ReviewQueueItem[] = selectedQuestions.map(q => ({
    question: q,
    quizId: q.quizId,
    quizTitle: q.quizTitle,
    subject: q.quizSubject,
    tags: q.tags,
    reason: reasons.get(q.id) || 'Sélectionnée pour la session',
    dueDate: q.reviewState?.nextReviewDate || new Date(),
  }));

  // Compter les catégories
  let newCount = 0;
  let reviewCount = 0;

  selectedQuestions.forEach(q => {
    const category = getQuestionCategory(q.reviewState);
    if (category === 'new') newCount++;
    else reviewCount++;
  });

  return {
    questions: shuffle ? shuffleArray(queueItems) : queueItems,
    totalQuestions: selectedQuestions.length,
    newQuestionsCount: newCount,
    reviewQuestionsCount: reviewCount,
    reasons,
  };
}

/**
 * Mélange un tableau (Fisher-Yates shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Génère une session à partir d'un quiz spécifique
 */
export function generateQuizSession(
  quiz: QuizInfo,
  reviewStates: Map<string, ReviewState>,
  answerHistory: Map<string, { correct: boolean; timestamp: Date }[]>,
  weakAreas: WeakArea[],
  options: {
    questionCount?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    includeAll?: boolean;
  } = {}
): GeneratedSession {
  const {
    questionCount = quiz.questions.length,
    shuffleQuestions = true,
    includeAll = false,
  } = options;

  const allQuestions: QuestionWithState[] = quiz.questions.map(q => {
    const reviewState = reviewStates.get(q.id) || null;
    const lastAnswer = answerHistory.get(q.id)?.[0];
    return {
      ...q,
      quizId: quiz.id,
      quizTitle: quiz.title,
      quizSubject: quiz.subject,
      subject: quiz.subject,
      reviewState,
      lastAnswer,
    };
  });

  const weakAreaSet = new Set<string>();
  weakAreas.forEach(wa => weakAreaSet.add(wa.name));

  // Filtrer et trier les questions
  const candidates = [...allQuestions]
    .map(q => ({
      question: q,
      priority: calculateQuestionPriority(q.reviewState, q, weakAreaSet, q.lastAnswer),
    }))
    .sort((a, b) => b.priority - a.priority);

  const selectedCount = includeAll ? allQuestions.length : Math.min(questionCount, allQuestions.length);
  const selected = candidates.slice(0, selectedCount).map(c => c.question);

  const reasons = new Map<string, string>();
  selected.forEach(q => {
    const reason = generateReviewReason(q.reviewState, q, q.lastAnswer);
    reasons.set(q.id, reason);
  });

  const queueItems: ReviewQueueItem[] = selected.map(q => ({
    question: q,
    quizId: q.quizId,
    quizTitle: q.quizTitle,
    subject: q.quizSubject,
    tags: q.tags,
    reason: reasons.get(q.id) || 'Question du quiz',
    dueDate: q.reviewState?.nextReviewDate || new Date(),
  }));

  let newCount = 0;
  let reviewCount = 0;

  selected.forEach(q => {
    const category = getQuestionCategory(q.reviewState);
    if (category === 'new') newCount++;
    else reviewCount++;
  });

  return {
    questions: shuffleQuestions ? shuffleArray(queueItems) : queueItems,
    totalQuestions: selected.length,
    newQuestionsCount: newCount,
    reviewQuestionsCount: reviewCount,
    reasons,
  };
}

/**
 * Génère une session mixte (plusieurs quiz)
 */
export function generateMixedSession(
  quizzes: QuizInfo[],
  reviewStates: Map<string, ReviewState>,
  answerHistory: Map<string, { correct: boolean; timestamp: Date }[]>,
  weakAreas: WeakArea[],
  options: {
    questionCount?: number;
    tags?: string[];
    subjects?: string[];
    difficulties?: number[];
    shuffle?: boolean;
    maxFromSameQuiz?: number;
    maxFromSameTag?: number;
  } = {}
): GeneratedSession {
  const {
    questionCount = 20,
    tags = [],
    subjects = [],
    difficulties = [],
    shuffle = true,
    maxFromSameQuiz = 5,
    maxFromSameTag = 3,
  } = options;

  // Filtrer les questions
  const allQuestions: QuestionWithState[] = [];

  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      // Filtrer par tag
      if (tags.length > 0 && !tags.some(t => question.tags.includes(t) || quiz.tags.includes(t))) {
        continue;
      }
      // Filtrer par matière
      if (subjects.length > 0 && !subjects.includes(quiz.subject)) {
        continue;
      }
      // Filtrer par difficulté
      if (difficulties.length > 0 && !difficulties.includes(question.difficulty)) {
        continue;
      }

      const reviewState = reviewStates.get(question.id) || null;
      const lastAnswer = answerHistory.get(question.id)?.[0];

      allQuestions.push({
        ...question,
        quizId: quiz.id,
        quizTitle: quiz.title,
        quizSubject: quiz.subject,
        subject: quiz.subject,
        reviewState,
        lastAnswer,
      });
    }
  }

  // Generer la session
  const weakAreaSet = new Set<string>();
  weakAreas.forEach(wa => weakAreaSet.add(wa.name));

  const candidates = [...allQuestions]
    .map(q => ({
      question: q,
      priority: calculateQuestionPriority(q.reviewState, q, weakAreaSet, q.lastAnswer),
    }))
    .sort((a, b) => b.priority - a.priority);

  const selectedQuestions: QuestionWithState[] = [];
  const quizCount = new Map<string, number>();
  const tagCount = new Map<string, number>();
  const reasons = new Map<string, string>();
  const usedIds = new Set<string>();

  for (const candidate of candidates) {
    if (selectedQuestions.length >= questionCount) break;
    if (usedIds.has(candidate.question.id)) continue;

    const q = candidate.question;

    // Vérifier les limites
    const quizCurrent = quizCount.get(q.quizId) || 0;
    if (quizCurrent >= maxFromSameQuiz) continue;

    let tagOk = true;
    for (const tag of [...q.tags, q.quizSubject]) {
      const tagCurrent = tagCount.get(tag) || 0;
      if (tagCurrent >= maxFromSameTag) {
        tagOk = false;
        break;
      }
    }
    if (!tagOk) continue;

    selectedQuestions.push(q);
    usedIds.add(q.id);

    quizCount.set(q.quizId, (quizCount.get(q.quizId) || 0) + 1);
    for (const tag of [...q.tags, q.quizSubject]) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }

    const reason = generateReviewReason(q.reviewState, q, q.lastAnswer);
    reasons.set(q.id, reason);
  }

  const queueItems: ReviewQueueItem[] = selectedQuestions.map(q => ({
    question: q,
    quizId: q.quizId,
    quizTitle: q.quizTitle,
    subject: q.quizSubject,
    tags: q.tags,
    reason: reasons.get(q.id) || 'Sélectionnée pour la session mixte',
    dueDate: q.reviewState?.nextReviewDate || new Date(),
  }));

  let newCount = 0;
  let reviewCount = 0;

  selectedQuestions.forEach(q => {
    const category = getQuestionCategory(q.reviewState);
    if (category === 'new') newCount++;
    else reviewCount++;
  });

  return {
    questions: shuffle ? shuffleArray(queueItems) : queueItems,
    totalQuestions: selectedQuestions.length,
    newQuestionsCount: newCount,
    reviewQuestionsCount: reviewCount,
    reasons,
  };
}

// Ré-exporter les fonctions de l'algorithme
export { isDueForReview, getQuestionCategory, calculateQuestionPriority, generateReviewReason };
export type { ReviewState };
export { ALGORITHM_CONSTANTS };
