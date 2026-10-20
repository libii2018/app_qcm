/**
 * Calcul des statistiques à partir des événements bruts
 */

import { 
  AnswerEvent, 
  DailyStats, 
  FailedQuestion,
  LearningStats,
  PerformanceStats,
  QuestionStatus,
  StatsFilterParams,
  SubjectStats,
  TagStats,
  WeakArea
} from '../types';

interface ExtendedAnswerEvent extends AnswerEvent {
  questionId: string;
  quizId?: string;
  tags: string[];
  subject?: string;
  difficulty: number;
  questionPrompt?: string;
}

/**
 * Calcule les statistiques de performance globales
 */
export function calculatePerformanceStats(events: ExtendedAnswerEvent[]): PerformanceStats {
  const totalQuestions = events.length;
  const correctCount = events.filter(e => e.correct).length;
  const incorrectCount = totalQuestions - correctCount;
  const successRate = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  const totalResponseTime = events.reduce((sum, e) => sum + e.responseTime, 0);
  const avgResponseTime = totalQuestions > 0 ? totalResponseTime / totalQuestions : 0;

  return {
    totalQuestions,
    correctCount,
    incorrectCount,
    successRate: Math.round(successRate * 100) / 100,
    avgResponseTime: Math.round(avgResponseTime),
    totalResponseTime,
  };
}

/**
 * Calcule les statistiques par tag
 */
export function calculateTagStats(events: ExtendedAnswerEvent[]): TagStats[] {
  const tagMap = new Map<string, { total: number; correct: number }>();

  events.forEach(event => {
    event.tags.forEach(tag => {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, { total: 0, correct: 0 });
      }
      const stat = tagMap.get(tag)!;
      stat.total++;
      if (event.correct) stat.correct++;
    });
  });

  const result: TagStats[] = [];
  for (const [tag, stat] of tagMap) {
    result.push({
      tag,
      totalQuestions: stat.total,
      correctCount: stat.correct,
      successRate: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100 * 100) / 100 : 0,
    });
  }

  return result.sort((a, b) => b.totalQuestions - a.totalQuestions);
}

/**
 * Calcule les statistiques par matière
 */
export function calculateSubjectStats(events: ExtendedAnswerEvent[]): SubjectStats[] {
  const subjectMap = new Map<string, { total: number; correct: number }>();

  events.forEach(event => {
    if (event.subject) {
      if (!subjectMap.has(event.subject)) {
        subjectMap.set(event.subject, { total: 0, correct: 0 });
      }
      const stat = subjectMap.get(event.subject)!;
      stat.total++;
      if (event.correct) stat.correct++;
    }
  });

  const result: SubjectStats[] = [];
  for (const [subject, stat] of subjectMap) {
    result.push({
      subject,
      totalQuestions: stat.total,
      correctCount: stat.correct,
      successRate: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100 * 100) / 100 : 0,
    });
  }

  return result.sort((a, b) => b.totalQuestions - a.totalQuestions);
}

/**
 * Calcule les statistiques journalières
 */
export function calculateDailyStats(
  events: ExtendedAnswerEvent[],
  days: number = 30
): DailyStats[] {
  const now = new Date();
  const dateMap = new Map<string, { questions: number; correct: number; time: number }>();

  // Initialiser les dates
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dateMap.set(dateStr, { questions: 0, correct: 0, time: 0 });
  }

  // Aggréger les événements
  events.forEach(event => {
    const dateStr = event.timestamp.toISOString().split('T')[0];
    if (dateMap.has(dateStr)) {
      const stat = dateMap.get(dateStr)!;
      stat.questions++;
      if (event.correct) stat.correct++;
      stat.time += event.responseTime;
    }
  });

  const result: DailyStats[] = [];
  const sortedDates = Array.from(dateMap.keys()).sort();

  for (const dateStr of sortedDates) {
    const stat = dateMap.get(dateStr)!;
    result.push({
      date: dateStr,
      questionsAnswered: stat.questions,
      correctCount: stat.correct,
      successRate: stat.questions > 0 ? Math.round((stat.correct / stat.questions) * 100 * 100) / 100 : 0,
      responseTime: stat.questions > 0 ? Math.round(stat.time / stat.questions) : 0,
    });
  }

  return result;
}

/**
 * Identifie les zones faibles (tags ou matières avec taux de réussite < 70%)
 */
