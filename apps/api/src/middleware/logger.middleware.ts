/**
 * Middleware de logging des requêtes
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de logging simple
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Fonction pour logger à la fin de la requête
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.originalUrl;

    // Couleur en fonction du status code
    const getStatusColor = (code: number): string => {
      if (code >= 500) return '\x1b[31m'; // Rouge
      if (code >= 400) return '\x1b[33m'; // Jaune
      if (code >= 300) return '\x1b[36m'; // Cyan
      if (code >= 200) return '\x1b[32m'; // Vert
      return '\x1b[37m'; // Gris
    };

    const color = getStatusColor(statusCode);
    const reset = '\x1b[0m';

    console.log(
      `${color}${method.padEnd(6)} ${String(statusCode).padStart(3)} ${reset}${path} - ${duration}ms`
    );
  });

  res.on('close', () => {
    // Requête abandonnée par le client
    console.log('\x1b[90m%s %s - Requête abandonnée\x1b[0m', req.method, req.originalUrl);
  });

  next();
}

/**
 * Middleware de logging détaillé (pour le développement)
 */
export function detailedLogger(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  console.log('\n=== Requête entrante ===');
  console.log(`Méthode: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log(`Headers:`, req.headers);
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`Body:`, req.body);
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`\n=== Réponse ===`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Durée: ${duration}ms`);
    console.log(`================\n`);
  });

  next();
}

/**
 * Logger pour les erreurs
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('\x1b[31m=== ERREUR ===\x1b[0m');
  console.error(`Méthode: ${req.method}`);
  console.error(`URL: ${req.originalUrl}`);
  console.error(`Message: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  console.error('===================');

  next(err);
}
