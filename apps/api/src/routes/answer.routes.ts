/**
 * Routes des réponses
 */

import express from 'express';
import { validateRequest } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { AnswerEventSchema } from '@qcm/shared';
import {
  recordAnswer,
  recordSessionAnswers,
} from '../controllers/answer.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = express.Router();

// POST /api/answers - Enregistrer une réponse
router.post(
  '/',
  requireAuth,
  validateRequest(AnswerEventSchema),
  asyncHandler(recordAnswer)
);

// POST /api/answers/session - Enregistrer plusieurs réponses (session)
router.post(
  '/session',
  requireAuth,
  asyncHandler(recordSessionAnswers)
);

export { router as answerRouter };
