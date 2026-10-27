/**
 * Contrôleur des quiz
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import archiver from 'archiver';
import prisma from '../prisma';

// Fonction utilitaire pour parser un champ qui peut être JSON string ou objet
function parseJsonField<T>(value: unknown): T {
  if (value === null || value === undefined) {
    return value as T;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
  return value as T;
}

// Fonction utilitaire pour stringifier un champ JSON
function stringifyJsonField(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return JSON.stringify(value);
}



import {
  QuizJson,
  Question,
  QuizSchema,
  validateQuizJson,
  extractMediaFromQuiz,
  isLocalMediaSrc,
  isAllowedMimeType,
  isAllowedExtension,
  getExtensionFromMimeType,
  MEDIA_SIZE_LIMITS,
  isWithinSizeLimit,
  formatFileSize,
} from '@qcm/shared';

import { BadRequestError, NotFoundError, ApiError, ConflictError } from '../middleware/error.middleware';
import { config } from '../config';

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
 * Obtenir la liste des quiz de l'utilisateur
 */
export async function getQuizzes(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
  const { search, subject, tag, difficulty } = req.query;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Construire le filtre Where
  const where: any = { userId };

  if (search) {
    where.OR = [
      { title: { contains: search as string } },
      { description: { contains: search as string } },
    ];
  }

  if (subject) {
    where.subject = { equals: subject as string };
  }

  if (difficulty) {
    const diff = parseInt(difficulty as string);
    if (!isNaN(diff)) {
      where.difficulty = diff;
    }
  }

  // Obtenir tous les quiz correspondants pour filtrer par tag
  const quizzesRaw = await prisma.quiz.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      subject: true,
      description: true,
      tags: true,
      difficulty: true,
      jsonContent: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Parser les tags et filtrer par tag si nécessaire
  const tagFilter = tag as string | undefined;
  const quizzes = quizzesRaw
    .map(q => {
      const { jsonContent, ...rest } = q;
      const parsedJson = parseJsonField<QuizJson | null>(jsonContent);
      return {
        ...rest,
        tags: typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags,
        questionCount: Array.isArray(parsedJson?.questions) ? parsedJson.questions.length : 0,
      };
    })
    .filter(q => !tagFilter || (Array.isArray(q.tags) && q.tags.includes(tagFilter)));

  // Appliquer la pagination après le filtrage par tag
  const paginatedQuizzes = quizzes.slice(skip, skip + take);
  const total = quizzes.length;
  const totalPages = Math.ceil(total / take);

  res.json({
    data: {
      quizzes: paginatedQuizzes,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
    },
  });
}

/**
 * Obtenir un quiz par ID
 */
export async function getQuizById(req: Request, res: Response) {
  const quizId = req.params.id;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      userId: true,
      title: true,
      subject: true,
      description: true,
      tags: true,
      difficulty: true,
      jsonContent: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!quiz) {
    throw new NotFoundError('Quiz non trouvé');
  }

  // Parser les champs JSON
  const parsedTags = typeof quiz.tags === 'string' ? JSON.parse(quiz.tags) : quiz.tags;
  const parsedJsonContent = typeof quiz.jsonContent === 'string' ? JSON.parse(quiz.jsonContent) : quiz.jsonContent;

  res.json({
    data: {
      quiz: {
        ...quiz,
        tags: parsedTags,
        jsonContent: parsedJsonContent as QuizJson,
      },
    },
  });
}

/**
 * Créer un nouveau quiz
 */
export async function createQuiz(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const quizData = req.body;

  // Valider le schéma du quiz
  const validation = validateQuizJson(quizData);

  if (!validation.success) {
    throw new BadRequestError('Quiz invalide', { errors: validation.errors });
  }

  const quiz = validation.data;

  // Vérifier que l'ID est unique
  const existingQuiz = await prisma.quiz.findUnique({
    where: { id: quiz.id },
  });

  if (existingQuiz) {
    throw new ConflictError('Un quiz avec cet ID existe déjà');
  }

  // Extraire les métadonnées pour l'indexation
  const { questions, ...metadata } = quiz;

  // Créer le quiz avec jsonContent = quiz complet
  const createdQuiz = await prisma.quiz.create({
    data: {
      id: quiz.id,
      userId,
      title: metadata.title,
      subject: metadata.subject,
      description: metadata.description,
      tags: JSON.stringify(metadata.tags || []),
      difficulty: metadata.difficulty,
      jsonContent: JSON.stringify(quiz),
    },
    select: {
      id: true,
      title: true,
      subject: true,
      description: true,
      tags: true,
      difficulty: true,
      createdAt: true,
      updatedAt: true,
      jsonContent: true,
    },
  });

  // Parser les champs JSON pour la réponse
  const parsedTags = typeof createdQuiz.tags === 'string' ? JSON.parse(createdQuiz.tags) : createdQuiz.tags;
  const parsedJsonContent = typeof createdQuiz.jsonContent === 'string' ? JSON.parse(createdQuiz.jsonContent) : createdQuiz.jsonContent;

  res.status(201).json({
    data: {
      quiz: {
        ...createdQuiz,
        tags: parsedTags,
        jsonContent: parsedJsonContent as QuizJson,
      },
    },
    message: 'Quiz créé avec succès',
  });
}

