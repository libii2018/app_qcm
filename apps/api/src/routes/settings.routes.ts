/**
 * Routes des paramètres utilisateur
 */

import express from 'express';
import {
  getUserSettings,
  updateUserSettings,
} from '../controllers/settings.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// Tous les endpoints nécessitent une authentification
router.use(requireAuth);

router.get('/', asyncHandler(getUserSettings));
router.put('/', asyncHandler(updateUserSettings));

export const settingsRouter = router;
