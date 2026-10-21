/**
 * Configuration de Jest pour les tests de l'API QCM
 */

// Configurer l'environnement de test AVANT tout import
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./prisma/test.db';
process.env.JWT_SECRET = 'test-secret-key-for-jwt';
process.env.JWT_ACCESS_EXPIRES_IN = '86400';
process.env.JWT_REFRESH_EXPIRES_IN = '604800';
process.env.MEDIA_UPLOAD_DIR = './uploads/test-media';
process.env.BCRYPT_ROUNDS = '4';

// Importer les utilitaires de test
import { cleanupTestDatabase, setupTestDatabase } from './testUtils';

// Configuration de l'environnement avant les tests
beforeAll(async () => {
  // Initialiser la base de données de test (avec force reset)
  await setupTestDatabase();
  // Nettoyer une première fois
  await cleanupTestDatabase();
});

// Nettoyer la base de données avant chaque test
beforeEach(async () => {
  await cleanupTestDatabase();
});

// Nettoyer aussi après chaque test pour doublement s'assurer
afterEach(async () => {
  await cleanupTestDatabase();
});

// Nettoyer après tous les tests
afterAll(async () => {
  // La base sera nettoyée automatiquement
});

// Timeout global
jest.setTimeout(30000);