/**
 * Mettre à jour un quiz
 */
export async function updateQuiz(req: Request, res: Response) {
  const quizId = req.params.id;
  const quizData = req.body;

  // Valider le schéma du quiz
  const validation = validateQuizJson(quizData);

  if (!validation.success) {
    throw new BadRequestError('Quiz invalide', { errors: validation.errors });
  }

  const quiz = validation.data;

  // Vérifier que le quiz existe
  const existingQuiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!existingQuiz) {
    throw new NotFoundError('Quiz non trouvé');
  }

  // Extraire les métadonnées pour l'indexation
  const { questions, ...metadata } = quiz;

  // Mettre à jour le quiz avec jsonContent = quiz complet
  const updatedQuiz = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title: metadata.title,
      subject: metadata.subject,
      description: metadata.description,
      tags: JSON.stringify(metadata.tags || []),
      difficulty: metadata.difficulty,
      jsonContent: JSON.stringify(quiz),
    },
    select: {
      id: true,
      title: true,
      subject: true,
      description: true,
      tags: true,
      difficulty: true,
      createdAt: true,
      updatedAt: true,
      jsonContent: true,
    },
  });

  // Parser les champs JSON pour la réponse
  const parsedTags = typeof updatedQuiz.tags === 'string' ? JSON.parse(updatedQuiz.tags) : updatedQuiz.tags;
  const parsedJsonContent = typeof updatedQuiz.jsonContent === 'string' ? JSON.parse(updatedQuiz.jsonContent) : updatedQuiz.jsonContent;

  res.json({
    data: {
      quiz: {
        ...updatedQuiz,
        tags: parsedTags,
        jsonContent: parsedJsonContent as QuizJson,
      },
    },
    message: 'Quiz mis à jour avec succès',
  });
}

/**
 * Supprimer un quiz
 */
export async function deleteQuiz(req: Request, res: Response) {
  const quizId = req.params.id;

  // Supprimer le quiz (cascade pour les ReviewState et AnswerEvent associés)
  await prisma.quiz.delete({
    where: { id: quizId },
  });

  res.json({
    message: 'Quiz supprimé avec succès',
  });
}

/**
 * Dupliquer un quiz
 */
export async function duplicateQuiz(req: Request, res: Response) {
  const quizId = req.params.id;
  const userId = (req as any).user?.userId;

  // Obtenir le quiz original
  const originalQuiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!originalQuiz) {
    throw new NotFoundError('Quiz non trouvé');
  }

  // Générer un nouvel ID
  const newId = `${originalQuiz.id}-copy-${Date.now()}`;

  // Parser les champs JSON
  const originalTags = typeof originalQuiz.tags === 'string' ? JSON.parse(originalQuiz.tags) : originalQuiz.tags;
  const originalJson = typeof originalQuiz.jsonContent === 'string' ? JSON.parse(originalQuiz.jsonContent) : originalQuiz.jsonContent;
  
  const duplicatedJson: QuizJson = {
    ...originalJson,
    id: newId,
    // Modifier les IDs des questions
    questions: (originalJson.questions || []).map((q: any, index: number) => ({
      ...q,
      id: `${newId}-q${index}`,
    })),
  };

  // Créer le quiz dupliqué
  const duplicatedQuiz = await prisma.quiz.create({
    data: {
      id: newId,
      userId,
      title: `${originalQuiz.title} (copie)`,
      subject: originalQuiz.subject,
      description: originalQuiz.description,
      tags: JSON.stringify(originalTags || []),
      difficulty: originalQuiz.difficulty,
      jsonContent: JSON.stringify(duplicatedJson),
    },
    select: {
      id: true,
      title: true,
      subject: true,
      description: true,
      tags: true,
      difficulty: true,
      createdAt: true,
      updatedAt: true,
      jsonContent: true,
    },
  });

  // Parser les champs JSON pour la réponse
  const parsedTags = typeof duplicatedQuiz.tags === 'string' ? JSON.parse(duplicatedQuiz.tags) : duplicatedQuiz.tags;
  const parsedJsonContent = typeof duplicatedQuiz.jsonContent === 'string' ? JSON.parse(duplicatedQuiz.jsonContent) : duplicatedQuiz.jsonContent;

  res.status(201).json({
    data: {
      quiz: {
        ...duplicatedQuiz,
        tags: parsedTags,
        jsonContent: parsedJsonContent as QuizJson,
      },
    },
    message: 'Quiz dupliqué avec succès',
  });
}

