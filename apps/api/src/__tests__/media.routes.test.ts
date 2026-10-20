/**
 * Tests pour les routes des médias
 */

import request from 'supertest';
import { getTestApp } from './testUtils';
import { createTestUser, authenticateUser, createTestMedia } from './testUtils';
import { getTestPrisma } from './testUtils';
import path from 'path';
import fs from 'fs/promises';

const app = getTestApp();
const prisma = getTestPrisma();

const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;

// Créer un fichier image de test (PNG très petit)
function createTestImageBuffer() {
  // PNG minimal valide (1x1 pixel transparent)
  const buffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  return buffer;
}

// Créer un fichier audio de test (WAV minimal)
function createTestAudioBuffer() {
  // WAV minimal valide (silence très court)
  // Ce n'est pas un WAV valide, mais suffisant pour les tests d'upload
  const buffer = Buffer.alloc(44); // Header WAV minimal
  // RIFF
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36, 4); // Size
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat
  buffer.writeUInt16LE(1, 22); // NumChannels
  buffer.writeUInt32LE(8000, 24); // SampleRate
  buffer.writeUInt32LE(8000, 28); // ByteRate
  buffer.writeUInt16LE(1, 32); // BlockAlign
  buffer.writeUInt16LE(8, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(0, 40); // Subchunk2Size
  return buffer;
}

// Créer un fichier vidéo de test (MP4 minimal - pas vraiment valide mais suffisant pour le test)
function createTestVideoBuffer() {
  return Buffer.alloc(100);
}

