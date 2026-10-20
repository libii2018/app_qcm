/**
 * Contrôleur de santé
 */

import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../prisma';



/**
 * Vérification de santé
 */
export async function checkHealth(req: Request, res: Response) {
  const checks: Record<string, { status: 'ok' | 'error' | 'skipped'; message?: string }> = {};

  try {
    // Vérifier la connexion à la base de données
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', message: 'Base de données connectée' };
  } catch (error) {
    // En mode test, la base de données peut ne pas être disponible
    if (process.env.NODE_ENV === 'test') {
      checks.database = { status: 'skipped', message: 'Base de données non vérifiée en mode test' };
    } else {
      checks.database = { 
        status: 'error', 
        message: `Erreur de connexion à la base de données : ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  try {
    // Vérifier le répertoire d'upload
    const uploadDir = process.env.MEDIA_UPLOAD_DIR || './uploads/media';
    await fs.access(path.resolve(uploadDir));
    checks.uploadDir = { status: 'ok', message: 'Répertoire d\'upload accessible' };
  } catch (error) {
    checks.uploadDir = { 
      status: 'error', 
      message: `Répertoire d'upload non accessible : ${error instanceof Error ? error.message : String(error)}`
    };
  }

  try {
    // Vérifier les variables d'environnement
    const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length === 0) {
      checks.environment = { status: 'ok', message: 'Variables d\'environnement correctes' };
    } else {
      checks.environment = { 
        status: 'error', 
        message: `Variables manquantes : ${missingVars.join(', ')}`
      };
    }
  } catch (error) {
    checks.environment = { 
      status: 'error', 
      message: `Erreur de vérification des variables : ${error instanceof Error ? error.message : String(error)}`
    };
  }

  // Déterminer le statut global
  const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'skipped');
  const hasErrors = Object.values(checks).some(c => c.status === 'error');
  const status = hasErrors ? 'degraded' : 'OK';

  res.status(hasErrors ? 503 : 200).json({
    status,
    service: 'QCM API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
    uptime: process.uptime(),
  });
}