/**
 * Importer un quiz (JSON ou ZIP)
 */
export async function importQuiz(req: Request, res: Response) {
  const userId = (req as any).user?.userId;
  const file = (req as any).file; // Fichier uploadé par Multer

  let quizJson: QuizJson;
  let mediaFiles: Array<{ filename: string; data: Buffer; mimeType: string }> = [];

  try {
    if (!file) {
      // Si pas de fichier, essayer de parser le body comme JSON
      if (req.body?.quiz) {
        const validation = validateQuizJson(req.body.quiz);
        if (!validation.success) {
          throw new BadRequestError('Quiz invalide', { errors: validation.errors });
        }
        quizJson = validation.data;
      } else {
        throw new BadRequestError('Fichier ou quiz JSON requis');
      }
    } else if (file.originalname.endsWith('.json')) {
      // Fichier JSON
      try {
        const jsonData = JSON.parse(file.buffer.toString('utf-8'));
        const validation = validateQuizJson(jsonData);
        if (!validation.success) {
          throw new BadRequestError('Quiz invalide', { errors: validation.errors });
        }
        quizJson = validation.data;
      } catch (error) {
        throw new BadRequestError('Fichier JSON invalide');
      }
    } else if (file.originalname.endsWith('.zip')) {
      // Fichier ZIP
      const zip = new AdmZip(file.buffer);
      const zipEntries = zip.getEntries();

      // Trouver le fichier quiz.json
      const quizJsonEntry = zipEntries.find(entry => 
        entry.entryName === 'quiz.json' || 
        entry.entryName === 'quiz.json.txt' ||
        path.basename(entry.entryName) === 'quiz.json'
      );

      if (!quizJsonEntry) {
        throw new BadRequestError('Le fichier ZIP doit contenir un fichier quiz.json à la racine');
      }

      // Lire et valider le quiz JSON
      const jsonData = JSON.parse(quizJsonEntry.getData().toString('utf-8'));
      const validation = validateQuizJson(jsonData);
      if (!validation.success) {
        throw new BadRequestError('Quiz invalide', { errors: validation.errors });
      }
      quizJson = validation.data;

      // Extraire les fichiers média
      const mediaDir = path.join(path.resolve(config.mediaUploadDir), 'imported', uuidv4());
      await fs.mkdir(mediaDir, { recursive: true });

      // Copier les fichiers média
      for (const entry of zipEntries) {
        if (entry.entryName.startsWith('media/') && !entry.isDirectory) {
          const filename = path.basename(entry.entryName);
          const fileData = entry.getData();
          
          // Déterminer le type MIME
          const ext = path.extname(filename).toLowerCase();
          let mimeType = 'application/octet-stream';
          
          if (['.jpg', '.jpeg'].includes(ext)) {
            mimeType = 'image/jpeg';
          } else if (ext === '.png') {
            mimeType = 'image/png';
          } else if (ext === '.webp') {
            mimeType = 'image/webp';
          } else if (ext === '.mp3') {
            mimeType = 'audio/mpeg';
          } else if (ext === '.wav') {
            mimeType = 'audio/wav';
          } else if (ext === '.ogg') {
            mimeType = 'audio/ogg';
          } else if (ext === '.mp4') {
            mimeType = 'video/mp4';
          } else if (ext === '.webm') {
            mimeType = 'video/webm';
          }

          mediaFiles.push({
            filename,
            data: fileData,
            mimeType,
          });
        }
      }

      // Sauvegarder les fichiers média
      const uploadDir = await ensureUploadDir();
      const mediaPath = path.join(uploadDir, 'imported', uuidv4());
      await fs.mkdir(mediaPath, { recursive: true });

      for (const mediaFile of mediaFiles) {
        const filePath = path.join(mediaPath, mediaFile.filename);
        await fs.writeFile(filePath, mediaFile.data);

        // Créer l'entrée Media en base
        await prisma.media.create({
          data: {
            id: uuidv4(),
            userId,
            filename: mediaFile.filename,
            originalName: mediaFile.filename,
            mimeType: mediaFile.mimeType,
            size: mediaFile.data.length,
            path: path.relative(uploadDir, filePath),
          },
        });
      }
    } else {
      throw new BadRequestError('Type de fichier non supporté. Seuls les fichiers JSON et ZIP sont autorisés.');
    }

    // Vérifier que l'ID est unique
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id: quizJson.id },
    });

    if (existingQuiz) {
      // Générer un nouvel ID
      quizJson.id = `${quizJson.id}-import-${Date.now()}`;
    }

    // Extraire les métadonnées
    const { questions, ...metadata } = quizJson;

    // Créer le quiz avec jsonContent = quizJson complet
    const createdQuiz = await prisma.quiz.create({
      data: {
        id: quizJson.id,
        userId,
        title: metadata.title,
        subject: metadata.subject,
        description: metadata.description,
        tags: JSON.stringify(metadata.tags || []),
        difficulty: metadata.difficulty,
        jsonContent: JSON.stringify(quizJson),
      },
      select: {
        id: true,
        title: true,
        subject: true,
        description: true,
        tags: true,
        difficulty: true,
        createdAt: true,
        updatedAt: true,
        jsonContent: true,
      },
    });

    // Parser les champs JSON pour la réponse
    const parsedTags = typeof createdQuiz.tags === 'string' ? JSON.parse(createdQuiz.tags) : createdQuiz.tags;
    const parsedJsonContent = typeof createdQuiz.jsonContent === 'string' ? JSON.parse(createdQuiz.jsonContent) : createdQuiz.jsonContent;

    res.status(201).json({
      data: {
        quiz: {
          ...createdQuiz,
          tags: parsedTags,
          jsonContent: parsedJsonContent as QuizJson,
        },
        mediaFiles: mediaFiles.length,
      },
      message: `Quiz importé avec succès${mediaFiles.length > 0 ? ` avec ${mediaFiles.length} fichier${mediaFiles.length > 1 ? 's' : ''} média` : ''}`,
    });
  } catch (error) {
    // Nettoyer les fichiers média temporaires en cas d'erreur
    if (mediaFiles.length > 0) {
      try {
        const uploadDir = await ensureUploadDir();
        const tempDir = path.join(uploadDir, 'imported', 'temp');
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignorer
      }
    }
    throw error;
  }
}

