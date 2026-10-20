/**
 * Routes des médias
 */

import express from 'express';
import multer from 'multer';
import { requireAuth, requireResourceOwnership } from '../middleware/auth.middleware';
import {
  uploadMedia,
  getMedia,
  deleteMedia,
  streamMedia,
} from '../controllers/media.controller';
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
    // Accepter tous les fichiers, la vérification se fera dans le contrôleur
    cb(null, true);
  },
});

// POST /api/media - Upload de médias
router.post(
  '/',
  requireAuth,
  upload.array('files', 10), // Autoriser jusqu'à 10 fichiers
  asyncHandler(uploadMedia)
);

// GET /api/media/:id - Obtenir les métadonnées d'un média
router.get(
  '/:id',
  requireAuth,
  requireResourceOwnership('media', 'id'),
  asyncHandler(getMedia)
);

// GET /api/media/:id/stream - Stream un média (pour audio/vidéo)
router.get(
  '/:id/stream',
  requireAuth,
  requireResourceOwnership('media', 'id'),
  asyncHandler(streamMedia)
);

// DELETE /api/media/:id - Supprimer un média
router.delete(
  '/:id',
  requireAuth,
  requireResourceOwnership('media', 'id'),
  asyncHandler(deleteMedia)
);

export { router as mediaRouter };
