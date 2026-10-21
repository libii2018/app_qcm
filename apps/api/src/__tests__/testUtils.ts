/**
 * Utilitaires pour les tests de l'API QCM
 */

import { execSync } from 'child_process';
import path from 'path';
import request from 'supertest';
import app from '../server';
import prisma from '../prisma';
import bcrypt from 'bcrypt';

// Chemin vers la base de données de test
const testDbPath = process.env.TEST_DATABASE_URL || 'file:./prisma/test.db';

// Configuration de l'environnement de test
process.env.DATABASE_URL = testDbPath;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt';
process.env.JWT_ACCESS_EXPIRES_IN = '86400';
process.env.JWT_REFRESH_EXPIRES_IN = '604800';
process.env.BCRYPT_ROUNDS = '4'; // Plus rapide pour les tests
process.env.MEDIA_UPLOAD_DIR = './uploads/test-media';
process.env.MAX_IMAGE_SIZE = '5242880';
process.env.MAX_AUDIO_SIZE = '20971520';
process.env.MAX_VIDEO_SIZE = '104857600';

// Utiliser le client Prisma singleton

/**
 * Initialise la base de données de test
 */
export async function setupTestDatabase() {
  // S'assurer que le répertoire prisma existe
  const prismaDir = path.resolve(__dirname, '../..', 'prisma');
  const fs = await import('fs/promises');
  
  try {
    await fs.access(prismaDir);
  } catch {
    await fs.mkdir(prismaDir, { recursive: true });
  }
  
  // Exécuter prisma db push pour créer la base et appliquer le schéma
  try {
    const env = { ...process.env, DATABASE_URL: testDbPath };
    execSync('npx prisma db push --force-reset', {
      cwd: path.resolve(__dirname, '../..'),
      env,
    });
    console.log('Base de données de test initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de test :', error);
  }
}

/**
 * Nettoie la base de données de test
 */
export async function cleanupTestDatabase() {
  try {
    // Supprimer toutes les données dans le bon ordre (contraintes de clé étrangère)
    // Utiliser $executeRaw pour éviter les problèmes de timeout
    await prisma.$executeRaw`DELETE FROM SyncQueue`;
    await prisma.$executeRaw`DELETE FROM Backup`;
    await prisma.$executeRaw`DELETE FROM AnswerEvent`;
    await prisma.$executeRaw`DELETE FROM ReviewState`;
    await prisma.$executeRaw`DELETE FROM Media`;
    await prisma.$executeRaw`DELETE FROM Quiz`;
    await prisma.$executeRaw`DELETE FROM User`;
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base de test :', error);
    throw error;
  }
}

/**
 * Crée un utilisateur de test
 */
export async function createTestUser(email?: string, password?: string) {
  const userEmail = email || `test-${Date.now()}@example.com`;
  const userPassword = password || 'Password123';

  const passwordHash = await bcrypt.hash(userPassword, 4);

  const user = await prisma.user.create({
    data: {
      email: userEmail,
      passwordHash,
      streak: 0,
      dailyGoal: 10,
    },
  });

  return { user, email: userEmail, password: userPassword };
}

/**
 * Authentifie un utilisateur et retourne le token
 */
export async function authenticateUser(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  // Le token est dans les cookies ou dans la réponse
  const token = response.body.data?.token ||
                response.headers['set-cookie']?.[0]?.match(/token=([^;]+)/)?.[1];

  if (!token) {
    throw new Error('Impossible de récupérer le token après authentification');
  }

  return token;
}

/**
 * Crée un quiz de test
 */
