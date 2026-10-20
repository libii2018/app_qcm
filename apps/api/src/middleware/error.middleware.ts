/**
 * Middleware de gestion des erreurs
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Classe d'erreur personnalisée pour l'API
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Erreur 400 - Mauvaise requête
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Mauvaise requête', details?: Record<string, unknown>) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

/**
 * Erreur 401 - Non autorisé
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Non autorisé', details?: Record<string, unknown>) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

/**
 * Erreur 403 - Interdit
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Accès interdit', details?: Record<string, unknown>) {
    super(403, 'FORBIDDEN', message, details);
  }
}

/**
 * Erreur 404 - Non trouvé
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Non trouvé', details?: Record<string, unknown>) {
    super(404, 'NOT_FOUND', message, details);
  }
}

/**
 * Erreur 409 - Conflit
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflit', details?: Record<string, unknown>) {
    super(409, 'CONFLICT', message, details);
  }
}

/**
 * Erreur 422 - Entité non traitée (validation)
 */
export class UnprocessableEntityError extends ApiError {
  constructor(message: string = 'Entité non traitée', details?: Record<string, unknown>) {
    super(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
}

/**
 * Erreur 429 - Trop de requêtes
 */
export class TooManyRequestsError extends ApiError {
  constructor(message: string = 'Trop de requêtes', details?: Record<string, unknown>) {
    super(429, 'TOO_MANY_REQUESTS', message, details);
  }
}

/**
 * Middleware de gestion des erreurs
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Si la réponse a déjà été envoyée, on passe
  if (res.headersSent) {
    return next(err);
  }

  // Gérer les erreurs ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Gérer les erreurs de validation Zod
  if (err.name === 'ZodError') {
    const errors: Record<string, string[]> = {};
    
    // @ts-ignore - Accès aux erreurs Zod
    err.errors.forEach((error: any) => {
      const path = error.path.join('.');
      let message = error.message;

      // Traduction basique
      switch (error.code) {
        case 'invalid_type':
          message = `Le champ « ${path} » doit être de type ${error.expected}`;
          break;
        case 'too_small':
          if (error.min !== undefined) {
            message = `Le champ « ${path} » doit avoir au moins ${error.min} ${error.type === 'array' ? 'éléments' : 'caractères'}`;
          }
          break;
        case 'too_big':
          if (error.max !== undefined) {
            message = `Le champ « ${path} » doit avoir au maximum ${error.max} ${error.type === 'array' ? 'éléments' : 'caractères'}`;
          }
          break;
      }

      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(message);
    });

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Erreur de validation des données',
        details: errors,
      },
    });
  }

  // Gérer les erreurs de token JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token invalide ou expiré',
      },
    });
  }

  // Gérer les erreurs de token expiré
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token expiré',
      },
    });
  }

  // Gérer les erreurs Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    // @ts-ignore
    const code = err.code;
    
    switch (code) {
      case 'P2002': // Unique constraint violation
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Une ressource avec ces informations existe déjà',
          },
        });

      case 'P2025': // Record not found
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Ressource non trouvée',
          },
        });

      default:
        console.error('Erreur Prisma :', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erreur de base de données',
          },
        });
    }
  }

  // Gérer les erreurs Multer (upload de fichiers)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
  }

  // Erreur 404 pour les routes non trouvées
  if (err.message?.includes('Not Found')) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route non trouvée',
      },
    });
  }

  // Log de l'erreur
  console.error('Erreur non traitée :', err);

  // Erreur interne par défaut
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erreur interne du serveur',
    },
  });
}

/**
 * Wrapper pour les contrôleurs pour capturer les erreurs
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      errorHandler(err as Error, req, res, next);
    }
  };
}
