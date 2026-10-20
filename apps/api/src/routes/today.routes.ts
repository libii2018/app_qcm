/**
 * Routes de la page "Aujourd'hui"
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getTodayRecommendation,
  getReviewQueue,
} from '../controllers/today.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = express.Router();

// GET /api/today - Recommandation du jour
router.get('/', requireAuth, asyncHandler(getTodayRecommendation));

// GET /api/today/queue - File d'attente de révision
router.get('/queue', requireAuth, asyncHandler(getReviewQueue));

export { router as todayRouter };
