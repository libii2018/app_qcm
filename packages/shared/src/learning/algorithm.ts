/**
 * Algorithme de répétition espacée basé sur SM-2 adapté
 * 
 * Principe :
 * - Chaque question a un état de révision (intervalle, facteur de facilité, compteur de répétitions)
 * - Après une réponse correcte, l'intervalle augmente
 * - Après une réponse incorrecte, l'intervalle est réinitialisé
 * - Le facteur de facilité ajusté automatiquement
 */

import { Question } from '../types';

// État de révision pour une question
export interface ReviewState {
  questionId: string;
  nextReviewDate: Date;
  interval: number; // en jours
  easeFactor: number; // facteur de facilité (1.3 - 2.5)
  repetitionCount: number; // nombre de répétitions consécutives correctes
  lastReviewDate?: Date;
  consecutiveCorrect: number; // nombre de réponses correctes consécutives
  consecutiveIncorrect: number; // nombre de réponses incorrectes consécutives
}

// Constantes de l'algorithme
export const ALGORITHM_CONSTANTS = {
  INITIAL_INTERVAL: 1, // 1 jour pour la première révision
  INITIAL_EASE_FACTOR: 2.5,
  MIN_EASE_FACTOR: 1.3,
  MAX_EASE_FACTOR: 3.0, // Permet l'augmentation du facteur
  EASE_FACTOR_INCREMENT: 0.1,
  EASE_FACTOR_DECREMENT: 0.2,
  MIN_INTERVAL: 1,
  MAX_INTERVAL: 365, // 1 an maximum
  NEW_QUESTION_INTERVAL: 0, // Les nouvelles questions sont dues immédiatement
  GRADUATING_REPETITIONS: 2, // Nombre de répétitions pour passer à l'intervalle suivant
} as const;

/**
 * Crée un nouvel état de révision pour une question
 */
export function createInitialReviewState(questionId: string): ReviewState {
  return {
    questionId,
    nextReviewDate: new Date(), // Due immédiatement
    interval: ALGORITHM_CONSTANTS.NEW_QUESTION_INTERVAL,
    easeFactor: ALGORITHM_CONSTANTS.INITIAL_EASE_FACTOR,
    repetitionCount: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
  };
}

/**
 * Met à jour l'état de révision après une réponse
 * @param currentState État actuel (null si première révision)
 * @param isCorrect True si la réponse est correcte
 * @param question Difficulté de la question (1-5)
 * @returns Nouveau état de révision
 */
export function updateReviewState(
  currentState: ReviewState | null,
  isCorrect: boolean,
  questionDifficulty: number = 1
): ReviewState {
  const now = new Date();
  const constants = ALGORITHM_CONSTANTS;

  // Si c'est la première révision
  if (!currentState) {
    const nextInterval = isCorrect ? constants.INITIAL_INTERVAL : constants.NEW_QUESTION_INTERVAL;
    const nextDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);
    
    return {
      questionId: '', // À définir par l'appelant
      nextReviewDate: nextDate,
      interval: nextInterval,
      easeFactor: constants.INITIAL_EASE_FACTOR,
      repetitionCount: isCorrect ? 1 : 0,
      lastReviewDate: now,
      consecutiveCorrect: isCorrect ? 1 : 0,
      consecutiveIncorrect: isCorrect ? 0 : 1,
    };
  }

  let newEaseFactor = currentState.easeFactor;
  let newInterval = currentState.interval;
  let newRepetitionCount = currentState.repetitionCount;
  let newConsecutiveCorrect = currentState.consecutiveCorrect;
  let newConsecutiveIncorrect = currentState.consecutiveIncorrect;

  if (isCorrect) {
    // Réponse correcte
    newConsecutiveCorrect++;
    newConsecutiveIncorrect = 0;

    // Mise à jour du facteur de facilité
    // Plus la question est difficile, plus on augmente le facteur
    const difficultyMultiplier = 1 + (questionDifficulty - 1) * 0.1;
    newEaseFactor = Math.min(
      currentState.easeFactor + constants.EASE_FACTOR_INCREMENT * difficultyMultiplier,
      constants.MAX_EASE_FACTOR
    );

    // Calcul du nouvel intervalle
    if (currentState.repetitionCount === 0) {
      // Première réponse correcte
      newInterval = 1;
    } else if (currentState.repetitionCount === 1) {
      // Deuxième réponse correcte
      newInterval = 3;
    } else {
      // Réponses correctes suivantes
      newInterval = Math.round(currentState.interval * newEaseFactor);
    }

    // Limiter l'intervalle
    newInterval = Math.min(newInterval, constants.MAX_INTERVAL);

    // Incrémenter le compteur de répétitions
    newRepetitionCount = currentState.repetitionCount + 1;
  } else {
    // Réponse incorrecte
    newConsecutiveCorrect = 0;
    newConsecutiveIncorrect++;

    // Réduire le facteur de facilité
    newEaseFactor = Math.max(
      currentState.easeFactor - constants.EASE_FACTOR_DECREMENT,
      constants.MIN_EASE_FACTOR
    );

    // Réinitialiser l'intervalle
    newInterval = constants.NEW_QUESTION_INTERVAL;
    newRepetitionCount = 0;
  }

  // Calculer la prochaine date de révision
  const nextReviewDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  return {
    ...currentState,
    nextReviewDate,
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitionCount: newRepetitionCount,
    lastReviewDate: now,
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveIncorrect: newConsecutiveIncorrect,
  };
}

