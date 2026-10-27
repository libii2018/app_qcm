/**
 * Routes des quiz
 */

import express from 'express';
import multer from 'multer';
import { validateRequest } from '../middleware/validation.middleware';
import { requireAuth, requireResourceOwnership } from '../middleware/auth.middleware';
import { QuizSessionParamsSchema } from '@qcm/shared';
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz,
  importQuiz,
  exportQuiz,
} from '../controllers/quiz.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { config } from '../config';

const router = express.Router();

// Middleware Multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxMediaSize,
  },
  fileFilter: (req, file, cb) => {
    // Accepter les fichiers JSON et ZIP
    if (file.mimetype === 'application/json' || 
        file.mimetype === 'application/zip' ||
        file.originalname.endsWith('.json') ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Seuls les fichiers JSON et ZIP sont autorisés.'));
    }
  },
});

// GET /api/quizzes - Liste des quiz
router.get(
  '/',
  requireAuth,
  asyncHandler(getQuizzes)
);

// GET /api/quizzes/:id - Obtenir un quiz
router.get(
  '/:id',
  requireAuth,
  requireResourceOwnership('quiz', 'id'),
  asyncHandler(getQuizById)
);

// POST /api/quizzes - Créer un quiz
router.post(
  '/',
  requireAuth,
  asyncHandler(createQuiz)
);

// PUT /api/quizzes/:id - Mettre à jour un quiz
router.put(
  '/:id',
  requireAuth,
  requireResourceOwnership('quiz', 'id'),
  asyncHandler(updateQuiz)
);

// DELETE /api/quizzes/:id - Supprimer un quiz
router.delete(
  '/:id',
  requireAuth,
  requireResourceOwnership('quiz', 'id'),
  asyncHandler(deleteQuiz)
);

// POST /api/quizzes/:id/duplicate - Dupliquer un quiz
router.post(
  '/:id/duplicate',
  requireAuth,
  requireResourceOwnership('quiz', 'id'),
  asyncHandler(duplicateQuiz)
);

// POST /api/quizzes/import - Importer un quiz (JSON ou ZIP)
router.post(
  '/import',
  requireAuth,
  upload.single('file'),
  asyncHandler(importQuiz)
);

// GET /api/quizzes/:id/export - Exporter un quiz (JSON ou ZIP)
router.get(
  '/:id/export',
  requireAuth,
  requireResourceOwnership('quiz', 'id'),
  asyncHandler(exportQuiz)
);

// POST /api/quizzes/:id/session - Démarrer une session de quiz
router.post(
  '/:id/session',
  requireAuth,
  requireResourceOwnership('quiz', 'id'),
  validateRequest(QuizSessionParamsSchema),
  asyncHandler(async (req, res) => {
    // À implémenter si nécessaire
    res.json({ message: 'Session démarrée' });
  })
);

export { router as quizRouter };
