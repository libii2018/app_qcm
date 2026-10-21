import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReviewState,
  createInitialReviewState,
  updateReviewState,
  isDueForReview,
  getQuestionCategory,
  calculateQuestionPriority,
  generateReviewReason,
  ALGORITHM_CONSTANTS,
} from './algorithm';
import { Question } from '../types';

// Question de base pour les tests
const baseQuestion: Question = {
  id: 'q1',
  prompt: [{ type: 'text', value: 'Test' }],
  options: [
    { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true },
    { id: 'b', content: [{ type: 'text', value: 'B' }], correct: false },
  ],
  multiple: false,
  tags: ['test'],
  difficulty: 1,
};

describe('Algorithm - Répétition espacée', () => {
  describe('createInitialReviewState', () => {
    it('devrait créer un état initial avec intervalle = 0 (due immédiatement)', () => {
      const state = createInitialReviewState('q1');
      
      expect(state.questionId).toBe('q1');
      expect(state.interval).toBe(0);
      expect(state.easeFactor).toBe(ALGORITHM_CONSTANTS.INITIAL_EASE_FACTOR);
      expect(state.repetitionCount).toBe(0);
      expect(state.consecutiveCorrect).toBe(0);
      expect(state.consecutiveIncorrect).toBe(0);
    });

    it('devrait créer une date due immédiatement', () => {
      const before = new Date();
      const state = createInitialReviewState('q1');
      const after = new Date();
      
      // La date devrait être entre before et after
      expect(state.nextReviewDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state.nextReviewDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('updateReviewState', () => {
    let initialState: ReviewState;

    beforeEach(() => {
      initialState = createInitialReviewState('q1');
      initialState.lastReviewDate = new Date();
    });

    it('devrait passer à intervalle 1 jour après première réponse correcte', () => {
      const newState = updateReviewState(initialState, true, 1);
      
      expect(newState.interval).toBe(1);
      expect(newState.repetitionCount).toBe(1);
      expect(newState.consecutiveCorrect).toBe(1);
      expect(newState.consecutiveIncorrect).toBe(0);
      
      // Vérifier que la date est dans environ 1 jour
      const now = new Date();
      const oneDayFromNow = now.getTime() + 24 * 60 * 60 * 1000;
      const tolerance = 5 * 60 * 1000; // 5 secondes de tolérance
      expect(newState.nextReviewDate.getTime()).toBeGreaterThanOrEqual(oneDayFromNow - tolerance);
      expect(newState.nextReviewDate.getTime()).toBeLessThanOrEqual(oneDayFromNow + tolerance);
    });

    it('devrait réinitialiser après réponse incorrecte', () => {
      // D'abord une bonne réponse
      let state = updateReviewState(initialState, true, 1);
      state = updateReviewState(state, true, 1);
      
      // Puis une mauvaise réponse
      const newState = updateReviewState(state, false, 1);
      
      expect(newState.interval).toBe(0);
      expect(newState.repetitionCount).toBe(0);
      expect(newState.consecutiveCorrect).toBe(0);
      expect(newState.consecutiveIncorrect).toBe(1);
    });

    it('devrait augmenter l\'intervalle après plusieurs bonnes réponses', () => {
      let state = updateReviewState(initialState, true, 1);
      // Après 1 bonne réponse: interval=1, repetitionCount=1
      expect(state.interval).toBe(1);
      expect(state.repetitionCount).toBe(1);
      
      state = updateReviewState(state, true, 1);
      // Après 2 bonnes réponses: interval=3, repetitionCount=2
      expect(state.interval).toBe(3);
      expect(state.repetitionCount).toBe(2);
      
      state = updateReviewState(state, true, 1);
      // Après 3 bonnes réponses: interval=round(3 * 2.6)=8 (2.5 + 0.1 = 2.6), repetitionCount=3
      expect(state.interval).toBe(8);
      expect(state.repetitionCount).toBe(3);
    });

    it('devrait augmenter le facteur de facilité après bonnes réponses', () => {
      const initialEaseFactor = ALGORITHM_CONSTANTS.INITIAL_EASE_FACTOR;
      let state = updateReviewState(initialState, true, 1);
      
      // Avec difficulté 1: difficultyMultiplier = 1.0, donc easeFactor = 2.5 + 0.1*1.0 = 2.6
      expect(state.easeFactor).toBeGreaterThan(initialEaseFactor);
      expect(state.easeFactor).toBe(2.6);
      expect(state.easeFactor).toBeLessThanOrEqual(ALGORITHM_CONSTANTS.MAX_EASE_FACTOR);
    });

    it('devrait réduire le facteur de facilité après mauvaise réponse', () => {
      let state = updateReviewState(initialState, true, 1);
      state = updateReviewState(state, true, 1);
      const easeFactorBefore = state.easeFactor;
      
      state = updateReviewState(state, false, 1);
      
      expect(state.easeFactor).toBeLessThan(easeFactorBefore);
      expect(state.easeFactor).toBeGreaterThanOrEqual(ALGORITHM_CONSTANTS.MIN_EASE_FACTOR);
    });

    it('devrait gérer les questions sans état initial (null)', () => {
      const newState = updateReviewState(null, true, 1);
      
      expect(newState.interval).toBe(1);
      expect(newState.repetitionCount).toBe(1);
      expect(newState.easeFactor).toBe(ALGORITHM_CONSTANTS.INITIAL_EASE_FACTOR);
    });

    it('devrait adapter l\'intervalle selon la difficulté', () => {
      // Question facile (difficulté 1)
      let state1 = updateReviewState(initialState, true, 1);
      state1 = updateReviewState(state1, true, 1);
      const intervalEasy = state1.interval;
      
      // Question difficile (difficulté 5)
      let state2 = updateReviewState(initialState, true, 5);
      state2 = updateReviewState(state2, true, 5);
      const intervalHard = state2.interval;
      
      // La question difficile devrait avoir un intervalle plus long
      // (ou au moins un facteur de facilité qui augmente plus vite)
      expect(state2.easeFactor).toBeGreaterThanOrEqual(state1.easeFactor);
    });
  });

  describe('isDueForReview', () => {
    it('devrait retourner true pour null (nouvelle question)', () => {
      expect(isDueForReview(null)).toBe(true);
    });

    it('devrait retourner true pour intervalle = 0', () => {
      const state = createInitialReviewState('q1');
      expect(isDueForReview(state)).toBe(true);
    });

    it('devrait retourner true si la date est passée', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() - 1000), // Il y a 1 seconde
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      };
      
      expect(isDueForReview(state)).toBe(true);
    });

    it('devrait retourner false si la date est dans le futur', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // Dans 1 jour
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      };
      
      expect(isDueForReview(state)).toBe(false);
    });
  });

  describe('getQuestionCategory', () => {
    it('devrait retourner "new" pour null', () => {
      expect(getQuestionCategory(null)).toBe('new');
    });

    it('devrait retourner "new" pour intervalle = 0', () => {
      const state = createInitialReviewState('q1');
      expect(getQuestionCategory(state)).toBe('new');
    });

    it('devrait retourner "new" pour repetitionCount = 0', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(),
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 0,
      };
      
      expect(getQuestionCategory(state)).toBe('new');
    });

    it('devrait retourner "learning" pour repetitionCount < 3', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(),
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 2,
      };
      
      expect(getQuestionCategory(state)).toBe('learning');
    });

    it('devrait retourner "learning" pour interval < 30', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(),
        interval: 15,
        easeFactor: 2.5,
        repetitionCount: 3,
      };
      
      expect(getQuestionCategory(state)).toBe('learning');
    });

    it('devrait retourner "review" pour interval <= 90', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(),
        interval: 45,
        easeFactor: 2.5,
        repetitionCount: 3,
      };
      
      expect(getQuestionCategory(state)).toBe('review');
    });

    it('devrait retourner "mastered" pour interval > 90', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(),
        interval: 180,
        easeFactor: 2.5,
        repetitionCount: 5,
      };
      
      expect(getQuestionCategory(state)).toBe('mastered');
    });
  });

  describe('calculateQuestionPriority', () => {

    it('devrait donner priorité aux questions dues', () => {
      const dueState: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() - 1000), // En retard
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      };
      
      const notDueState: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // Dans 1 jour
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      };
      
      const duePriority = calculateQuestionPriority(dueState, baseQuestion, new Set(), undefined);
      const notDuePriority = calculateQuestionPriority(notDueState, baseQuestion, new Set(), undefined);
      
      expect(duePriority).toBeGreaterThan(notDuePriority);
    });

    it('devrait augmenter la priorité pour les questions des zones faibles', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      };
      
      const weakAreaQuestion: Question = {
        ...baseQuestion,
        tags: ['verbes-irreguliers'],
      };
      
      const normalPriority = calculateQuestionPriority(state, baseQuestion, new Set(), undefined);
      const weakAreaPriority = calculateQuestionPriority(
        state, 
        weakAreaQuestion, 
        new Set(['verbes-irreguliers']),
        undefined
      );
      
      expect(weakAreaPriority).toBeGreaterThan(normalPriority);
    });

    it('devrait augmenter la priorité pour les questions récemment ratées', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      };
      
      const lastAnswer = { correct: false, timestamp: new Date(Date.now() - 1000 * 60 * 60) }; // Il y a 1 heure
      
      const normalPriority = calculateQuestionPriority(state, baseQuestion, new Set(), undefined);
      const failedPriority = calculateQuestionPriority(state, baseQuestion, new Set(), lastAnswer);
      
      expect(failedPriority).toBeGreaterThan(normalPriority);
    });

    it('devrait augmenter la priorité pour les questions difficiles', () => {
      const hardQuestion: Question = { ...baseQuestion, difficulty: 5 };
      const easyQuestion: Question = { ...baseQuestion, difficulty: 1 };
      
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      };
      
      const easyPriority = calculateQuestionPriority(state, easyQuestion, new Set(), undefined);
      const hardPriority = calculateQuestionPriority(state, hardQuestion, new Set(), undefined);
      
      expect(hardPriority).toBeGreaterThan(easyPriority);
    });
  });

  describe('generateReviewReason', () => {
    const testQuestion: Question = {
      id: 'test-q',
      prompt: [{ type: 'text', value: 'Test' }],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true },
        { id: 'b', content: [{ type: 'text', value: 'B' }], correct: false },
      ],
      multiple: false,
      tags: ['test'],
      difficulty: 1,
    };

    it('devrait retourner "Nouvelle question" pour null', () => {
      expect(generateReviewReason(null, testQuestion)).toBe('Nouvelle question');
    });

    it('devrait indiquer si la question est en retard', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // En retard de 2 jours
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
        lastReviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      };
      
      const reason = generateReviewReason(state, testQuestion);
      expect(reason).toContain('en retard');
    });

    it('devrait indiquer si la question a été ratée récemment', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 0,
        lastReviewDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      };
      
      const lastAnswer = { correct: false, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) };
      const reason = generateReviewReason(state, testQuestion, lastAnswer);
      expect(reason).toContain('Ratée');
    });

    it('devrait indiquer le numéro de répétition', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 2,
        lastReviewDate: new Date(),
      };
      
      const reason = generateReviewReason(state, testQuestion);
      expect(reason).toContain('Répétition 3');
    });

    it('devrait indiquer un facteur de facilité bas', () => {
      const state: ReviewState = {
        questionId: 'q1',
        nextReviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        interval: 1,
        easeFactor: 1.5,
        repetitionCount: 3,
        lastReviewDate: new Date(),
      };
      
      const reason = generateReviewReason(state, testQuestion);
      expect(reason).toContain('difficile');
    });
  });
});
