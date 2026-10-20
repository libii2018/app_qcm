/**
 * Tests pour les routes des quiz
 */

import request from 'supertest';
import { getTestApp } from './testUtils';
import { createTestUser, authenticateUser, createTestQuiz } from './testUtils';
import { getTestPrisma } from './testUtils';

const app = getTestApp();
const prisma = getTestPrisma();

const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;

// Quiz JSON valide pour les tests
const validQuizJson = {
  schemaVersion: 1,
  id: `quiz-test-${Date.now()}`,
  title: 'Quiz de test',
  subject: 'Test',
  tags: ['test', 'exemple'],
  difficulty: 1,
  description: 'Description du quiz',
  questions: [
    {
      id: 'q1',
      prompt: [{ type: 'text', value: 'Question 1 ?' }],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'Réponse 1' }], correct: true },
        { id: 'b', content: [{ type: 'text', value: 'Réponse 2' }], correct: false },
      ],
      multiple: false,
      hint: 'Indice pour la question 1',
      explanation: 'Explication pour la question 1',
      tags: ['test'],
      difficulty: 1,
    },
    {
      id: 'q2',
      prompt: [{ type: 'text', value: 'Question 2 ?' }],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'Réponse A' }], correct: true },
        { id: 'b', content: [{ type: 'text', value: 'Réponse B' }], correct: true },
        { id: 'c', content: [{ type: 'text', value: 'Réponse C' }], correct: false },
      ],
      multiple: true,
      hint: 'Indice pour la question 2',
      explanation: 'Explication pour la question 2',
      tags: ['multiple'],
      difficulty: 2,
    },
  ],
};

