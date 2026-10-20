/**
 * Routes des statistiques
 */

import express from 'express';
import { validateQuery } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { StatsFilterSchema } from '@qcm/shared';
import {
  getPerformanceStats,
  getTagStats,
  getSubjectStats,
  getDailyStats,
  getLearningStats,
  getFailedQuestions,
  getWeakAreas,
  getStreak,
  getResponseTimeStats,
  getOverallStats,
} from '../controllers/stats.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = express.Router();

// GET /api/stats - Statistiques globales
router.get('/', requireAuth, asyncHandler(getOverallStats));

// GET /api/stats/performance - Statistiques de performance
router.get(
  '/performance',
  requireAuth,
  validateQuery(StatsFilterSchema),
  asyncHandler(getPerformanceStats)
);

// GET /api/stats/tags - Statistiques par tag
router.get(
  '/tags',
  requireAuth,
  validateQuery(StatsFilterSchema),
  asyncHandler(getTagStats)
);

// GET /api/stats/subjects - Statistiques par matière
router.get(
  '/subjects',
  requireAuth,
  validateQuery(StatsFilterSchema),
  asyncHandler(getSubjectStats)
);

// GET /api/stats/daily - Statistiques journalières
router.get(
  '/daily',
  requireAuth,
  validateQuery(StatsFilterSchema),
  asyncHandler(getDailyStats)
);

// GET /api/stats/learning - Statistiques d'apprentissage
router.get(
  '/learning',
  requireAuth,
  asyncHandler(getLearningStats)
);

// GET /api/stats/failed-questions - Questions les plus ratées
router.get(
  '/failed-questions',
  requireAuth,
  validateQuery(StatsFilterSchema),
  asyncHandler(getFailedQuestions)
);

// GET /api/stats/weak-areas - Zones faibles
router.get(
  '/weak-areas',
  requireAuth,
  validateQuery(StatsFilterSchema),
  asyncHandler(getWeakAreas)
);

// GET /api/stats/streak - Streak
router.get(
  '/streak',
  requireAuth,
  asyncHandler(getStreak)
);

// GET /api/stats/response-time - Temps de réponse
router.get(
  '/response-time',
  requireAuth,
  validateQuery(StatsFilterSchema),
  asyncHandler(getResponseTimeStats)
);

export { router as statsRouter };