export async function createTestQuiz(userId: string, quizData?: Partial<any>) {
  const { v4: uuidv4 } = await import('uuid');
  const quizId = quizData?.id || `quiz-${uuidv4()}`;
  
  const defaultQuiz = {
    id: quizId,
    title: 'Quiz de test',
    subject: 'Test',
    tags: ['test'],
    difficulty: 1,
    jsonContent: {
      schemaVersion: 1,
      id: quizId,
      title: 'Quiz de test',
      subject: 'Test',
      tags: ['test'],
      difficulty: 1,
      questions: [
        {
          id: 'q1',
          prompt: [{ type: 'text', value: 'Question de test ?' }],
          options: [
            { id: 'a', content: [{ type: 'text', value: 'Réponse 1' }], correct: true },
            { id: 'b', content: [{ type: 'text', value: 'Réponse 2' }], correct: false },
          ],
          multiple: false,
          hint: 'Indice de test',
          explanation: 'Explication de test',
          tags: ['test'],
          difficulty: 1,
        },
      ],
    },
  };

  // Convertir les tags en JSON string pour SQLite
  const tagsAsString = typeof (quizData?.tags || defaultQuiz.tags) === 'string' 
    ? quizData?.tags 
    : JSON.stringify(quizData?.tags || defaultQuiz.tags);

  const difficulty = quizData?.difficulty || defaultQuiz.difficulty;

  const quiz = await prisma.quiz.create({
    data: {
      id: defaultQuiz.id,
      userId,
      title: quizData?.title || defaultQuiz.title,
      subject: quizData?.subject || defaultQuiz.subject,
      tags: tagsAsString,
      difficulty,
      description: quizData?.description || null,
      jsonContent: JSON.stringify(quizData?.jsonContent || defaultQuiz.jsonContent),
    },
  });

  return quiz;
}

/**
 * Crée un état de révision de test
 */
export async function createTestReviewState(
  userId: string,
  questionId: string,
  quizId?: string,
  daysFromNow: number = 1
) {
  const today = new Date();
  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + daysFromNow);

  const reviewState = await prisma.reviewState.create({
    data: {
      userId,
      questionId,
      quizId,
      nextReviewDate: nextDate,
      interval: 1,
      easeFactor: 2.5,
      repetitionCount: 0,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
    },
  });

  return reviewState;
}

/**
 * Crée un événement de réponse de test
 */
export async function createTestAnswerEvent(
  userId: string,
  quizId?: string,
  questionId?: string,
  correct?: boolean,
  usedHint: boolean = false,
  tags: string[] = ['test'],
  subject: string = 'Test',
  responseTime: number = 5000
) {
  const answerEvent = await prisma.answerEvent.create({
    data: {
      userId,
      quizId,
      questionId: questionId || 'q1',
      correct: correct !== undefined ? correct : true,
      responseTime,
      usedHint,
      selectedOptions: JSON.stringify(['a']),
      tags: JSON.stringify(tags),
      subject,
      difficulty: 1,
    },
  });

  return answerEvent;
}

/**
 * Crée un média de test (simulé, sans fichier réel)
 */
export async function createTestMedia(userId: string, mimeType: string = 'image/png') {
  const media = await prisma.media.create({
    data: {
      userId,
      filename: `test-file-${Date.now()}.png`,
      originalName: 'test-file.png',
      mimeType,
      size: 1024,
      path: `/uploads/test-media/test-file-${Date.now()}.png`,
    },
  });

  return media;
}

/**
 * Supprime un fichier ou dossier
 */
function deleteFileOrDir(path: string) {
  try {
    const fs = require('fs');
    if (fs.existsSync(path)) {
      if (fs.statSync(path).isDirectory()) {
        fs.rmSync(path, { recursive: true, force: true });
      } else {
        fs.unlinkSync(path);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la suppression :', error);
  }
}

/**
 * Initialise l'environnement de test
 */
export async function setupTestEnvironment() {
  // Initialiser la base de données
  await setupTestDatabase();

  // Nettoyer la base avant les tests
  await cleanupTestDatabase();
}

/**
 * Nettoie l'environnement de test
 */
export async function cleanupTestEnvironment() {
  // Nettoyer la base de données
  await cleanupTestDatabase();

  // Supprimer le dossier des médias de test
  deleteFileOrDir(path.resolve(__dirname, '../../uploads/test-media'));

  // Fermer la connexion Prisma
  await prisma.$disconnect();
}

/**
 * Returnne l'application Express pour les tests
 */
export function getTestApp() {
  return app;
}

/**
 * Returnne le client Prisma pour les tests
 */
export function getTestPrisma() {
  return prisma;
}

// Exporter les variables de configuration
export const TEST_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: testDbPath,
  MEDIA_UPLOAD_DIR: process.env.MEDIA_UPLOAD_DIR,
};
