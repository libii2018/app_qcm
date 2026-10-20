/**
 * Contrôleur d'authentification
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { RegisterUserData, LoginUserData, UpdateUserData } from '@qcm/shared';
import { generateToken, generateRefreshToken, verifyRefreshToken, JWT_SECRET } from '../middleware/auth.middleware';
import { BadRequestError, UnauthorizedError, ConflictError, ApiError } from '../middleware/error.middleware';
import { config } from '../config';
import prisma from '../prisma';

/**
 * Inscription d'un nouvel utilisateur
 */
export async function registerUser(req: Request, res: Response) {
  const data: RegisterUserData = req.body;

  // Vérifier si l'email existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError('Un utilisateur avec cet email existe déjà');
  }

  // Hacher le mot de passe
  const passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);

  // Créer l'utilisateur
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      streak: true,
      dailyGoal: true,
    },
  });

  // Générer les tokens
  const token = generateToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);

  // Définir les cookies
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  });

  res.status(201).json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        streak: user.streak,
        dailyGoal: user.dailyGoal,
      },
      token,
      refreshToken,
    },
    message: 'Inscription réussie',
  });
}

/**
 * Connexion d'un utilisateur
 */
export async function loginUser(req: Request, res: Response) {
  const data: LoginUserData = req.body;

  // Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (!user) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  // Vérifier le mot de passe
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  // Générer les tokens
  const token = generateToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);

  // Mettre à jour la date de dernière connexion (optionnel)
  await prisma.user.update({
    where: { id: user.id },
    data: { updatedAt: new Date() },
  });

  // Définir les cookies
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        streak: user.streak,
        dailyGoal: user.dailyGoal,
      },
      token,
      refreshToken,
    },
    message: 'Connexion réussie',
  });
}

/**
 * Déconnexion
 */
export async function logoutUser(req: Request, res: Response) {
  // Supprimer les cookies
  res.clearCookie('token');
  res.clearCookie('refreshToken');

  res.json({
    message: 'Déconnexion réussie',
  });
}

/**
 * Obtenir l'utilisateur connecté
 */
export async function getCurrentUser(req: Request, res: Response) {
  const userId = (req as any).user?.id;

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
    throw new UnauthorizedError('Utilisateur non trouvé');
  }

  // Compter les quiz
  const quizCount = await prisma.quiz.count({
    where: { userId: user.id },
  });

  // Compter les réponses
  const answerCount = await prisma.answerEvent.count({
    where: { userId: user.id },
  });

  res.json({
    data: {
      user,
      stats: {
        quizCount,
        answerCount,
      },
    },
  });
}

/**
 * Mettre à jour le profil utilisateur
 */
export async function updateUser(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const data: UpdateUserData = req.body;

  // Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError('Utilisateur non trouvé');
  }

  // Vérifier l'email
  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('Un utilisateur avec cet email existe déjà');
    }
  }

  // Préparer les données de mise à jour
  const updateData: Record<string, unknown> = {};

  if (data.email) {
    updateData.email = data.email.toLowerCase();
  }

  if (data.dailyGoal !== undefined) {
    updateData.dailyGoal = data.dailyGoal;
  }

  // Mettre à jour le mot de passe si fourni
  if (data.password && data.newPassword) {
    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Mot de passe actuel incorrect');
    }

    // Valider le nouveau mot de passe
    if (data.newPassword.length < 8) {
      throw new BadRequestError('Le nouveau mot de passe doit contenir au moins 8 caractères');
    }

    updateData.passwordHash = await bcrypt.hash(data.newPassword, config.bcryptRounds);
  }

  // Mettre à jour l'utilisateur
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      streak: true,
      dailyGoal: true,
    },
  });

  // Générer un nouveau token si l'email a changé
  let token: string | undefined;
  if (data.email) {
    token = generateToken(updatedUser.id, updatedUser.email);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  res.json({
    data: {
      user: updatedUser,
      token,
    },
    message: 'Profil mis à jour avec succès',
  });
}

/**
 * Rafraîchir le token
 */
export async function refreshToken(req: Request, res: Response) {
  // Récupérer le refresh token depuis les cookies
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedError('Token de rafraîchissement requis');
  }

  // Vérifier le refresh token
  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    // Supprimer les cookies invalides
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    throw new UnauthorizedError('Token de rafraîchissement invalide');
  }

  // Vérifier que l'utilisateur existe
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    throw new UnauthorizedError('Utilisateur non trouvé');
  }

  // Générer de nouveaux tokens
  const newToken = generateToken(user.id, user.email);
  const newRefreshToken = generateRefreshToken(user.id, user.email);

  // Définir les cookies
  res.cookie('token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
    },
    message: 'Token rafraîchi avec succès',
  });
}
