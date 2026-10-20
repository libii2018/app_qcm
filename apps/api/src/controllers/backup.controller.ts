/**
 * Contrôleur des sauvegardes
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import archiver from 'archiver';

import { BadRequestError, NotFoundError } from '../middleware/error.middleware';
import { config } from '../config';
import prisma from '../prisma';



/**
 * Créer et télécharger une sauvegarde complète
 */
export async function createBackup(req: Request, res: Response) {
  const userId = (req as any).user?.userId;

  try {
    // Créer une sauvegarde en base
    const backupId = uuidv4();
    
    // Obtenir toutes les données de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        streak: true,
        dailyGoal: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const quizzesRaw = await prisma.quiz.findMany({
      where: { userId },
    });

    const media = await prisma.media.findMany({
      where: { userId },
    });

    const reviewStates = await prisma.reviewState.findMany({
      where: { userId },
    });

    const answerEventsRaw = await prisma.answerEvent.findMany({
      where: { userId },
    });

    // Parser les champs JSON pour les quiz
    const quizzes = quizzesRaw.map(q => ({
      ...q,
      tags: typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags,
      jsonContent: typeof q.jsonContent === 'string' ? JSON.parse(q.jsonContent) : q.jsonContent,
    }));

    // Parser les champs JSON pour les answerEvents
    const answerEvents = answerEventsRaw.map(e => ({
      ...e,
      selectedOptions: typeof e.selectedOptions === 'string' ? JSON.parse(e.selectedOptions) : e.selectedOptions,
      tags: typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags,
    }));

    // Sauvegarder en base
    const backup = await prisma.backup.create({
      data: {
        id: backupId,
        userId,
        data: JSON.stringify({
          user,
          quizzes,
          media,
          reviewStates,
          answerEvents,
          createdAt: new Date().toISOString(),
        }),
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // Créer le ZIP
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="backup-${backup.id}.zip"`,
    });

    const archive = archiver('zip');
    archive.on('error', (err) => {
      throw err;
    });

    // Ajouter le fichier backup.json
    const backupData = {
      user,
      quizzes,
      media,
      reviewStates,
      answerEvents,
      createdAt: new Date().toISOString(),
    };

    archive.append(
      JSON.stringify(backupData, null, 2),
      { name: 'backup.json' }
    );

    // Ajouter les fichiers média
    const uploadDir = path.resolve(config.mediaUploadDir);

    for (const mediaItem of media) {
      try {
        const filePath = path.join(uploadDir, mediaItem.path);
        const fileData = await fs.readFile(filePath);
        
        // Créer le chemin dans le ZIP
        const relativePath = path.relative(uploadDir, filePath);
        const zipPath = path.join('media', relativePath);

        archive.append(fileData, { 
          name: zipPath,
          mode: 0o644
        });
      } catch {
        // Fichier introuvable, ignorer
      }
    }

    await archive.finalize();
    archive.pipe(res);
  } catch (error) {
    console.error('Erreur lors de la création de la sauvegarde :', error);
    throw error;
  }
}

/**
 * Restaurer une sauvegarde
 */
export async function restoreBackup(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const file = (req as any).file as Express.Multer.File;

  if (!file) {
    throw new BadRequestError('Fichier de sauvegarde requis');
  }

  try {
    const zip = new AdmZip(file.buffer);
    const zipEntries = zip.getEntries();

    // Trouver le fichier backup.json
    const backupJsonEntry = zipEntries.find(entry => 
      entry.entryName === 'backup.json'
    );

    if (!backupJsonEntry) {
      throw new BadRequestError('Le fichier ZIP doit contenir un fichier backup.json');
    }

    // Lire et parser le backup JSON
    const backupData = JSON.parse(backupJsonEntry.getData().toString('utf-8'));

    // Vérifier que l'utilisateur correspond
    if (backupData.user?.id !== userId) {
      throw new BadRequestError('Cette sauvegarde appartient à un autre utilisateur');
    }

    // Supprimer les données existantes
    await prisma.answerEvent.deleteMany({ where: { userId } });
    await prisma.reviewState.deleteMany({ where: { userId } });
    await prisma.quiz.deleteMany({ where: { userId } });
    await prisma.media.deleteMany({ where: { userId } });

    // Restaurer les quiz
    if (backupData.quizzes) {
      for (const quiz of backupData.quizzes) {
        // Réinitialiser l'ID si nécessaire
        if (quiz.id.includes('-')) {
          quiz.id = uuidv4();
        }

        // Stringifier les champs JSON
        const tagsString = typeof quiz.tags === 'string' ? quiz.tags : JSON.stringify(quiz.tags || []);
        const jsonContentString = typeof quiz.jsonContent === 'string' ? quiz.jsonContent : JSON.stringify(quiz.jsonContent || {});

        await prisma.quiz.create({
          data: {
            id: quiz.id,
            userId,
            title: quiz.title,
            subject: quiz.subject,
            description: quiz.description,
            tags: tagsString,
            difficulty: quiz.difficulty,
            jsonContent: jsonContentString,
          },
        });
      }
    }

    // Restaurer les médias
    if (backupData.media) {
      const uploadDir = await ensureUploadDir();

      for (const mediaItem of backupData.media) {
        const mediaId = uuidv4();

        // Lire le fichier depuis le ZIP
        const filePath = path.join('media', mediaItem.path);
        const fileEntry = zipEntries.find(entry => 
          entry.entryName === filePath || 
          path.relative('media', entry.entryName) === mediaItem.path
        );

        if (fileEntry) {
          const fileData = fileEntry.getData();
          const filePath = path.join(uploadDir, mediaItem.filename);
          
          await fs.writeFile(filePath, fileData);

          await prisma.media.create({
            data: {
              id: mediaId,
              userId,
              filename: mediaItem.filename,
              originalName: mediaItem.originalName,
              mimeType: mediaItem.mimeType,
              size: mediaItem.size,
              path: path.relative(uploadDir, filePath),
            },
          });
        }
      }
    }

    // Restaurer les états de révision
    if (backupData.reviewStates) {
      for (const state of backupData.reviewStates) {
        await prisma.reviewState.create({
          data: {
            id: uuidv4(),
            userId,
            questionId: state.questionId,
            quizId: state.quizId,
            nextReviewDate: new Date(state.nextReviewDate),
            interval: state.interval,
            easeFactor: state.easeFactor,
            repetitionCount: state.repetitionCount,
            consecutiveCorrect: state.consecutiveCorrect || 0,
            consecutiveIncorrect: state.consecutiveIncorrect || 0,
          },
        });
      }
    }

    // Restaurer les événements de réponse
    if (backupData.answerEvents) {
      for (const event of backupData.answerEvents) {
        // Stringifier les champs JSON
        const selectedOptionsString = typeof event.selectedOptions === 'string' 
          ? event.selectedOptions 
          : JSON.stringify(event.selectedOptions || []);
        const tagsString = typeof event.tags === 'string' 
          ? event.tags 
          : JSON.stringify(event.tags || []);

        await prisma.answerEvent.create({
          data: {
            id: uuidv4(),
            userId,
            quizId: event.quizId,
            questionId: event.questionId,
            correct: event.correct,
            responseTime: event.responseTime,
            usedHint: event.usedHint || false,
            timestamp: new Date(event.timestamp),
            selectedOptions: selectedOptionsString,
            tags: tagsString,
            subject: event.subject,
            difficulty: event.difficulty,
          },
        });
      }
    }

    // Mettre à jour le streak
    const maxStreak = backupData.user?.streak || 0;
    await prisma.user.update({
      where: { id: userId },
      data: { streak: maxStreak },
    });

    res.json({
      message: 'Sauvegarde restaurée avec succès',
      data: {
        quizzes: backupData.quizzes?.length || 0,
        media: backupData.media?.length || 0,
        reviewStates: backupData.reviewStates?.length || 0,
        answerEvents: backupData.answerEvents?.length || 0,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la restauration de la sauvegarde :', error);
    throw error;
  }
}

/**
 * Assurer que le répertoire d'upload existe
 */
async function ensureUploadDir() {
  const uploadDir = path.resolve(config.mediaUploadDir);
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
}

/**
 * Télécharger une sauvegarde existante
 */
export async function downloadBackup(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const backupId = req.params.id;

  const backup = await prisma.backup.findFirst({
    where: { id: backupId, userId },
  });

  if (!backup) {
    throw new NotFoundError('Sauvegarde non trouvée');
  }

  // Parser le backup data si c'est une string
  let backupData = backup.data as any;
  if (typeof backupData === 'string') {
    try {
      backupData = JSON.parse(backupData);
    } catch {
      // Garder tel quel si ça échoue
    }
  }

  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="backup-${backup.id}.zip"`,
  });

  const archive = archiver('zip');
  archive.on('error', (err) => {
    throw err;
  });

  // Ajouter le fichier backup.json
  archive.append(
    JSON.stringify(backupData, null, 2),
    { name: 'backup.json' }
  );

  // Ajouter les fichiers média si nécessaire
  if (backupData.media) {
    const uploadDir = path.resolve(config.mediaUploadDir);

    for (const mediaItem of backupData.media) {
      try {
        const filePath = path.join(uploadDir, mediaItem.path);
        const fileData = await fs.readFile(filePath);
        
        const zipPath = path.join('media', mediaItem.filename);
        archive.append(fileData, { 
          name: zipPath,
          mode: 0o644
        });
      } catch {
        // Fichier introuvable, ignorer
      }
    }
  }

  await archive.finalize();
  archive.pipe(res);
}
