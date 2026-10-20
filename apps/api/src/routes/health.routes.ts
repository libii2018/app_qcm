/**
 * Routes de santé
 */

import express from 'express';
import { checkHealth } from '../controllers/health.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = express.Router();

// GET /api/health - Vérification de santé
router.get('/', asyncHandler(checkHealth));

export { router as healthRouter };
