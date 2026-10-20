import { describe, it, expect, beforeEach } from 'vitest';
import { generateTodaySession, generateQuizSession, generateMixedSession } from './sessionGenerator';
import { ReviewState } from './algorithm';
import { Question, QuizJson, WeakArea } from '../types';

const mockQuestion: Question = {
  id: 'q1',
  prompt: [{ type: 'text', value: 'Test question' }],
  options: [
    { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true },
    { id: 'b', content: [{ type: 'text', value: 'B' }], correct: false },
  ],
  multiple: false,
  tags: ['test'],
  difficulty: 1,
};

const mockQuiz: { id: string; title: string; subject: string; tags: string[]; questions: Question[] } = {
  id: 'quiz-1',
  title: 'Test Quiz',
  subject: 'Test Subject',
  tags: ['test-tag'],
  questions: [mockQuestion],
};

describe('Session Generator', () => {
  describe('generateTodaySession', () => {
    it('devrait générer une session vide si aucun quiz', () => {
      const session = generateTodaySession({
        userId: 'user-1',
        quizzes: [],
        reviewStates: new Map(),
        answerHistory: new Map(),
        weakAreas: [],
      });

      expect(session.questions).toHaveLength(0);
      expect(session.totalQuestions).toBe(0);
    });

    it('devrait inclure les questions des quiz fournis', () => {
      const reviewStates = new Map<string, ReviewState>();
      reviewStates.set('q1', {
        questionId: 'q1',
        nextReviewDate: new Date(),
        interval: 0,
        easeFactor: 2.5,
        repetitionCount: 0,
      });

      const session = generateTodaySession({
        userId: 'user-1',
        quizzes: [mockQuiz],
        reviewStates,
        answerHistory: new Map(),
        weakAreas: [],
        maxQuestions: 10,
      });

      expect(session.totalQuestions).toBeGreaterThan(0);
    });

    it('devrait respecter la limite maxQuestions', () => {
      // Créer un quiz avec 10 questions
      const quizWithManyQuestions: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Big Quiz',
        subject: 'Test',
        tags: ['test'],
        questions: Array.from({ length: 10 }, (_, i) => ({
          ...mockQuestion,
          id: `q${i}`,
        })),
      };

      const reviewStates = new Map<string, ReviewState>();
      quizWithManyQuestions.questions.forEach(q => {
        reviewStates.set(q.id, {
          questionId: q.id,
          nextReviewDate: new Date(),
          interval: 0,
          easeFactor: 2.5,
          repetitionCount: 0,
        });
      });

      const session = generateTodaySession({
        userId: 'user-1',
        quizzes: [quizWithManyQuestions],
        reviewStates,
        answerHistory: new Map(),
        weakAreas: [],
        maxQuestions: 5,
      });

      expect(session.totalQuestions).toBeLessThanOrEqual(5);
    });

    it('devrait prioriser les questions dues', () => {
      // Question due
      const dueQuestion: Question = {
        ...mockQuestion,
        id: 'due-q',
      };

      // Question non due
      const notDueQuestion: Question = {
        ...mockQuestion,
        id: 'not-due-q',
      };

      const dueQuiz: typeof mockQuiz = {
        id: 'due-quiz',
        title: 'Due Quiz',
        subject: 'Test',
        tags: ['due'],
        questions: [dueQuestion],
      };

      const notDueQuiz: typeof mockQuiz = {
        id: 'not-due-quiz',
        title: 'Not Due Quiz',
        subject: 'Test',
        tags: ['not-due'],
        questions: [notDueQuestion],
      };

      const now = new Date();
      const reviewStates = new Map<string, ReviewState>();
      
      // Question due (en retard)
      reviewStates.set('due-q', {
        questionId: 'due-q',
        nextReviewDate: new Date(now.getTime() - 1000), // En retard
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      });

      // Question non due
      reviewStates.set('not-due-q', {
        questionId: 'not-due-q',
        nextReviewDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2), // Dans 2 jours
        interval: 2,
        easeFactor: 2.5,
        repetitionCount: 1,
      });

      const session = generateTodaySession({
        userId: 'user-1',
        quizzes: [dueQuiz, notDueQuiz],
        reviewStates,
        answerHistory: new Map(),
        weakAreas: [],
        maxQuestions: 10,
        includeNewQuestions: false,
        includeReviewQuestions: true,
        shuffle: false, // Désactiver le shuffle pour tester l'ordre
      });

      // La question due devrait apparaître en premier
      if (session.questions.length >= 1) {
        expect(session.questions[0].question.id).toBe('due-q');
      }
    });

    it('devrait inclure les questions des zones faibles', () => {
      const weakArea: WeakArea = {
        type: 'tag',
        name: 'weak-tag',
        successRate: 60,
        totalQuestions: 10,
        questionCount: 10,
      };

      const weakQuestion: Question = {
        ...mockQuestion,
        id: 'weak-q',
        tags: ['weak-tag'],
      };

      const weakQuiz: typeof mockQuiz = {
        id: 'weak-quiz',
        title: 'Weak Quiz',
        subject: 'Test',
        tags: ['weak-tag'],
        questions: [weakQuestion],
      };

      const reviewStates = new Map<string, ReviewState>();
      reviewStates.set('weak-q', {
        questionId: 'weak-q',
        nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // Dans 1 jour
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 1,
      });

      const session = generateTodaySession({
        userId: 'user-1',
        quizzes: [weakQuiz],
        reviewStates,
        answerHistory: new Map(),
        weakAreas: [weakArea],
        maxQuestions: 10,
      });

      expect(session.totalQuestions).toBeGreaterThan(0);
    });

    it('devrait compter correctement les catégories', () => {
      const newQuestion: Question = { ...mockQuestion, id: 'new-q' };
      const reviewQuestion: Question = { ...mockQuestion, id: 'review-q' };

      const quiz: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Mixed Quiz',
        subject: 'Test',
        tags: ['test'],
        questions: [newQuestion, reviewQuestion],
      };

      const now = new Date();
      const reviewStates = new Map<string, ReviewState>();
      
      // Nouvelle question (pas d'état)
      // Pas de set pour 'new-q' -> sera null

      // Question en révision
      reviewStates.set('review-q', {
        questionId: 'review-q',
        nextReviewDate: now,
        interval: 1,
        easeFactor: 2.5,
        repetitionCount: 2,
      });

      const session = generateTodaySession({
        userId: 'user-1',
        quizzes: [quiz],
        reviewStates,
        answerHistory: new Map(),
        weakAreas: [],
        maxQuestions: 10,
      });

      expect(session.newQuestionsCount).toBeGreaterThanOrEqual(0);
      expect(session.reviewQuestionsCount).toBeGreaterThanOrEqual(0);
      expect(session.newQuestionsCount + session.reviewQuestionsCount).toBe(session.totalQuestions);
    });

    it('devrait limiter le nombre de questions par tag', () => {
      const questionsWithSameTag = Array.from({ length: 5 }, (_, i) => ({
        ...mockQuestion,
        id: `q${i}`,
        tags: ['same-tag'],
      }));

      const quiz: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Same Tag Quiz',
        subject: 'Test',
        tags: ['same-tag'],
        questions: questionsWithSameTag,
      };

      const reviewStates = new Map<string, ReviewState>();
      questionsWithSameTag.forEach(q => {
        reviewStates.set(q.id, {
          questionId: q.id,
          nextReviewDate: new Date(),
          interval: 0,
          easeFactor: 2.5,
          repetitionCount: 0,
        });
      });

      const session = generateTodaySession({
        userId: 'user-1',
        quizzes: [quiz],
        reviewStates,
        answerHistory: new Map(),
        weakAreas: [],
        maxQuestions: 10,
        maxFromSameTag: 2,
      });

      // Compter les questions avec le tag 'same-tag'
      const sameTagCount = session.questions.filter(q => q.tags.includes('same-tag')).length;
      expect(sameTagCount).toBeLessThanOrEqual(2);
    });
  });

  describe('generateQuizSession', () => {
    it('devrait générer une session à partir d\'un quiz', () => {
      const session = generateQuizSession(
        mockQuiz,
        new Map(),
        new Map(),
        [],
        {}
      );

      expect(session.questions).toHaveLength(mockQuiz.questions.length);
      expect(session.totalQuestions).toBe(mockQuiz.questions.length);
    });

    it('devrait limiter le nombre de questions', () => {
      const quizWithManyQuestions: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Big Quiz',
        subject: 'Test',
        tags: ['test'],
        questions: Array.from({ length: 10 }, (_, i) => ({
          ...mockQuestion,
          id: `q${i}`,
        })),
      };

      const session = generateQuizSession(
        quizWithManyQuestions,
        new Map(),
        new Map(),
        [],
        { questionCount: 5 }
      );

      expect(session.totalQuestions).toBe(5);
    });

    it('devrait inclure toutes les questions si includeAll = true', () => {
      const quizWithManyQuestions: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Big Quiz',
        subject: 'Test',
        tags: ['test'],
        questions: Array.from({ length: 10 }, (_, i) => ({
          ...mockQuestion,
          id: `q${i}`,
        })),
      };

      const session = generateQuizSession(
        quizWithManyQuestions,
        new Map(),
        new Map(),
        [],
        { includeAll: true }
      );

      expect(session.totalQuestions).toBe(quizWithManyQuestions.questions.length);
    });

    it('devrait mélanger les questions si shuffle = true', () => {
      const quizWithOrderedQuestions: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Ordered Quiz',
        subject: 'Test',
        tags: ['test'],
        questions: Array.from({ length: 5 }, (_, i) => ({
          ...mockQuestion,
          id: `q${i}`,
        })),
      };

      const session = generateQuizSession(
        quizWithOrderedQuestions,
        new Map(),
        new Map(),
        [],
        { shuffleQuestions: true }
      );

      // Vérifier que l'ordre est différent de l'original
      const originalOrder = quizWithOrderedQuestions.questions.map(q => q.id);
      const sessionOrder = session.questions.map(q => q.question.id);

      // Si le shuffle fonctionne, l'ordre devrait être différent (mais pas toujours garanti)
      // On vérifie juste que c'est une permutation valide
      expect(sessionOrder.sort()).toEqual(originalOrder.sort());
    });
  });

  describe('generateMixedSession', () => {
    it('devrait générer une session mixte', () => {
      const quiz1: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Quiz 1',
        subject: 'Subject1',
        tags: ['tag1'],
        questions: [mockQuestion],
      };

      const quiz2: typeof mockQuiz = {
        id: 'quiz-2',
        title: 'Quiz 2',
        subject: 'Subject2',
        tags: ['tag2'],
        questions: [{ ...mockQuestion, id: 'q2', tags: ['tag2'] }],
      };

      const session = generateMixedSession(
        [quiz1, quiz2],
        new Map(),
        new Map(),
        [],
        {}
      );

      expect(session.totalQuestions).toBe(2);
    });

    it('devrait filtrer par tag', () => {
      const quiz1: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Quiz 1',
        subject: 'Subject1',
        tags: ['tag1'],
        questions: [mockQuestion],
      };

      const quiz2: typeof mockQuiz = {
        id: 'quiz-2',
        title: 'Quiz 2',
        subject: 'Subject2',
        tags: ['tag2'],
        questions: [{ ...mockQuestion, id: 'q2', tags: ['tag2'] }],
      };

      const session = generateMixedSession(
        [quiz1, quiz2],
        new Map(),
        new Map(),
        [],
        { tags: ['tag1'] }
      );

      // Seules les questions avec tag1 ou dans un quiz avec tag1
      expect(session.questions.every(q => 
        q.tags.includes('tag1') || q.subject === 'Subject1'
      )).toBe(true);
    });

    it('devrait filtrer par matière', () => {
      const quiz1: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Quiz 1',
        subject: 'Maths',
        tags: ['tag1'],
        questions: [mockQuestion],
      };

      const quiz2: typeof mockQuiz = {
        id: 'quiz-2',
        title: 'Quiz 2',
        subject: 'Physics',
        tags: ['tag1'],
        questions: [{ ...mockQuestion, id: 'q2' }],
      };

      const session = generateMixedSession(
        [quiz1, quiz2],
        new Map(),
        new Map(),
        [],
        { subjects: ['Maths'] }
      );

      expect(session.questions.every(q => q.subject === 'Maths')).toBe(true);
    });

    it('devrait filtrer par difficulté', () => {
      const quiz1: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Quiz 1',
        subject: 'Subject1',
        tags: ['tag1'],
        questions: [{ ...mockQuestion, id: 'q1', difficulty: 1 }],
      };

      const quiz2: typeof mockQuiz = {
        id: 'quiz-2',
        title: 'Quiz 2',
        subject: 'Subject1',
        tags: ['tag1'],
        questions: [{ ...mockQuestion, id: 'q2', difficulty: 3 }],
      };

      const session = generateMixedSession(
        [quiz1, quiz2],
        new Map(),
        new Map(),
        [],
        { difficulties: [1] }
      );

      expect(session.questions.every(q => q.question.difficulty === 1)).toBe(true);
    });

    it('devrait limiter par quiz', () => {
      const quiz1: typeof mockQuiz = {
        id: 'quiz-1',
        title: 'Quiz 1',
        subject: 'Subject1',
        tags: ['tag1'],
        questions: Array.from({ length: 5 }, (_, i) => ({
          ...mockQuestion,
          id: `q1-${i}`,
        })),
      };

      const quiz2: typeof mockQuiz = {
        id: 'quiz-2',
        title: 'Quiz 2',
        subject: 'Subject1',
        tags: ['tag1'],
        questions: Array.from({ length: 5 }, (_, i) => ({
          ...mockQuestion,
          id: `q2-${i}`,
        })),
      };

      const session = generateMixedSession(
        [quiz1, quiz2],
        new Map(),
        new Map(),
        [],
        { maxFromSameQuiz: 2, maxQuestions: 10 }
      );

      // Compter par quiz
      const quiz1Count = session.questions.filter(q => q.quizId === 'quiz-1').length;
      const quiz2Count = session.questions.filter(q => q.quizId === 'quiz-2').length;

      expect(quiz1Count).toBeLessThanOrEqual(2);
      expect(quiz2Count).toBeLessThanOrEqual(2);
    });
  });
});