describe('POST /api/media', () => {
  it('devrait uploader un fichier image', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const imageBuffer = createTestImageBuffer();

    const response = await request(app)
      .post('/api/media')
      .set('Cookie', [`token=${token}`])
      .attach('files', imageBuffer, 'test-image.png')
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('files');
    expect(response.body.data.files).toHaveLength(1);
    expect(response.body.data.files[0].mimeType).toBe('image/png');
    expect(response.body).toHaveProperty('message', '1 fichier uploadé avec succès');

    // Vérifier en base
    const media = await prisma.media.findMany({ where: { userId: user.id } });
    expect(media).toHaveLength(1);
  });

  it('devrait uploader plusieurs fichiers', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const imageBuffer = createTestImageBuffer();

    const response = await request(app)
      .post('/api/media')
      .set('Cookie', [`token=${token}`])
      .attach('files', imageBuffer, 'test-image1.png')
      .attach('files', imageBuffer, 'test-image2.png')
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.files).toHaveLength(2);
    expect(response.body).toHaveProperty('message', '2 fichiers uploadés avec succès');

    // Vérifier en base
    const media = await prisma.media.findMany({ where: { userId: user.id } });
    expect(media).toHaveLength(2);
  });

  it('devrait uploader un fichier audio', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const audioBuffer = createTestAudioBuffer();

    const response = await request(app)
      .post('/api/media')
      .set('Cookie', [`token=${token}`])
      .attach('files', audioBuffer, 'test-audio.wav')
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.files).toHaveLength(1);
    // audio/wav et audio/wave sont tous deux valides
    expect(response.body.data.files[0].mimeType).toMatch(/^audio\/(wav|wave)$/);
  });

  it('devrait uploader un fichier vidéo', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const videoBuffer = createTestVideoBuffer();

    const response = await request(app)
      .post('/api/media')
      .set('Cookie', [`token=${token}`])
      .attach('files', videoBuffer, 'test-video.mp4')
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.files).toHaveLength(1);
    expect(response.body.data.files[0].mimeType).toBe('video/mp4');
  });

  it('devrait refuser l\'upload sans fichier', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .post('/api/media')
      .set('Cookie', [`token=${token}`])
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(response.body.error.message).toBe('Aucun fichier fourni');
  });

  it('devrait refuser l\'upload avec un type de fichier non supporté', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const textBuffer = Buffer.from('texte simple');

    const response = await request(app)
      .post('/api/media')
      .set('Cookie', [`token=${token}`])
      .attach('files', textBuffer, 'test.txt')
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(response.body.error.message).toContain('Type de fichier non supporté');
  });

  it('devrait refuser l\'upload sans authentification', async () => {
    const imageBuffer = createTestImageBuffer();

    const response = await request(app)
      .post('/api/media')
      .attach('files', imageBuffer, 'test-image.png')
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/media/:id', () => {
  it('devrait retourner les métadonnées d\'un média', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const media = await createTestMedia(user.id);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get(`/api/media/${media.id}`)
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('media');
    expect(response.body.data.media.id).toBe(media.id);
    expect(response.body.data.media.originalName).toBe('test-file.png');
  });

  it('devrait refuser l\'accès à un média inexistant', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/media/non-existent-id')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('devrait refuser l\'accès à un média d\'un autre utilisateur', async () => {
    const email1 = generateUniqueEmail();
    const email2 = generateUniqueEmail();
    const password = 'password123';

    const { user: user1 } = await createTestUser(email1, password);
    const { user: user2 } = await createTestUser(email2, password);
    const media = await createTestMedia(user1.id);

    const token = await authenticateUser(email2, password);

    const response = await request(app)
      .get(`/api/media/${media.id}`)
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/media/:id/stream', () => {
  it('devrait streamer un fichier média', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const imageBuffer = createTestImageBuffer();
    const token = await authenticateUser(email, password);

    // Upload d'un fichier
    const uploadResponse = await request(app)
      .post('/api/media')
      .set('Cookie', [`token=${token}`])
      .attach('files', imageBuffer, 'stream-test.png')
      .expect(201);

    const mediaId = uploadResponse.body.data.files[0].id;

    // Stream du fichier
    const response = await request(app)
      .get(`/api/media/${mediaId}/stream`)
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.body).toBeDefined();
  });

  it('devrait supporter les requêtes Range pour le streaming', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const audioBuffer = createTestAudioBuffer();
    const token = await authenticateUser(email, password);

    // Upload d'un fichier
    const uploadResponse = await request(app)
      .post('/api/media')
      .set('Cookie', [`token=${token}`])
      .attach('files', audioBuffer, 'range-test.wav')
      .expect(201);

    const mediaId = uploadResponse.body.data.files[0].id;

    // Stream avec Range
    const response = await request(app)
      .get(`/api/media/${mediaId}/stream`)
      .set('Cookie', [`token=${token}`])
      .set('Range', 'bytes=0-9')
      .expect(206);

    expect(response.headers['content-range']).toBeDefined();
    expect(response.headers['content-type']).toMatch(/^audio\/(wav|wave)$/);
    expect(response.body).toBeDefined();
  });

  it('devrait refuser le streaming d\'un média inexistant', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .get('/api/media/non-existent-id/stream')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/media/:id', () => {
  it('devrait supprimer un média', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    const { user } = await createTestUser(email, password);
    const media = await createTestMedia(user.id);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .delete(`/api/media/${media.id}`)
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Média supprimé avec succès');

    // Vérifier en base
    const deleted = await prisma.media.findUnique({ where: { id: media.id } });
    expect(deleted).toBeNull();
  });

  it('devrait refuser la suppression d\'un média inexistant', async () => {
    const email = generateUniqueEmail();
    const password = 'password123';

    await createTestUser(email, password);
    const token = await authenticateUser(email, password);

    const response = await request(app)
      .delete('/api/media/non-existent-id')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('devrait refuser la suppression d\'un média d\'un autre utilisateur', async () => {
    const email1 = generateUniqueEmail();
    const email2 = generateUniqueEmail();
    const password = 'password123';

    const { user: user1 } = await createTestUser(email1, password);
    const { user: user2 } = await createTestUser(email2, password);
    const media = await createTestMedia(user1.id);

    const token = await authenticateUser(email2, password);

    const response = await request(app)
      .delete(`/api/media/${media.id}`)
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});
