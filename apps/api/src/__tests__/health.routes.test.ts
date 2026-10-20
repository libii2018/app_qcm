/**
 * Tests pour les routes de health check
 */

import request from 'supertest';
import { getTestApp } from './testUtils';

const app = getTestApp();

describe('GET /api/health', () => {
  it('devrait retourner un statut OK', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('service');
    expect(response.body.service).toBe('QCM API');
  });

  it('devrait vérifier la base de données', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('checks');
    expect(response.body.checks).toHaveProperty('database');
    expect(response.body.checks.database).toHaveProperty('status');
    expect(response.body.checks.database.status).toBe('ok');
  });

  it('devrait vérifier la connexion à la base de données', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('checks');
    expect(response.body.checks).toHaveProperty('database');
  });
});
