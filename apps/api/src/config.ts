/**
 * Configuration de l'API
 */

import dotenv from 'dotenv';

dotenv.config();

// Configuration de la sécurité
const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');

// Configuration des médias
const maxImageSize = parseInt(process.env.MAX_IMAGE_SIZE || '5242880'); // 5 Mo
const maxAudioSize = parseInt(process.env.MAX_AUDIO_SIZE || '20971520'); // 20 Mo
const maxVideoSize = parseInt(process.env.MAX_VIDEO_SIZE || '104857600'); // 100 Mo
const maxMediaSize = Math.max(maxImageSize, maxAudioSize, maxVideoSize);

// Configuration des tokens JWT
const jwtAccessExpiresIn = parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '86400'); // 24 heures
const jwtRefreshExpiresIn = parseInt(process.env.JWT_REFRESH_EXCEEDED_IN || '604800'); // 7 jours

// Configuration de l'upload des médias
const mediaUploadDir = process.env.MEDIA_UPLOAD_DIR || './uploads/media';

// Configuration du rate limiting
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 1 minute
const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

// Limites de taille par type de média
export const mediaSizeLimits = {
  image: maxImageSize,
  audio: maxAudioSize,
  video: maxVideoSize,
  default: maxMediaSize,
};

export const config = {
  // Sécurité
  bcryptRounds,
  
  // JWT
  jwtAccessExpiresIn,
  jwtRefreshExpiresIn,
  
  // Médias
  maxImageSize,
  maxAudioSize,
  maxVideoSize,
  maxMediaSize,
  mediaUploadDir,
  
  // Rate limiting
  rateLimitWindowMs,
  rateLimitMaxRequests,
  
  // Développement
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001'),
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || '*',
  
  // Base de données
  databaseUrl: process.env.DATABASE_URL || 'file:./prisma/dev.db',
};

export default config;
