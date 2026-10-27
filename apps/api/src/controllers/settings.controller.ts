/**
 * Contrôleur des paramètres utilisateur
 */

import { Request, Response } from 'express';
import { config, mediaSizeLimits } from '../config';
import prisma from '../prisma';
import { BadRequestError } from '../middleware/error.middleware';

interface UserSettingsData {
  dailyGoal: number;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  playSound: boolean;
  maxMediaSize: {
    image: number;
    audio: number;
    video: number;
  };
  streak?: number;
}

const DEFAULT_SETTINGS: Omit<UserSettingsData, 'streak'> = {
  dailyGoal: 10,
  theme: 'system',
  notifications: true,
  playSound: true,
  maxMediaSize: {
    image: mediaSizeLimits.image,
    audio: mediaSizeLimits.audio,
    video: mediaSizeLimits.video,
  },
};

function parseSettings(raw: string | null | undefined): Partial<UserSettingsData> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Récupérer les paramètres de l'utilisateur connecté
 */
export async function getUserSettings(req: Request, res: Response) {
  const userId = (req as any).user.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true, streak: true, dailyGoal: true },
  });

  if (!user) {
    throw new BadRequestError('Utilisateur non trouvé');
  }

  const stored = parseSettings(user.settings);
  const settings: UserSettingsData = {
    ...DEFAULT_SETTINGS,
    ...stored,
    dailyGoal: stored.dailyGoal ?? user.dailyGoal,
    maxMediaSize: { ...DEFAULT_SETTINGS.maxMediaSize, ...(stored.maxMediaSize || {}) },
    streak: user.streak,
  };

  res.json({ data: settings });
}

/**
 * Mettre à jour les paramètres de l'utilisateur connecté
 */
export async function updateUserSettings(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const body = req.body || {};

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  if (!user) {
    throw new BadRequestError('Utilisateur non trouvé');
  }

  const current = parseSettings(user.settings);
  const next: Partial<UserSettingsData> = { ...current };

  if (body.dailyGoal !== undefined) {
    const dailyGoal = Number(body.dailyGoal);
    if (!Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 1000) {
      throw new BadRequestError('dailyGoal doit être un entier entre 1 et 1000');
    }
    next.dailyGoal = dailyGoal;
  }

  if (body.theme !== undefined) {
    if (!['light', 'dark', 'system'].includes(body.theme)) {
      throw new BadRequestError('theme doit valoir light, dark ou system');
    }
    next.theme = body.theme;
  }

  if (body.notifications !== undefined) {
    next.notifications = Boolean(body.notifications);
  }

  if (body.playSound !== undefined) {
    next.playSound = Boolean(body.playSound);
  }

  if (body.maxMediaSize !== undefined && typeof body.maxMediaSize === 'object') {
    const { image, audio, video } = body.maxMediaSize;
    next.maxMediaSize = {
      image: image !== undefined ? Math.max(0, Number(image)) : DEFAULT_SETTINGS.maxMediaSize.image,
      audio: audio !== undefined ? Math.max(0, Number(audio)) : DEFAULT_SETTINGS.maxMediaSize.audio,
      video: video !== undefined ? Math.max(0, Number(video)) : DEFAULT_SETTINGS.maxMediaSize.video,
    };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { settings: JSON.stringify(next) },
    select: { settings: true, streak: true, dailyGoal: true },
  });

  // Garder la colonne dailyGoal cohérente avec les paramètres
  if (next.dailyGoal !== undefined && next.dailyGoal !== updated.dailyGoal) {
    await prisma.user.update({
      where: { id: userId },
      data: { dailyGoal: next.dailyGoal },
    });
  }

  const merged: UserSettingsData = {
    ...DEFAULT_SETTINGS,
    ...next,
    dailyGoal: next.dailyGoal ?? updated.dailyGoal,
    maxMediaSize: { ...DEFAULT_SETTINGS.maxMediaSize, ...(next.maxMediaSize || {}) },
    streak: updated.streak,
  };

  res.json({ data: merged });
}
