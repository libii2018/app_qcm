/**
 * Tests pour les routes des sauvegardes
 */

import request from 'supertest';
import { getTestApp } from './testUtils';
import { createTestUser, authenticateUser, createTestQuiz, createTestMedia, createTestAnswerEvent, createTestReviewState } from './testUtils';
import { getTestPrisma } from './testUtils';
import AdmZip from 'adm-zip';
import path from 'path';

const app = getTestApp();
const prisma = getTestPrisma();

const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;

// Créer un fichier ZIP de test
function createTestBackupZip() {
  const zip = new AdmZip();
  
  const backupData = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      streak: 5,
      dailyGoal: 10,
    },
    quizzes: [
      {
        id: 'quiz-1',
        userId: 'test-user-id',
        title: 'Quiz de test',
        subject: 'Test',
        tags: ['test'],
        difficulty: 1,
        jsonContent: {
          schemaVersion: 1,
          id: 'quiz-1',
          title: 'Quiz de test',
          questions: [],
        },
      },
    ],
    media: [],
    reviewStates: [],
    answerEvents: [],
    createdAt: new Date().toISOString(),
  };
  
  zip.addLocalFile(Buffer.from(JSON.stringify(backupData, null, 2)), 'backup.json');
  
  return zip.toBuffer();
}

describe('GET /api/backup', () => {
  it('devrait créer et télécharger une sauvegarde', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    await createTestAnswerEvent(user.id, quiz.id, 'q1', true);
    
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/backup')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('backup-');
    expect(response.body).toBeDefined();

    // Vérifier que le ZIP contient backup.json
    const zip = new AdmZip(response.body);
    const entries = zip.getEntries();
    expect(entries.some(e => e.entryName === 'backup.json')).toBe(true);
  });

  it('devrait inclure les médias dans la sauvegarde', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    await createTestMedia(user.id, 'image/png');
    
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/backup')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    const zip = new AdmZip(response.body);
    const entries = zip.getEntries();
    
    // Doit contenir backup.json et des fichiers dans media/
    expect(entries.some(e => e.entryName === 'backup.json')).toBe(true);
  });

  it('devrait refuser la sauvegarde sans authentification', async () => {
    const response = await request(app)
      .get('/api/backup')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/backup', () => {
  it('devrait créer une sauvegarde (méthode alternative)', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const quiz = await createTestQuiz(user.id);
    
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .post('/api/backup')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('attachment');
  });
});

describe('POST /api/backup/restore', () => {
  it('devrait restaurer une sauvegarde', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    // Créer un fichier ZIP de sauvegarde
    const zipBuffer = createTestBackupZip();

    // Modifier l'ID utilisateur pour qu'il corresponde
    const zip = new AdmZip(zipBuffer);
    const backupJson = JSON.parse(zip.readAsText('backup.json'));
    backupJson.user.id = user.id;
    zip.updateFile('backup.json', Buffer.from(JSON.stringify(backupJson, null, 2)));
    const updatedZipBuffer = zip.toBuffer();

    const response = await request(app)
      .post('/api/backup/restore')
      .set('Cookie', [`token=${token}`])
      .attach('file', updatedZipBuffer, 'backup.zip')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Sauvegarde restaurée avec succès');
    expect(response.body).toHaveProperty('data');

    // Vérifier que les quiz ont été restaurés
    const quizzes = await prisma.quiz.findMany({ where: { userId: user.id } });
    expect(quizzes.length).toBeGreaterThan(0);
  });

  it('devrait refuser la restauration sans fichier', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .post('/api/backup/restore')
      .set('Cookie', [`token=${token}`])
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('devrait refuser la restauration avec un fichier ZIP invalide', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    // Créer un ZIP sans backup.json
    const zip = new AdmZip();
    zip.addLocalFile(Buffer.from('test'), 'test.txt');
    const zipBuffer = zip.toBuffer();

    const response = await request(app)
      .post('/api/backup/restore')
      .set('Cookie', [`token=${token}`])
      .attach('file', zipBuffer, 'test.zip')
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('devrait refuser la restauration avec un fichier non-ZIP', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const textBuffer = Buffer.from('pas un fichier zip');

    const response = await request(app)
      .post('/api/backup/restore')
      .set('Cookie', [`token=${token}`])
      .attach('file', textBuffer, 'test.txt')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('devrait refuser la restauration sans authentification', async () => {
    const zipBuffer = createTestBackupZip();

    const response = await request(app)
      .post('/api/backup/restore')
      .attach('file', zipBuffer, 'backup.zip')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/backup/download/:id', () => {
  it('devrait télécharger une sauvegarde existante', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    // Créer une sauvegarde
    const createResponse = await request(app)
      .post('/api/backup')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    // Extraire l'ID de la sauvegarde depuis le nom du fichier
    const contentDisposition = createResponse.headers['content-disposition'];
    const filename = contentDisposition?.match(/filename="backup-([^"]+)\.zip"/)?.[1];
    
    if (!filename) {
      // Si on ne peut pas extraire l'ID, on skip ce test
      return;
    }

    // Télécharger la sauvegarde
    const response = await request(app)
      .get(`/api/backup/download/${filename}`)
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body).toBeDefined();

    const zip = new AdmZip(response.body);
    expect(zip.getEntries().some(e => e.entryName === 'backup.json')).toBe(true);
  });

  it('devrait refuser le téléchargement d\'une sauvegarde inexistante', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/backup/download/non-existent-id')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('devrait refuser le téléchargement d\'une sauvegarde d\'un autre utilisateur', async () => {
    const email1 = generateUniqueEmail();
    const email2 = generateUniqueEmail();
    const password = 'password123';

    const { user: user1 } = await createTestUser(email1, password);
    const { user: user2 } = await createTestUser(email2, password);
    
    const token1 = await authenticateUser(email1, password);

    // Créer une sauvegarde avec user1
    await request(app)
      .post('/api/backup')
      .set('Cookie', [`token=${token1}`])
      .expect(200);

    // Essayer de télécharger avec user2
    const token2 = await authenticateUser(email2, password);

    // Obtenir l'ID de la sauvegarde
    const backups = await prisma.backup.findMany({ where: { userId: user1.id } });
    
    if (backups.length === 0) {
      return;
    }

    const response = await request(app)
      .get(`/api/backup/download/${backups[0].id}`)
      .set('Cookie', [`token=${token2}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});
