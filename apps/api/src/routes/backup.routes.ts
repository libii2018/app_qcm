/**
 * Routes des sauvegardes
 */

import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createBackup,
  restoreBackup,
  downloadBackup,
} from '../controllers/backup.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { config } from '../config';

const router = express.Router();

// Middleware Multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 Mo max
  },
  // Supprimer fileFilter - la validation se fera dans le contrôleur
});

// GET /api/backup - Créer et télécharger une sauvegarde
router.get('/', requireAuth, asyncHandler(createBackup));

// POST /api/backup - Créer une sauvegarde (alternatif)
router.post('/', requireAuth, asyncHandler(createBackup));

// POST /api/backup/restore - Restaurer une sauvegarde
router.post(
  '/restore',
  requireAuth,
  upload.single('file'),
  asyncHandler(restoreBackup)
);

// GET /api/backup/download/:id - Télécharger une sauvegarde
router.get('/download/:id', requireAuth, asyncHandler(downloadBackup));

export { router as backupRouter };