/**
 * Détermine si une question est due pour révision
 */
export function isDueForReview(state: ReviewState | null): boolean {
  if (!state) return true; // Nouvelle question
  if (state.interval === 0) return true; // Nouvelle question
  
  const now = new Date();
  return state.nextReviewDate <= now;
}

/**
 * Calcule la priorité d'une question pour la session du jour
 * Plus le score est élevé, plus la question est prioritaire
 */
export function calculateQuestionPriority(
  state: ReviewState | null,
  question: Question,
  weakAreas: Set<string>, // Tags/matières qui sont des points faibles
  lastAnswer?: { correct: boolean; timestamp: Date }
): number {
  if (!state) {
    // Nouvelle question : priorité moyenne
    return 50;
  }

  let priority = 0;

  // 1. Questions dues ont la priorité maximale
  if (isDueForReview(state)) {
    priority += 100;
  }

  // 2. Questions en retard
  const now = new Date();
  const daysOverdue = Math.max(0, Math.floor(
    (now.getTime() - state.nextReviewDate.getTime()) / (24 * 60 * 60 * 1000)
  ));
  priority += daysOverdue * 10;

  // 3. Questions avec un intervalle court (révision récente)
  if (state.interval <= 7) {
    priority += 30;
  } else if (state.interval <= 30) {
    priority += 20;
  } else if (state.interval <= 90) {
    priority += 10;
  }

  // 4. Questions avec un facteur de facilité bas (difficiles)
  if (state.easeFactor < 1.8) {
    priority += 25;
  } else if (state.easeFactor < 2.2) {
    priority += 15;
  }

  // 5. Questions mal répondues récemment
  if (lastAnswer && !lastAnswer.correct) {
    const hoursSinceLastAttempt = Math.floor(
      (now.getTime() - lastAnswer.timestamp.getTime()) / (60 * 60 * 1000)
    );
    // Plus l'erreur est récente, plus la priorité est élevée
    priority += Math.max(0, 50 - hoursSinceLastAttempt * 2);
  }

  // 6. Questions dans des zones faibles
  const questionTags = new Set([...question.tags, question.subject]);
  for (const tag of questionTags) {
    if (weakAreas.has(tag)) {
      priority += 20;
      break; // Compter une seule fois par question
    }
  }

  // 7. Questions avec une difficulté élevée
  priority += question.difficulty * 5;

  // 8. Questions avec peu de répétitions
  if (state.repetitionCount < 3) {
    priority += (3 - state.repetitionCount) * 10;
  }

  return Math.min(priority, 200); // Limiter à 200
}

/**
 * Catégorise une question selon son état d'apprentissage
 */
export function getQuestionCategory(state: ReviewState | null): 'new' | 'learning' | 'review' | 'mastered' {
  if (!state || state.repetitionCount === 0) {
    return 'new';
  }

  if (state.interval === 0) {
    return 'new';
  }

  // Moins de 3 répétitions ou intervalle < 30 jours = en apprentissage
  if (state.repetitionCount < 3 || state.interval < 30) {
    return 'learning';
  }

  // Intervalle court ou révisions récentes = en révision
  if (state.interval <= 90) {
    return 'review';
  }

  // Intervalle long = maîtrisé
  return 'mastered';
}

/**
 * Génère une explication pour pourquoi une question est proposée
 */
export function generateReviewReason(
  state: ReviewState | null,
  question: Question,
  lastAnswer?: { correct: boolean; timestamp: Date }
): string {
  if (!state) {
    return 'Nouvelle question';
  }

  const now = new Date();
  const daysSinceLastReview = state.lastReviewDate 
    ? Math.floor((now.getTime() - state.lastReviewDate.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  const daysUntilDue = Math.floor(
    (state.nextReviewDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (isDueForReview(state)) {
    if (daysUntilDue < 0) {
      const daysOverdue = -daysUntilDue;
      if (daysOverdue === 1) {
        return 'À réviser aujourd\'hui (en retard de 1 jour)';
      }
      return `À réviser aujourd\'hui (en retard de ${daysOverdue} jours)`;
    }
    
    if (state.interval === 1) {
      return 'Réviser après 1 jour';
    }
    return `À réviser aujourd\'hui (intervalle: ${state.interval} jours)`;
  }

  if (lastAnswer && !lastAnswer.correct) {
    const hoursSince = Math.floor(
      (now.getTime() - lastAnswer.timestamp.getTime()) / (60 * 60 * 1000)
    );
    if (hoursSince <= 24) {
      return 'Ratée il y a quelques heures';
    }
    if (hoursSince <= 48) {
      return 'Ratée hier';
    }
    const daysSince = Math.floor(hoursSince / 24);
    return `Ratée il y a ${daysSince} jours`;
  }

  if (state.easeFactor < 1.8) {
    return 'Question difficile (facteur de facilité bas)';
  }

  if (state.repetitionCount < 3) {
    return `Répétition ${state.repetitionCount + 1}/3 pour la mémorisation`;
  }

  if (daysSinceLastReview !== null && daysSinceLastReview > state.interval * 0.8) {
    return `Proche de la date de révision (${Math.round(state.interval - daysSinceLastReview)} jours restants)`;
  }

  return 'Révision programmée';
}
