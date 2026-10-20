/**
 * Tests pour les routes des statistiques
 */

import request from 'supertest';
import { getTestApp } from './testUtils';
import { createTestUser, authenticateUser, createTestQuiz, createTestAnswerEvent } from './testUtils';
import { getTestPrisma } from './testUtils';

const app = getTestApp();
const prisma = getTestPrisma();

const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;

describe('GET /api/stats', () => {
  it('devrait retourner les statistiques globales', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz1 = await createTestQuiz(user.id, { title: 'Quiz 1', subject: 'Anglais' });
    const quiz2 = await createTestQuiz(user.id, { title: 'Quiz 2', subject: 'Mathématiques' });

    // Créer des réponses
    await createTestAnswerEvent(user.id, quiz1.id, 'q1', true);
    await createTestAnswerEvent(user.id, quiz1.id, 'q2', false);
    await createTestAnswerEvent(user.id, quiz2.id, 'q1', true);
    await createTestAnswerEvent(user.id, quiz2.id, 'q2', true);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('overview');
    expect(response.body.data.overview.quizCount).toBe(2);
    expect(response.body.data.overview.answerCount).toBe(4);
    expect(response.body.data.overview.correctCount).toBe(3);
    expect(response.body.data.overview.incorrectCount).toBe(1);
    expect(response.body.data.overview.successRate).toBe(75);
    expect(response.body.data).toHaveProperty('learningStats');
    expect(response.body.data).toHaveProperty('weakAreas');
    expect(response.body.data).toHaveProperty('recentAnswers');
    expect(response.body.data.recentAnswers.length).toBeLessThanOrEqual(10);
  });

  it('devrait refuser l\'accès sans authentification', async () => {
    const response = await request(app)
      .get('/api/stats')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/stats/performance', () => {
  it('devrait retourner les statistiques de performance', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);

    // Créer des réponses
    await createTestAnswerEvent(user.id, quiz.id, 'q1', true);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', true);
    await createTestAnswerEvent(user.id, quiz.id, 'q3', false);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/performance')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('stats');
    expect(response.body.data.stats.totalAnswers).toBe(3);
    expect(response.body.data.stats.correctAnswers).toBe(2);
    expect(response.body.data.stats.incorrectAnswers).toBe(1);
    expect(response.body.data.stats.successRate).toBeCloseTo(66.67, 1);
  });

  it('devrait filtrer par matière', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz1 = await createTestQuiz(user.id, { title: 'Quiz Anglais', subject: 'Anglais' });
    const quiz2 = await createTestQuiz(user.id, { title: 'Quiz Maths', subject: 'Mathématiques' });

    await createTestAnswerEvent(user.id, quiz1.id, 'q1', true, true);
    await createTestAnswerEvent(user.id, quiz2.id, 'q1', false, false);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/performance')
      .query({ subject: 'Anglais' })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.data.stats.totalAnswers).toBe(1);
    expect(response.body.data.stats.correctAnswers).toBe(1);
  });
});

describe('GET /api/stats/tags', () => {
  it('devrait retourner les statistiques par tag', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);

    // Créer des réponses avec différents tags
    await createTestAnswerEvent(user.id, quiz.id, 'q1', true, true, ['grammaire']);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', true, true, ['grammaire']);
    await createTestAnswerEvent(user.id, quiz.id, 'q3', false, false, ['vocabulaire']);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/tags')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('stats');
    expect(response.body.data.stats).toHaveLength(2);

    const grammaireStats = response.body.data.stats.find((s: any) => s.tag === 'grammaire');
    expect(grammaireStats).toBeDefined();
    expect(grammaireStats.total).toBe(2);
    expect(grammaireStats.correct).toBe(2);
    expect(grammaireStats.successRate).toBe(100);
  });
});

describe('GET /api/stats/subjects', () => {
  it('devrait retourner les statistiques par matière', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz1 = await createTestQuiz(user.id, { title: 'Quiz Anglais', subject: 'Anglais' });
    const quiz2 = await createTestQuiz(user.id, { title: 'Quiz Maths', subject: 'Mathématiques' });

    await createTestAnswerEvent(user.id, quiz1.id, 'q1', true, true, [], 'Anglais');
    await createTestAnswerEvent(user.id, quiz1.id, 'q2', false, false, [], 'Anglais');
    await createTestAnswerEvent(user.id, quiz2.id, 'q1', true, true, [], 'Mathématiques');

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/subjects')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('stats');
    expect(response.body.data.stats).toHaveLength(2);

    const anglaisStats = response.body.data.stats.find((s: any) => s.subject === 'Anglais');
    expect(anglaisStats).toBeDefined();
    expect(anglaisStats.total).toBe(2);
    expect(anglaisStats.correct).toBe(1);
  });
});