describe('GET /api/quizzes', () => {
  it('devrait retourner la liste des quiz de l\'utilisateur', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    // Créer un utilisateur et un quiz
    const { user } = await createTestUser(email, password);
    await createTestQuiz(user.id, { title: 'Mon Quiz' });
    await createTestQuiz(user.id, { title: 'Mon Deuxième Quiz' });

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/quizzes')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('quizzes');
    expect(response.body.data.quizzes).toHaveLength(2);
    expect(response.body.data).toHaveProperty('pagination');
    expect(response.body.data.pagination.total).toBe(2);
  });

  it('devrait filtrer les quiz par matière', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    await createTestQuiz(user.id, { title: 'Quiz Anglais', subject: 'Anglais' });
    await createTestQuiz(user.id, { title: 'Quiz Maths', subject: 'Mathématiques' });

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/quizzes')
      .query({ subject: 'Anglais' })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.data.quizzes).toHaveLength(1);
    expect(response.body.data.quizzes[0].subject).toBe('Anglais');
  });

  it('devrait filtrer les quiz par tag', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    await createTestQuiz(user.id, { title: 'Quiz 1', tags: ['grammaire'] });
    await createTestQuiz(user.id, { title: 'Quiz 2', tags: ['vocabulaire'] });
    await createTestQuiz(user.id, { title: 'Quiz 3', tags: ['grammaire'] });

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/quizzes')
      .query({ tag: 'grammaire' })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.data.quizzes).toHaveLength(2);
  });

  it('devrait filtrer les quiz par difficulté', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    await createTestQuiz(user.id, { title: 'Quiz Facile', difficulty: 1 });
    await createTestQuiz(user.id, { title: 'Quiz Moyen', difficulty: 2 });
    await createTestQuiz(user.id, { title: 'Quiz Difficile', difficulty: 3 });

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/quizzes')
      .query({ difficulty: 2 })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.data.quizzes).toHaveLength(1);
    expect(response.body.data.quizzes[0].difficulty).toBe(2);
  });

  it('devrait rechercher les quiz par titre', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    await createTestQuiz(user.id, { title: 'Quiz d\'Anglais' });
    await createTestQuiz(user.id, { title: 'Quiz de Maths' });

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/quizzes')
      .query({ search: 'Anglais' })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.data.quizzes).toHaveLength(1);
    expect(response.body.data.quizzes[0].title).toContain('Anglais');
  });

  it('devrait refuser l\'accès sans authentification', async () => {
    const response = await request(app)
      .get('/api/quizzes')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/quizzes/:id', () => {
  it('devrait retourner un quiz par ID', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);

    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get(`/api/quizzes/${quiz.id}`)
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('quiz');
    expect(response.body.data.quiz.id).toBe(quiz.id);
    expect(response.body.data.quiz.jsonContent).toBeDefined();
  });

  it('devrait refuser l\'accès à un quiz qui n\'existe pas', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/quizzes/non-existent-id')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('devrait refuser l\'accès à un quiz d\'un autre utilisateur', async () => {
    const email1 = generateUniqueEmail();
    const email2 = generateUniqueEmail();
    const password = 'password123';

    const { user: user1 } = await createTestUser(email1, password);
    const { user: user2 } = await createTestUser(email2, password);
    const quiz = await createTestQuiz(user1.id);

    const token = await authenticateUser(email2, password);

    const response = await request(app)
      .get(`/api/quizzes/${quiz.id}`)
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/quizzes', () => {
  it('devrait créer un nouveau quiz', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const quizId = `quiz-${Date.now()}`;
    const quizData = {
      ...validQuizJson,
      id: quizId,
    };

    const response = await request(app)
      .post('/api/quizzes')
      .set('Cookie', [`token=${token}`])
      .send(quizData)
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('quiz');
    expect(response.body.data.quiz.id).toBe(quizId);
    expect(response.body.data.quiz.title).toBe('Quiz de test');
    expect(response.body).toHaveProperty('message', 'Quiz créé avec succès');

    // Vérifier en base
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    expect(quiz).not.toBeNull();
  });

  it('devrait refuser la création avec un quiz invalide', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const invalidQuiz = {
      // Pas de schemaVersion
      title: 'Quiz invalide',
    };

    const response = await request(app)
      .post('/api/quizzes')
      .set('Cookie', [`token=${token}`])
      .send(invalidQuiz)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('devrait refuser la création sans authentification', async () => {
    const response = await request(app)
      .post('/api/quizzes')
      .send(validQuizJson)
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('PUT /api/quizzes/:id', () => {
  it('devrait mettre à jour un quiz existant', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    const updatedQuiz = {
      ...validQuizJson,
      id: quiz.id,
      title: 'Titre mis à jour',
      subject: 'Nouvelle matière',
    };

    const response = await request(app)
      .put(`/api/quizzes/${quiz.id}`)
      .set('Cookie', [`token=${token}`])
      .send(updatedQuiz)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.quiz.title).toBe('Titre mis à jour');
    expect(response.body.data.quiz.subject).toBe('Nouvelle matière');
    expect(response.body).toHaveProperty('message', 'Quiz mis à jour avec succès');

    // Vérifier en base
    const updated = await prisma.quiz.findUnique({ where: { id: quiz.id } });
    expect(updated?.title).toBe('Titre mis à jour');
    expect(updated?.subject).toBe('Nouvelle matière');
  });

  it('devrait refuser la mise à jour d\'un quiz inexistant', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const quizData = {
      ...validQuizJson,
      id: 'non-existent-id',
    };

    const response = await request(app)
      .put('/api/quizzes/non-existent-id')
      .set('Cookie', [`token=${token}`])
      .send(quizData)
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('devrait refuser la mise à jour d\'un quiz d\'un autre utilisateur', async () => {
    const email1 = generateUniqueEmail();
    const email2 = generateUniqueEmail();
    const password = 'password123';

    const { user: user1 } = await createTestUser(email1, password);
    const { user: user2 } = await createTestUser(email2, password);
    const quiz = await createTestQuiz(user1.id);

    const token = await authenticateUser(email2, password);

    const updatedQuiz = {
      ...validQuizJson,
      id: quiz.id,
      title: 'Titre mis à jour',
    };

    const response = await request(app)
      .put(`/api/quizzes/${quiz.id}`)
      .set('Cookie', [`token=${token}`])
      .send(updatedQuiz)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/quizzes/:id', () => {
  it('devrait supprimer un quiz', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .delete(`/api/quizzes/${quiz.id}`)
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Quiz supprimé avec succès');

    // Vérifier en base
    const deleted = await prisma.quiz.findUnique({ where: { id: quiz.id } });
    expect(deleted).toBeNull();
  });

  it('devrait refuser la suppression d\'un quiz inexistant', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .delete('/api/quizzes/non-existent-id')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('devrait refuser la suppression d\'un quiz d\'un autre utilisateur', async () => {
    const email1 = generateUniqueEmail();
    const email2 = generateUniqueEmail();
    const password = 'password123';

    const { user: user1 } = await createTestUser(email1, password);
    const { user: user2 } = await createTestUser(email2, password);
    const quiz = await createTestQuiz(user1.id);

    const token = await authenticateUser(email2, password);

    const response = await request(app)
      .delete(`/api/quizzes/${quiz.id}`)
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/quizzes/:id/duplicate', () => {
  it('devrait dupliquer un quiz', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .post(`/api/quizzes/${quiz.id}/duplicate`)
      .set('Cookie', [`token=${token}`])
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('quiz');
    expect(response.body.data.quiz.id).not.toBe(quiz.id);
    expect(response.body.data.quiz.title).toContain('(copie)');
    expect(response.body).toHaveProperty('message', 'Quiz dupliqué avec succès');

    // Vérifier en base
    const duplicated = await prisma.quiz.findUnique({ 
      where: { id: response.body.data.quiz.id } 
    });
    expect(duplicated).not.toBeNull();
    expect(duplicated?.title).toContain('(copie)');
  });

  it('devrait refuser la duplication d\'un quiz inexistant', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .post('/api/quizzes/non-existent-id/duplicate')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/quizzes/import', () => {
  it('devrait importer un quiz depuis du JSON', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const quizId = `quiz-import-${Date.now()}`;
    const quizData = {
      ...validQuizJson,
      id: quizId,
    };

    const response = await request(app)
      .post('/api/quizzes/import')
      .set('Cookie', [`token=${token}`])
      .send({ quiz: quizData })
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('quiz');
    expect(response.body.data.quiz.id).toBe(quizId);
    expect(response.body).toHaveProperty('message', 'Quiz importé avec succès');

    // Vérifier en base
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    expect(quiz).not.toBeNull();
  });

  it('devrait refuser l\'import sans authentification', async () => {
    const response = await request(app)
      .post('/api/quizzes/import')
      .send({ quiz: validQuizJson })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/quizzes/:id/export', () => {
  it('devrait exporter un quiz en JSON', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get(`/api/quizzes/${quiz.id}/export`)
      .query({ format: 'json' })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.headers['content-disposition']).toContain('attachment');
    
    // Parser le body comme JSON car c'est un téléchargement
    const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
    expect(body).toHaveProperty('schemaVersion');
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('questions');
  });

  it('devrait refuser l\'export d\'un quiz inexistant', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/quizzes/non-existent-id/export')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});
