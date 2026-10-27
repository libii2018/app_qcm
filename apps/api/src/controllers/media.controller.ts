/**
 * Contrôleur des médias
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import fsCallback from 'fs';
import path from 'path';

import {
  isAllowedMimeType,
  isAllowedExtension,
  getExtensionFromMimeType,
  getMediaTypeFromMime,
  MEDIA_SIZE_LIMITS,
  isWithinSizeLimit,
  formatFileSize,
} from '@qcm/shared';

import { BadRequestError, NotFoundError } from '../middleware/error.middleware';
import { config } from '../config';
import prisma from '../prisma';



// Assurer que le répertoire d'upload existe
const ensureUploadDir = async () => {
  const uploadDir = path.resolve(config.mediaUploadDir);
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

/**
 * Upload de fichiers médias
 */
export async function uploadMedia(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const files = (req as any).files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new BadRequestError('Aucun fichier fourni');
  }

  const uploadDir = await ensureUploadDir();
  const uploadedFiles = [];

  for (const file of files) {
    console.log('Processing file:', file.originalname, 'mimetype:', file.mimetype);
    // Vérifier le type MIME
    if (!isAllowedMimeType(file.mimetype)) {
      console.log('MIME type not allowed:', file.mimetype);
      throw new BadRequestError(`Type de fichier non supporté : ${file.mimetype}`);
    }

    // Vérifier l'extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!isAllowedExtension(ext)) {
      throw new BadRequestError(`Extension de fichier non supportée : ${ext}`);
    }

    // Vérifier la taille selon le type
    const mediaType = getMediaTypeFromMime(file.mimetype);
    const maxSize = (MEDIA_SIZE_LIMITS as Record<string, number>)[mediaType] || MEDIA_SIZE_LIMITS.default;

    if (file.size > maxSize) {
      throw new BadRequestError(
        `Le fichier est trop grand (max: ${formatFileSize(maxSize)}). Taille du fichier : ${formatFileSize(file.size)}`
      );
    }

    // Générer un nom de fichier unique
    const filename = `${uuidv4()}${getExtensionFromMimeType(file.mimetype)}`;
    const filePath = path.join(uploadDir, filename);

    // Sauvegarder le fichier
    await fs.writeFile(filePath, file.buffer);

    // Créer l'entrée Media en base
    const media = await prisma.media.create({
      data: {
        id: uuidv4(),
        userId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: path.relative(uploadDir, filePath),
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        path: true,
        createdAt: true,
      },
    });

    uploadedFiles.push(media);
  }

  res.status(201).json({
    data: { files: uploadedFiles },
    message: `${uploadedFiles.length} fichier${uploadedFiles.length > 1 ? 's' : ''} uploadé${uploadedFiles.length > 1 ? 's' : ''} avec succès`,
  });
}

/**
 * Obtenir les métadonnées d'un média
 */
export async function getMedia(req: Request, res: Response) {
  const mediaId = req.params.id;

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      path: true,
      createdAt: true,
    },
  });

  if (!media) {
    throw new NotFoundError('Média non trouvé');
  }

  res.json({
    data: { media },
  });
}

/**
 * Stream un média (pour audio/vidéo avec support Range)
 */
export async function streamMedia(req: Request, res: Response) {
  const mediaId = req.params.id;

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    throw new NotFoundError('Média non trouvé');
  }

  // Lire le fichier
  const uploadDir = path.resolve(config.mediaUploadDir);
  const filePath = path.join(uploadDir, media.path);

  try {
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      // Support des requêtes Range pour le streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const file = await fs.open(filePath, 'r');
      const buffer = Buffer.alloc(chunksize);
      
      await file.read(buffer, 0, chunksize, start);
      await file.close();

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': media.mimeType,
      });

      res.end(buffer);
    } else {
      // Stream complet
      res.set({
        'Content-Type': media.mimeType,
        'Content-Length': fileSize,
        'Content-Disposition': `inline; filename="${encodeURIComponent(media.originalName)}"`,
        'Accept-Ranges': 'bytes',
      });

      const fileStream = fsCallback.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('Erreur lors du streaming du média :', error);
    throw new NotFoundError('Fichier média introuvable');
  }
}

/**
 * Supprimer un média
 */
export async function deleteMedia(req: Request, res: Response) {
  const mediaId = req.params.id;
  const userId = (req as any).user?.userId;

  // Obtenir le média
  const media = await prisma.media.findUnique({
    where: { id: mediaId, userId },
  });

  if (!media) {
    throw new NotFoundError('Média non trouvé');
  }

  // Supprimer le fichier physique
  try {
    const uploadDir = path.resolve(config.mediaUploadDir);
    const filePath = path.join(uploadDir, media.path);
    await fs.unlink(filePath);
  } catch {
    // Ignorer si le fichier n'existe pas
  }

  // Supprimer l'entrée en base
  await prisma.media.delete({
    where: { id: mediaId },
  });

  res.json({
    message: 'Média supprimé avec succès',
  });
}