/**
 * Exporter un quiz (JSON ou ZIP)
 */
export async function exportQuiz(req: Request, res: Response) {
  const quizId = req.params.id;
  const { format = 'json' } = req.query;

  // Obtenir le quiz
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz) {
    throw new NotFoundError('Quiz non trouvé');
  }

  const quizJson = (typeof quiz.jsonContent === 'string' ? JSON.parse(quiz.jsonContent) : quiz.jsonContent) as QuizJson;

  if (format === 'zip') {
    // Exporter en ZIP
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${quizJson.id}.zip"`,
    });

    const archive = archiver('zip');
    archive.on('error', (err) => {
      throw err;
    });

    // Ajouter le fichier quiz.json
    archive.append(JSON.stringify(quizJson, null, 2), { name: 'quiz.json' });

    // Ajouter les fichiers média
    const media = await prisma.media.findMany({
      where: { userId: quiz.userId },
    });

    for (const mediaItem of media) {
      try {
        const filePath = path.join(config.mediaUploadDir, mediaItem.path);
        const fileData = await fs.readFile(filePath);
        archive.append(fileData, { 
          name: `media/${mediaItem.filename}`,
          mode: 0o644
        });
      } catch {
        // Fichier introuvable, ignorer
      }
    }

    await archive.finalize();
    archive.pipe(res);
  } else {
    // Exporter en JSON
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${quizJson.id}.json"`,
    });
    res.json(quizJson);
  }
}