export function identifyWeakAreas(
  events: ExtendedAnswerEvent[],
  minTotal: number = 5
): WeakArea[] {
  const tagStats = calculateTagStats(events);
  const subjectStats = calculateSubjectStats(events);

  const weakAreas: WeakArea[] = [];

  // Tags faibles
  tagStats.forEach(stat => {
    if (stat.totalQuestions >= minTotal && stat.successRate < 70) {
      weakAreas.push({
        type: 'tag',
        name: stat.tag,
        successRate: stat.successRate,
        totalQuestions: stat.totalQuestions,
        questionCount: stat.totalQuestions,
      });
    }
  });

  // Matières faibles
  subjectStats.forEach(stat => {
    if (stat.totalQuestions >= minTotal && stat.successRate < 70) {
      weakAreas.push({
        type: 'subject',
        name: stat.subject,
        successRate: stat.successRate,
        totalQuestions: stat.totalQuestions,
        questionCount: stat.totalQuestions,
      });
    }
  });

  // Trier par taux de réussite (le plus faible en premier)
  return weakAreas.sort((a, b) => a.successRate - b.successRate);
}

/**
 * Calcule l'état de chaque question
 */
export function calculateQuestionStatuses(
  events: ExtendedAnswerEvent[]
): Map<string, QuestionStatus> {
  const statusMap = new Map<string, QuestionStatus>();

  // Grouper les événements par question
  const eventsByQuestion = new Map<string, ExtendedAnswerEvent[]>();
  events.forEach(event => {
    if (!eventsByQuestion.has(event.questionId)) {
      eventsByQuestion.set(event.questionId, []);
    }
    eventsByQuestion.get(event.questionId)!.push(event);
  });

  // Calculer les statistiques pour chaque question
  for (const [questionId, questionEvents] of eventsByQuestion) {
    const totalAttempts = questionEvents.length;
    const correctAttempts = questionEvents.filter(e => e.correct).length;
    const successRate = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

    // Dernière tentative
    const sortedEvents = [...questionEvents].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    const lastAttempt = sortedEvents[0];

    statusMap.set(questionId, {
      questionId,
      totalAttempts,
      correctAttempts,
      successRate: Math.round(successRate * 100) / 100,
      lastAttemptDate: lastAttempt?.timestamp,
    });
  }

  return statusMap;
}

/**
 * Trouve les questions les plus ratées
 */
export function findFailedQuestions(
  events: ExtendedAnswerEvent[],
  limit: number = 10
): FailedQuestion[] {
  const questionStatuses = calculateQuestionStatuses(events);

  const failed: FailedQuestion[] = [];

  for (const [questionId, status] of questionStatuses) {
    // Seules les questions avec au moins 2 tentatives et taux < 70%
    if (status.totalAttempts >= 2 && status.successRate < 70) {
      // Trouver le quiz associé (à améliorer avec plus de contexte)
      const questionEvents = events.filter(e => e.questionId === questionId);
      const firstEvent = questionEvents[0];

      failed.push({
        questionId,
        quizId: firstEvent.quizId || '',
        title: firstEvent.questionPrompt || `Question ${questionId.substring(0, 8)}`,
        totalAttempts: status.totalAttempts,
        correctAttempts: status.correctAttempts,
        successRate: status.successRate,
        lastAttemptDate: status.lastAttemptDate?.toISOString(),
      });
    }
  }

  // Trier par taux de réussite (le plus faible en premier)
  return failed
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, limit);
}

/**
 * Calcule les statistiques d'apprentissage
 */
export function calculateLearningStats(
  reviewStates: Map<string, { nextReviewDate: Date; interval: number; repetitionCount: number }>,
  totalQuestions: number
): LearningStats {
  let newCount = 0;
  let learningCount = 0;
  let masteredCount = 0;
  let dueTodayCount = 0;
  let dueThisWeekCount = 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(todayStart);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  // Compter par catégorie
  reviewStates.forEach(state => {
    const interval = state.interval;

    // Catégoriser
    if (interval === 0 || state.repetitionCount === 0) {
      newCount++;
    } else if (state.repetitionCount < 3 || interval < 30) {
      learningCount++;
    } else if (interval <= 90) {
      learningCount++; // Considéré comme en révision active
    } else {
      masteredCount++;
    }

    // Compter les questions dues
    if (state.nextReviewDate <= now) {
      dueTodayCount++;
    } else if (state.nextReviewDate <= weekFromNow) {
      dueThisWeekCount++;
    }
  });

  // Prévision pour les 7 prochains jours
  const forecast: { date: string; estimatedQuestions: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(todayStart);
    date.setDate(date.getDate() + i);
    
    let count = 0;
    reviewStates.forEach(state => {
      const nextDate = state.nextReviewDate;
      const nextDateStart = new Date(
        nextDate.getFullYear(), 
        nextDate.getMonth(), 
        nextDate.getDate()
      );
      const targetDateStart = new Date(
        date.getFullYear(), 
        date.getMonth(), 
        date.getDate()
      );
      
      if (nextDateStart.getTime() === targetDateStart.getTime()) {
        count++;
      }
    });

    forecast.push({
      date: date.toISOString().split('T')[0],
      estimatedQuestions: count,
    });
  }

  return {
    newQuestions: newCount,
    learningQuestions: learningCount,
    masteredQuestions: masteredCount,
    dueToday: dueTodayCount,
    dueThisWeek: dueThisWeekCount + dueTodayCount,
    forecast,
  };
}

