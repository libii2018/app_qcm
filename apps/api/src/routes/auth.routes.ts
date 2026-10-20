/**
 * Routes d'authentification
 */

import express from 'express';
import { validateRequest } from '../middleware/validation.middleware';
import { RegisterUserSchema, LoginUserSchema, UpdateUserSchema } from '@qcm/shared';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUser,
  refreshToken,
} from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// Inscription
router.post(
  '/register',
  validateRequest(RegisterUserSchema),
  asyncHandler(registerUser)
);

// Connexion
router.post(
  '/login',
  validateRequest(LoginUserSchema),
  asyncHandler(loginUser)
);

// Déconnexion
router.post('/logout', requireAuth, asyncHandler(logoutUser));

// Obtenir l'utilisateur connecté
router.get('/me', requireAuth, asyncHandler(getCurrentUser));

// Mettre à jour le profil
router.put(
  '/me',
  requireAuth,
  validateRequest(UpdateUserSchema),
  asyncHandler(updateUser)
);

// Rafraîchir le token
router.post('/refresh', asyncHandler(refreshToken));

export { router as authRouter };
