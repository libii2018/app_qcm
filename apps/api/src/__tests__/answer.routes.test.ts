/**
 * Tests pour les routes des réponses
 */

import request from 'supertest';
import { getTestApp } from './testUtils';
import { createTestUser, authenticateUser, createTestQuiz } from './testUtils';
import { getTestPrisma } from './testUtils';

const app = getTestApp();
const prisma = getTestPrisma();

const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;

describe('POST /api/answers', () => {
  it('devrait enregistrer une réponse correcte', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    const answerData = {
      quizId: quiz.id,
      questionId: 'q1',
      correct: true,
      responseTime: 5000,
      usedHint: false,
      selectedOptions: ['a'],
    };

    const response = await request(app)
      .post('/api/answers')
      .set('Cookie', [`token=${token}`])
      .send(answerData)
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('answerEvent');
    expect(response.body.data.answerEvent.correct).toBe(true);
    expect(response.body.data.answerEvent.responseTime).toBe(5000);
    expect(response.body).toHaveProperty('message', 'Réponse enregistrée avec succès');

    // Vérifier en base
    const answers = await prisma.answerEvent.findMany({ where: { userId: user.id } });
    expect(answers).toHaveLength(1);
    expect(answers[0].correct).toBe(true);
    expect(answers[0].quizId).toBe(quiz.id);
  });

  it('devrait enregistrer une réponse incorrecte', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    const answerData = {
      quizId: quiz.id,
      questionId: 'q1',
      correct: false,
      responseTime: 10000,
      usedHint: true,
      selectedOptions: ['b'],
    };

    const response = await request(app)
      .post('/api/answers')
      .set('Cookie', [`token=${token}`])
      .send(answerData)
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.answerEvent.correct).toBe(false);
    expect(response.body.data.answerEvent.usedHint).toBe(true);

    // Vérifier en base
    const answers = await prisma.answerEvent.findMany({ where: { userId: user.id } });
    expect(answers).toHaveLength(1);
    expect(answers[0].correct).toBe(false);
    expect(answers[0].usedHint).toBe(true);
  });

  it('devrait créer un état de révision pour une nouvelle question', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const answerData = {
      questionId: 'new-question-id',
      correct: true,
      responseTime: 5000,
      selectedOptions: ['a'],
    };

    const response = await request(app)
      .post('/api/answers')
      .set('Cookie', [`token=${token}`])
      .send(answerData)
      .expect(201);

    expect(response.body).toHaveProperty('data');

    // Vérifier que l'état de révision a été créé
    const reviewStates = await prisma.reviewState.findMany({ 
      where: { userId: user.id } 
    });
    expect(reviewStates.length).toBeGreaterThan(0);
  });

  it('devrait refuser l\'enregistrement sans authentification', async () => {
    const answerData = {
      quizId: 'quiz-123',
      questionId: 'q1',
      correct: true,
      responseTime: 5000,
    };

    const response = await request(app)
      .post('/api/answers')
      .send(answerData)
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('devrait refuser l\'enregistrement avec des données invalides', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const invalidData = {
      // questionId manquant
      quizId: 'quiz-123',
      correct: true,
      responseTime: 5000,
    };

    const response = await request(app)
      .post('/api/answers')
      .set('Cookie', [`token=${token}`])
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/answers/session', () => {
  it('devrait enregistrer les réponses d\'une session complète', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    const sessionData = {
      quizId: quiz.id,
      questions: [
        {
          questionId: 'q1',
          quizId: quiz.id,
          correct: true,
          responseTime: 5000,
          usedHint: false,
          selectedOptions: ['a'],
        },
        {
          questionId: 'q2',
          quizId: quiz.id,
          correct: false,
          responseTime: 10000,
          usedHint: true,
          selectedOptions: ['b', 'c'],
        },
        {
          questionId: 'q3',
          quizId: quiz.id,
          correct: true,
          responseTime: 3000,
          usedHint: false,
          selectedOptions: ['a'],
        },
      ],
      totalQuestions: 3,
      correctCount: 2,
      totalTime: 18000,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    const response = await request(app)
      .post('/api/answers/session')
      .set('Cookie', [`token=${token}`])
      .send(sessionData)
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('session');
    expect(response.body.data.session.totalQuestions).toBe(3);
    expect(response.body.data.session.correctCount).toBe(2);
    expect(response.body.data.session.totalTime).toBe(18000);
    expect(response.body.data).toHaveProperty('answers');
    expect(response.body.data.answers).toHaveLength(3);
    expect(response.body).toHaveProperty('message', '3 réponses enregistrées avec succès');

    // Vérifier en base
    const answers = await prisma.answerEvent.findMany({ where: { userId: user.id } });
    expect(answers).toHaveLength(3);
  });

  it('devrait gérer les questions en double dans une session', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    const sessionData = {
      quizId: quiz.id,
      questions: [
        {
          questionId: 'q1',
          quizId: quiz.id,
          correct: true,
          responseTime: 5000,
          selectedOptions: ['a'],
          usedHint: false,
        },
        {
          questionId: 'q1', // Doublon
          quizId: quiz.id,
          correct: false,
          responseTime: 8000,
          selectedOptions: ['b'],
          usedHint: false,
        },
        {
          questionId: 'q2',
          quizId: quiz.id,
          correct: true,
          responseTime: 3000,
          selectedOptions: ['a'],
          usedHint: false,
        },
      ],
      totalQuestions: 3,
      correctCount: 2,
      totalTime: 16000,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    const response = await request(app)
      .post('/api/answers/session')
      .set('Cookie', [`token=${token}`])
      .send(sessionData)
      .expect(201);

    // Doit avoir 2 réponses (le doublon est ignoré)
    expect(response.body.data.answers).toHaveLength(2);

    // Vérifier en base
    const answers = await prisma.answerEvent.findMany({ where: { userId: user.id } });
    expect(answers).toHaveLength(2);
  });

  it('devrait refuser l\'enregistrement de session sans authentification', async () => {
    const sessionData = {
      quizId: 'quiz-123',
      questions: [
        {
          questionId: 'q1',
          correct: true,
          responseTime: 5000,
        },
      ],
      totalQuestions: 1,
      correctCount: 1,
      totalTime: 5000,
    };

    const response = await request(app)
      .post('/api/answers/session')
      .send(sessionData)
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('devrait refuser l\'enregistrement de session avec des données invalides', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const invalidSessionData = {
      // questions manquant
      totalQuestions: 1,
    };

    const response = await request(app)
      .post('/api/answers/session')
      .set('Cookie', [`token=${token}`])
      .send(invalidSessionData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});
