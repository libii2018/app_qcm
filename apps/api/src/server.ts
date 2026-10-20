/**
 * Serveur Express pour l'API QCM
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { authRouter } from './routes/auth.routes';
import { quizRouter } from './routes/quiz.routes';
import { mediaRouter } from './routes/media.routes';
import { answerRouter } from './routes/answer.routes';
import { statsRouter } from './routes/stats.routes';
import { todayRouter } from './routes/today.routes';
import { backupRouter } from './routes/backup.routes';
import { healthRouter } from './routes/health.routes';

import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';

// Charger les variables d'environnement
dotenv.config();

const app = express();

// ============================================
// Middleware
// ============================================

// Sécurité
app.use(helmet());

// Cookie parser
app.use(cookieParser());

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Trop de requêtes. Veuillez réessayer plus tard.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Appliquer le rate limiting à toutes les routes
app.use('/api/', limiter);

// Parsing du body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(requestLogger);

// ============================================
// Routes
// ============================================

// API routes
app.use('/api/auth', authRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/media', mediaRouter);
app.use('/api/answers', answerRouter);
app.use('/api/stats', statsRouter);
app.use('/api/today', todayRouter);
app.use('/api/backup', backupRouter);
app.use('/api/health', healthRouter);

// Serveur statique pour les médias (en développement)
if (process.env.NODE_ENV === 'development') {
  const mediaDir = process.env.MEDIA_UPLOAD_DIR || './uploads/media';
  app.use('/uploads/media', express.static(path.resolve(mediaDir)));
}

// Route racine
app.get('/', (req, res) => {
  res.json({
    name: 'QCM API',
    version: '1.0.0',
    description: 'API pour l\'application QCM',
    endpoints: {
      auth: '/api/auth',
      quizzes: '/api/quizzes',
      media: '/api/media',
      answers: '/api/answers',
      stats: '/api/stats',
      today: '/api/today',
      backup: '/api/backup',
      health: '/api/health',
    },
  });
});

// ============================================
// Gestion des erreurs
// ============================================
app.use(errorHandler);

// ============================================
// 404 Handler
// ============================================
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route non trouvée',
    },
  });
});

// ============================================
// Démarrage du serveur
// ============================================
// Exporter l'app pour les tests et l'utilisation programmatique
export default app;

// Démarrer le serveur uniquement si ce fichier est exécuté directement
if (require.main === module) {
  const PORT = process.env.PORT || 3001;

  const server = app.listen(PORT, () => {
    console.log(`🚀 Serveur QCM démarré sur le port ${PORT}`);
    console.log(`📖 Documentation : http://localhost:${PORT}/`);
    console.log(`🔒 Mode : ${process.env.NODE_ENV || 'development'}`);
  });

  // Gestion des erreurs non captées
  server.on('error', (error) => {
    console.error('❌ Erreur du serveur :', error);
    process.exit(1);
  });

  // Gestion de la fermeture
  process.on('SIGTERM', () => {
    console.log('⏹️  Fermeture du serveur...');
    server.close(() => {
      console.log('✅ Serveur arrêté');
      process.exit(0);
    });
  });
}
