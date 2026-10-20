/**
 * Base de données IndexedDB pour le stockage local
 * 
 * Utilisée pour :
 * - La file d'attente des réponses hors ligne
 * - Le cache des quiz
 * - Les paramètres utilisateur
 */

import Dexie, { Table } from 'dexie';

// Types pour la base de données
export interface QueuedAnswer {
  id: string;
  data: any;
  timestamp: Date;
  attempts: number;
}

export interface CachedQuiz {
  id: string;
  data: any;
  timestamp: Date;
}

export interface UserSettings {
  id: string;
  theme: string;
  language: string;
  dailyGoal: number;
  updatedAt: Date;
}

export interface ReviewState {
  id: string;
  questionId: string;
  quizId: string;
  nextReviewDate: Date;
  interval: number;
  easeFactor: number;
  repetitionCount: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  updatedAt: Date;
}

// Classe de la base de données
class QcmDatabase extends Dexie {
  answers!: Table<QueuedAnswer, string>;
  quizzes!: Table<CachedQuiz, string>;
  settings!: Table<UserSettings, string>;
  reviewStates!: Table<ReviewState, string>;

  constructor() {
    super('QcmDatabase');

    this.version(1).stores({
      // File d'attente des réponses à synchroniser
      answers: 'id, timestamp, attempts',
      // Cache des quiz
      quizzes: 'id, timestamp',
      // Paramètres utilisateur
      settings: 'id',
      // États de révision locale (pour le mode hors ligne)
      reviewStates: 'id, questionId, quizId, nextReviewDate, updatedAt',
    });
  }
}

// Instance singleton
export const db = new QcmDatabase();

// Hook pour utiliser la base de données
export function useDb() {
  return db;
}

// Fonction d'initialisation
export async function initDb() {
  try {
    await db.open();
    console.log('[IndexedDB] Base de données ouverte avec succès');
  } catch (error) {
    console.error('[IndexedDB] Erreur lors de l\'ouverture de la base de données :', error);
    throw error;
  }
}

// Fonctions utilitaires pour les réponses en attente
export const answerQueue = {
  // Ajouter une réponse à la queue
  async add(data: any) {
    const id = crypto.randomUUID || (() => Math.random().toString(36).substring(2, 9) + Date.now().toString(36));
    return await db.answers.add({
      id: id(),
      data,
      timestamp: new Date(),
      attempts: 0,
    });
  },

  // Obtenir toutes les réponses
  async getAll() {
    return await db.answers.orderBy('timestamp').toArray();
  },

  // Supprimer une réponse
  async delete(id: string) {
    return await db.answers.delete(id);
  },

  // Mettre à jour une réponse
  async update(id: string, updates: Partial<QueuedAnswer>) {
    return await db.answers.update(id, updates);
  },

  // Compter les réponses
  async count() {
    return await db.answers.count();
  },

  // Supprimer toutes les réponses
  async clear() {
    return await db.answers.clear();
  },
};

// Fonctions utilitaires pour le cache des quiz
export const quizCache = {
  // Ajouter un quiz au cache
  async set(id: string, data: any) {
    return await db.quizzes.put({
      id,
      data,
      timestamp: new Date(),
    });
  },

  // Obtenir un quiz du cache
  async get(id: string) {
    const cached = await db.quizzes.get(id);
    return cached?.data || null;
  },

  // Supprimer un quiz du cache
  async delete(id: string) {
    return await db.quizzes.delete(id);
  },

  // Vider le cache
  async clear() {
    return await db.quizzes.clear();
  },
};

// Fonctions utilitaires pour les paramètres utilisateur
export const settings = {
  // Obtenir les paramètres
  async get() {
    const stored = await db.settings.get('user');
    return stored || null;
  },

  // Mettre à jour les paramètres
  async set(data: Partial<UserSettings>) {
    const existing = await db.settings.get('user');
    
    if (existing) {
      return await db.settings.update('user', {
        ...existing,
        ...data,
        updatedAt: new Date(),
      });
    } else {
      return await db.settings.add({
        id: 'user',
        ...data,
        updatedAt: new Date(),
      });
    }
  },
};

// Fonctions utilitaires pour les états de révision
export const localReviewStates = {
  // Obtenir l'état pour une question
  async get(questionId: string) {
    const state = await db.reviewStates.where('questionId').equals(questionId).first();
    return state || null;
  },

  // Mettre à jour l'état pour une question
  async set(state: ReviewState) {
    return await db.reviewStates.put({
      ...state,
      id: crypto.randomUUID || (() => Math.random().toString(36).substring(2, 9) + Date.now().toString(36))(),
      updatedAt: new Date(),
    });
  },

  // Supprimer l'état pour une question
  async delete(questionId: string) {
    const state = await db.reviewStates.where('questionId').equals(questionId).first();
    if (state) {
      await db.reviewStates.delete(state.id);
    }
  },

  // Synchroniser avec le serveur
  async syncWithServer(userId: string) {
    try {
      // Obtenir les états du serveur
      const response = await fetch(`/api/stats/review-states?userId=${userId}`);
      
      if (response.ok) {
        const serverStates = await response.json();
        
        // Synchroniser avec la base locale
        for (const serverState of serverStates) {
          await db.reviewStates.put({
            id: serverState.id,
            questionId: serverState.questionId,
            quizId: serverState.quizId,
            nextReviewDate: new Date(serverState.nextReviewDate),
            interval: serverState.interval,
            easeFactor: serverState.easeFactor,
            repetitionCount: serverState.repetitionCount,
            consecutiveCorrect: serverState.consecutiveCorrect,
            consecutiveIncorrect: serverState.consecutiveIncorrect,
            updatedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('[IndexedDB] Erreur lors de la synchronisation des états de révision :', error);
    }
  },
};

// Nettoyer les données expirées
export async function cleanupExpiredData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Supprimer les réponses en attente depuis plus de 30 jours
  await db.answers
    .where('timestamp')
    .below(thirtyDaysAgo)
    .delete();

  // Supprimer les quiz en cache depuis plus de 30 jours
  await db.quizzes
    .where('timestamp')
    .below(thirtyDaysAgo)
    .delete();

  console.log('[IndexedDB] Nettoyage des données expirées terminé');
}

export default db;
