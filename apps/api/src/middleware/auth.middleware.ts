/**
 * Middleware d'authentification JWT
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

interface JwtPayload {
  userId: string;
  email: string;
}

// Clé secrète JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Vérifie le token JWT et ajoute l'utilisateur à la requête
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): Response | void {
  // Récupérer le token depuis les cookies ou le header Authorization
  const token = req.cookies?.token || 
                req.headers?.authorization?.replace('Bearer ', '') ||
                (req.headers?.cookie?.match(/token=([^;]+)/)?.[1]);

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token d\'authentification requis',
      },
    });
  }

  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Ajouter l'utilisateur à la requête
    (req as any).user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error('Erreur de vérification du token :', error);
    
    let message = 'Token invalide';
    if (error instanceof jwt.TokenExpiredError) {
      message = 'Token expiré';
    } else if (error instanceof jwt.JsonWebTokenError) {
      message = 'Token invalide';
    }

    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    });
  }
}

/**
 * Middleware pour vérifier que l'utilisateur est connecté
 * (utilise authenticateJWT et ajoute la vérification de l'existence de l'utilisateur)
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  // D'abord, vérifier le JWT
  const token = req.cookies?.token || 
                req.headers?.authorization?.replace('Bearer ', '') ||
                (req.headers?.cookie?.match(/token=([^;]+)/)?.[1]);

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token d\'authentification requis',
      },
    });
  }

  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Vérifier que l'utilisateur existe dans la base
    const userId = decoded.userId;
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Ajouter l'utilisateur à la requête
    (req as any).user = {
      ...user,
      userId: user.id,
    };

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'authentification :', error);
    
    let message = 'Token invalide';
    if (error instanceof jwt.TokenExpiredError) {
      message = 'Token expiré';
    } else if (error instanceof jwt.JsonWebTokenError) {
      message = 'Token invalide';
    }

    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    });
  }
}

/**
 * Vérifie que l'utilisateur a accès à la ressource (par ID)
 * Ajoute l'objet complet à la requête
 */
export function requireResourceOwnership(
  model: 'quiz' | 'media',
  paramName: string = 'id'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = (req as any).user?.userId;
      const resourceId = req.params[paramName];

      if (!userId || !resourceId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentification requise',
          },
        });
      }

      // Chercher la ressource
      let resource;
      if (model === 'quiz') {
        resource = await prisma.quiz.findFirst({
          where: { id: resourceId, userId },
        });
      } else if (model === 'media') {
        resource = await prisma.media.findFirst({
          where: { id: resourceId, userId },
        });
      }

      if (!resource) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Ressource non trouvée ou accès refusé',
          },
        });
      }

      // Ajouter la ressource à la requête
      (req as any)[model] = resource;
      next();
    } catch (error) {
      console.error(`Erreur lors de la vérification de la propriété ${model} :`, error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne lors de la vérification des droits',
        },
      });
    }
  };
}

/**
 * Vérifie que l'utilisateur est admin (à implémenter si nécessaire)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Pour l'instant, tous les utilisateurs sont考虑 comme non-admin
  // À implémenter avec un champ isAdmin dans User
  return res.status(403).json({
    error: {
      code: 'FORBIDDEN',
      message: 'Accès réservé aux administrateurs',
    },
  });
}

/**
 * Génère un token JWT
 */
export function generateToken(userId: string, email: string): string {
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '86400'; // 24 heures
  
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: parseInt(expiresIn) }
  );
}

/**
 * Génère un token de rafraîchissement
 */
export function generateRefreshToken(userId: string, email: string): string {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '604800'; // 7 jours
  
  return jwt.sign(
    { userId, email, type: 'refresh' },
    JWT_SECRET + '-refresh', // Clé différente pour les tokens de rafraîchissement
    { expiresIn: parseInt(expiresIn) }
  );
}

/**
 * Vérifie un token de rafraîchissement
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET + '-refresh'
    ) as JwtPayload & { type: string };

    if (decoded.type !== 'refresh') {
      return null;
    }

    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    return null;
  }
}

export { JWT_SECRET };
