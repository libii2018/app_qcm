/**
 * Tests pour les routes de la page "Aujourd'hui"
 */

import request from 'supertest';
import { getTestApp } from './testUtils';
import { createTestUser, authenticateUser, createTestQuiz, createTestReviewState, createTestAnswerEvent } from './testUtils';
import { getTestPrisma } from './testUtils';

const app = getTestApp();
const prisma = getTestPrisma();

const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;

describe('GET /api/today', () => {
  it('devrait retourner la recommandation du jour avec des questions dues', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password, 'password');
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    // Créer des états de révision avec des questions dues aujourd'hui
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await createTestReviewState(user.id, 'q1', quiz.id);
    await createTestReviewState(user.id, 'q2', quiz.id);

    // Mettre à jour les dates pour qu'elles soient dues
    await prisma.reviewState.updateMany({
      where: { userId: user.id },
      data: { nextReviewDate: yesterday },
    });

    // Créer des réponses
    await createTestAnswerEvent(user.id, quiz.id, 'q1', true);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', false);

    const response = await request(app)
      .get('/api/today')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('session');
    expect(response.body.data.session).toHaveProperty('questions');
    expect(response.body.data.session).toHaveProperty('totalQuestions');
    expect(response.body.data).toHaveProperty('counts');
    expect(response.body.data.counts.dueToday).toBeGreaterThanOrEqual(2);
    expect(response.body.data).toHaveProperty('streak');
    expect(response.body.data).toHaveProperty('dailyGoal');
  });

  it('devrait retourner des questions de révision pour les erreurs', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    // Créer des réponses avec des erreurs
    await createTestAnswerEvent(user.id, quiz.id, 'q1', false);
    await createTestAnswerEvent(user.id, quiz.id, 'q1', false);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', true);

    const response = await request(app)
      .get('/api/today')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.session.questions.length).toBeGreaterThan(0);
  });

  it('devrait prendre en compte le dailyGoal', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    // Mettre à jour le dailyGoal à 5
    await prisma.user.update({
      where: { id: user.id },
      data: { dailyGoal: 5 },
    });

    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    // Créer plusieurs questions
    for (let i = 0; i < 10; i++) {
      await createTestAnswerEvent(user.id, quiz.id, `q${i}`, true);
    }

    const response = await request(app)
      .get('/api/today')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.data.dailyGoal).toBe(5);
    // La session ne devrait pas dépasser le dailyGoal
    expect(response.body.data.session.totalQuestions).toBeLessThanOrEqual(5);
  });

  it('devrait refuser l\'accès sans authentification', async () => {
    const response = await request(app)
      .get('/api/today')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/today/queue', () => {
  it('devrait retourner la file d\'attente de révision', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    // Créer des états de révision
    await createTestReviewState(user.id, 'q1', quiz.id);
    await createTestReviewState(user.id, 'q2', quiz.id);
    await createTestReviewState(user.id, 'q3', quiz.id);

    // Créer des réponses
    await createTestAnswerEvent(user.id, quiz.id, 'q1', true);
    await createTestAnswerEvent(user.id, quiz.id, 'q2', false);
    await createTestAnswerEvent(user.id, quiz.id, 'q3', false);

    const response = await request(app)
      .get('/api/today/queue')
      .query({ limit: 10 })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('queue');
    expect(Array.isArray(response.body.data.queue)).toBe(true);
    expect(response.body.data).toHaveProperty('total');
    expect(response.body.data).toHaveProperty('reasons');
  });

  it('devrait retourner un nombre limité de questions', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    // Créer plusieurs états de révision
    for (let i = 0; i < 20; i++) {
      await createTestReviewState(user.id, `q${i}`, quiz.id);
      await createTestAnswerEvent(user.id, quiz.id, `q${i}`, i % 2 === 0);
    }

    const response = await request(app)
      .get('/api/today/queue')
      .query({ limit: 5 })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.data.total).toBeGreaterThan(5);
    expect(response.body.data.queue.length).toBeLessThanOrEqual(5);
  });

  it('devrait refuser l\'accès sans authentification', async () => {
    const response = await request(app)
      .get('/api/today/queue')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