/**
 * Filtre les événements selon les paramètres
 */
export function filterEvents(
  events: ExtendedAnswerEvent[],
  params: StatsFilterParams
): ExtendedAnswerEvent[] {
  let filtered = [...events];

  // Filtrer par date
  if (params.from) {
    const fromDate = new Date(params.from);
    filtered = filtered.filter(e => e.timestamp >= fromDate);
  }

  if (params.to) {
    const toDate = new Date(params.to);
    filtered = filtered.filter(e => e.timestamp <= toDate);
  }

  // Filtrer par matière
  if (params.subject) {
    filtered = filtered.filter(e => e.subject === params.subject);
  }

  // Filtrer par tag
  if (params.tag) {
    filtered = filtered.filter(e => e.tags.includes(params.tag));
  }

  // Filtrer par difficulté
  if (params.difficulty !== undefined) {
    filtered = filtered.filter(e => e.difficulty === params.difficulty);
  }

  return filtered;
}

/**
 * Calcule le streak (série de jours consécutifs)
 */
export function calculateStreak(events: ExtendedAnswerEvent[]): {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
} {
  if (events.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Extraire les dates uniques
  const dates = new Set<string>();
  events.forEach(e => {
    const dateStr = e.timestamp.toISOString().split('T')[0];
    dates.add(dateStr);
  });

  const sortedDates = Array.from(dates).sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let previousDate: Date | null = null;

  // Trouver la dernière date
  const lastDateStr = sortedDates[sortedDates.length - 1];
  const lastDate = new Date(lastDateStr + 'T00:00:00Z');

  // Calculer le streak à partir de la dernière date
  let tempStreak = 0;
  let tempDate = new Date(lastDate);

  while (sortedDates.includes(tempDate.toISOString().split('T')[0])) {
    tempStreak++;
    tempDate = new Date(tempDate);
    tempDate.setDate(tempDate.getDate() - 1);
  }

  currentStreak = tempStreak;

  // Calculer le streak le plus long
  let currentLongest = 0;
  let tempLongest = 0;

  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const currentDate = new Date(sortedDates[i] + 'T00:00:00Z');
    
    if (i === sortedDates.length - 1) {
      tempLongest = 1;
      currentLongest = Math.max(currentLongest, tempLongest);
    } else {
      const prevDate = new Date(sortedDates[i + 1] + 'T00:00:00Z');
      const diffDays = (prevDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000);
      
      if (diffDays === 1) {
        tempLongest++;
        currentLongest = Math.max(currentLongest, tempLongest);
      } else {
        tempLongest = 1;
      }
    }
  }

  longestStreak = currentLongest;

  return {
    currentStreak,
    longestStreak,
    lastActivityDate: lastDateStr,
  };
}

/**
 * Calcule le temps moyen de réponse par catégorie
 */
export function calculateResponseTimeStats(events: ExtendedAnswerEvent[]): {
  avgBySubject: Map<string, number>;
  avgByTag: Map<string, number>;
  avgByDifficulty: Map<number, number>;
} {
  const subjectTimes = new Map<string, { total: number; count: number }>();
  const tagTimes = new Map<string, { total: number; count: number }>();
  const difficultyTimes = new Map<number, { total: number; count: number }>();

  events.forEach(event => {
    // Par matière
    if (event.subject) {
      if (!subjectTimes.has(event.subject)) {
        subjectTimes.set(event.subject, { total: 0, count: 0 });
      }
      const stat = subjectTimes.get(event.subject)!;
      stat.total += event.responseTime;
      stat.count++;
    }

    // Par tag
    event.tags.forEach(tag => {
      if (!tagTimes.has(tag)) {
        tagTimes.set(tag, { total: 0, count: 0 });
      }
      const stat = tagTimes.get(tag)!;
      stat.total += event.responseTime;
      stat.count++;
    });

    // Par difficulté
    if (!difficultyTimes.has(event.difficulty)) {
      difficultyTimes.set(event.difficulty, { total: 0, count: 0 });
    }
    const diffStat = difficultyTimes.get(event.difficulty)!;
    diffStat.total += event.responseTime;
    diffStat.count++;
  });

  return {
    avgBySubject: new Map(
      Array.from(subjectTimes.entries()).map(([key, stat]) => [
        key,
        stat.count > 0 ? Math.round(stat.total / stat.count) : 0,
      ])
    ),
    avgByTag: new Map(
      Array.from(tagTimes.entries()).map(([key, stat]) => [
        key,
        stat.count > 0 ? Math.round(stat.total / stat.count) : 0,
      ])
    ),
    avgByDifficulty: new Map(
      Array.from(difficultyTimes.entries()).map(([key, stat]) => [
        key,
        stat.count > 0 ? Math.round(stat.total / stat.count) : 0,
      ])
    ),
  };
}
