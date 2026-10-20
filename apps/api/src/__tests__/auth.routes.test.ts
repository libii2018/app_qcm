/**
 * Tests pour les routes d'authentification
 */

import request from 'supertest';
import { getTestApp } from './testUtils';
import { createTestUser, authenticateUser } from './testUtils';
import { getTestPrisma } from './testUtils';

const app = getTestApp();
const prisma = getTestPrisma();

// Générer un email unique pour chaque test
const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;

describe('POST /api/auth/register', () => {
  it('devrait inscription un nouvel utilisateur avec succès', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    // Vérifier la réponse
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body).toHaveProperty('message', 'Inscription réussie');

    // Vérifier que l'utilisateur a été créé en base
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user?.email).toBe(email);
  });

  it('devrait refuser l\'inscription avec un email déjà utilisé', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer un utilisateur existant
    await createTestUser(email, password);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email, password })
      .expect(409);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('CONFLICT');
    expect(response.body.error.message).toBe('Un utilisateur avec cet email existe déjà');
  });

  it('devrait refuser l\'inscription avec un email invalide', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'email-invalide',
        password: 'Password123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devrait refuser l\'inscription avec un mot de passe trop court', async () => {
    const email = generateUniqueEmail();

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'pass',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devrait refuser l\'inscription sans email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        password: 'Password123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devrait refuser l\'inscription sans mot de passe', async () => {
    const email = generateUniqueEmail();

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('devrait connecter un utilisateur existant', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer un utilisateur
    await createTestUser(email, password);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body).toHaveProperty('message', 'Connexion réussie');
  });

  it('devrait refuser la connexion avec un email inexistant', async () => {
    const email = generateUniqueEmail();

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password: 'Password123',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Email ou mot de passe incorrect');
  });

  it('devrait refuser la connexion avec un mot de passe incorrect', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer un utilisateur
    await createTestUser(email, password);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password: 'mot-de-passe-incorrect',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Email ou mot de passe incorrect');
  });

  it('devrait refuser la connexion avec un email invalide', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'email-invalide',
        password: 'Password123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devrait refuser la connexion sans email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'Password123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devrait refuser la connexion sans mot de passe', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: generateUniqueEmail() })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/logout', () => {
  it('devrait déconnecter un utilisateur connecté', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer et connecter un utilisateur
    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Déconnexion réussie');
  });

  it('devrait refuser la déconnexion sans token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/auth/me', () => {
  it('devrait retourner l\'utilisateur connecté', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer et connecter un utilisateur
    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data).toHaveProperty('stats');
    expect(response.body.data.stats).toHaveProperty('quizCount');
    expect(response.body.data.stats).toHaveProperty('answerCount');
  });

  it('devrait refuser l\'accès sans token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('devrait refuser l\'accès avec un token invalide', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['token=token-invalide'])
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('PUT /api/auth/me', () => {
  it('devrait mettre à jour le profil utilisateur', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer et connecter un utilisateur
    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const newEmail = generateUniqueEmail();

    const response = await request(app)
      .put('/api/auth/me')
      .set('Cookie', [`token=${token}`])
      .send({
        email: newEmail,
        dailyGoal: 20,
      })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.email).toBe(newEmail);
    expect(response.body.data.user.dailyGoal).toBe(20);

    // Vérifier en base
    const user = await prisma.user.findUnique({ where: { email: newEmail } });
    expect(user).not.toBeNull();
    expect(user?.dailyGoal).toBe(20);
  });

  it('devrait mettre à jour le mot de passe', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';
    const newPassword = 'nouveau-mot-de-passe-123';

    // Créer et connecter un utilisateur
    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .put('/api/auth/me')
      .set('Cookie', [`token=${token}`])
      .send({
        password,
        newPassword,
      })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('user');

    // Vérifier que le nouveau mot de passe fonctionne
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password: newPassword })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('data');
    expect(loginResponse.body.data).toHaveProperty('token');
  });

  it('devrait refuser la mise à jour avec un email déjà utilisé', async () => {
    const email1 = generateUniqueEmail();
    const email2 = generateUniqueEmail();
    const password = 'Password123';

    // Créer deux utilisateurs
    await createTestUser(email1, password);
    await createTestUser(email2, password);
    
    const token = await authenticateUser(email1, password);

    const response = await request(app)
      .put('/api/auth/me')
      .set('Cookie', [`token=${token}`])
      .send({
        email: email2,
      })
      .expect(409);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('devrait refuser la mise à jour avec un mot de passe actuel incorrect', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer et connecter un utilisateur
    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .put('/api/auth/me')
      .set('Cookie', [`token=${token}`])
      .send({
        password: 'mot-de-passe-incorrect',
        newPassword: 'nouveau-mot-de-passe-123',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Mot de passe actuel incorrect');
  });

  it('devrait refuser la mise à jour avec un nouveau mot de passe trop court', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer et connecter un utilisateur
    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .put('/api/auth/me')
      .set('Cookie', [`token=${token}`])
      .send({
        password,
        newPassword: 'pass',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Erreur de validation des données');
  });
});

describe('POST /api/auth/refresh', () => {
  it('devrait rafraîchir le token avec un refresh token valide', async () => {
    const email = generateUniqueEmail();
    const password = 'Password123';

    // Créer et connecter un utilisateur
    await createTestUser(email, password);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    const refreshToken = response.body.data.refreshToken;

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`])
      .expect(200);

    expect(refreshResponse.body).toHaveProperty('data');
    expect(refreshResponse.body.data).toHaveProperty('token');
    expect(refreshResponse.body.data).toHaveProperty('refreshToken');
    expect(refreshResponse.body).toHaveProperty('message', 'Token rafraîchi avec succès');
  });

  it('devrait refuser le rafraîchissement sans refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Token de rafraîchissement requis');
  });

  it('devrait refuser le rafraîchissement avec un refresh token invalide', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=token-invalide'])
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Token de rafraîchissement invalide');
  });
});