describe('GET /api/stats/daily', () => {
  it('devrait retourner les statistiques journalières', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);

    // Créer des réponses
    await createTestAnswerEvent(user.id, quiz.id, 'q1', true);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', false);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/daily')
      .query({ days: 7 })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('stats');
    expect(Array.isArray(response.body.data.stats)).toBe(true);
  });
});

describe('GET /api/stats/learning', () => {
  it('devrait retourner les statistiques d\'apprentissage', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);

    // Créer des réponses
    await createTestAnswerEvent(user.id, quiz.id, 'q1', true);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', false);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/learning')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('learningStats');
    expect(response.body.data.learningStats).toHaveProperty('totalQuestions');
    expect(response.body.data.learningStats).toHaveProperty('dueToday');
    expect(response.body.data.learningStats).toHaveProperty('dueThisWeek');
    expect(response.body.data.learningStats).toHaveProperty('learning');
    expect(response.body.data.learningStats).toHaveProperty('mastered');
  });
});

describe('GET /api/stats/failed-questions', () => {
  it('devrait retourner les questions les plus ratées', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);

    // Créer des réponses avec des erreurs
    await createTestAnswerEvent(user.id, quiz.id, 'q1', false);
    await createTestAnswerEvent(user.id, quiz.id, 'q1', false);
    await createTestAnswerEvent(user.id, quiz.id, 'q1', false);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', false);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', false);
    await createTestAnswerEvent(user.id, quiz.id, 'q3', true);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/failed-questions')
      .query({ limit: 10 })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('failedQuestions');
    expect(response.body.data.failedQuestions.length).toBeGreaterThan(0);

    // q1 devrait être dans les plus ratées
    const q1Failed = response.body.data.failedQuestions.find((fq: any) => fq.questionId === 'q1');
    expect(q1Failed).toBeDefined();
    expect(q1Failed.failureCount).toBeGreaterThanOrEqual(3);
  });
});

describe('GET /api/stats/weak-areas', () => {
  it('devrait retourner les zones faibles', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);

    // Créer des réponses avec des tags de points faibles
    await createTestAnswerEvent(user.id, quiz.id, 'q1', false, false, ['grammaire']);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', false, false, ['grammaire']);
    await createTestAnswerEvent(user.id, quiz.id, 'q3', false, false, ['grammaire']);
    await createTestAnswerEvent(user.id, quiz.id, 'q4', true, false, ['vocabulaire']);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/weak-areas')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('weakAreas');
    expect(Array.isArray(response.body.data.weakAreas)).toBe(true);

    // grammaire devrait être une zone faible
    const grammaireWeak = response.body.data.weakAreas.find((wa: any) => wa.tag === 'grammaire');
    expect(grammaireWeak).toBeDefined();
  });
});

describe('GET /api/stats/streak', () => {
  it('devrait retourner le streak', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);

    // Créer des réponses sur plusieurs jours
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      await prisma.answerEvent.create({
        data: {
          userId: user.id,
          quizId: quiz.id,
          questionId: `q-${i}`,
          correct: true,
          responseTime: 5000,
          usedHint: false,
          selectedOptions: ['a'],
          tags: ['test'],
          subject: 'Test',
          difficulty: 1,
          timestamp: date,
        },
      });
    }

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/streak')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('streak');
    expect(response.body.data.streak).toHaveProperty('currentStreak');
    expect(response.body.data.streak).toHaveProperty('longestStreak');
  });
});

describe('GET /api/stats/response-time', () => {
  it('devrait retourner les statistiques de temps de réponse', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz1 = await createTestQuiz(user.id, { title: 'Quiz Anglais', subject: 'Anglais' });
    const quiz2 = await createTestQuiz(user.id, { title: 'Quiz Maths', subject: 'Mathématiques' });

    await createTestAnswerEvent(user.id, quiz1.id, 'q1', true, false, [], 'Anglais', 1, 5000);
    await createTestAnswerEvent(user.id, quiz1.id, 'q2', true, false, [], 'Anglais', 1, 3000);
    await createTestAnswerEvent(user.id, quiz2.id, 'q1', true, false, [], 'Mathématiques', 2, 8000);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/stats/response-time')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('avgBySubject');
    expect(response.body.data).toHaveProperty('avgByTag');
    expect(response.body.data).toHaveProperty('avgByDifficulty');
  });
});
