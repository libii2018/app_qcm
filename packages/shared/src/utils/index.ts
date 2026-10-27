/**
 * Utilitaires partagés
 */

import { QuizJson, MediaContent } from '../types';

/**
 * Extrait les médias d'un quiz JSON
 */
export function extractMediaFromQuiz(quiz: QuizJson): MediaContent[] {
  const media: MediaContent[] = [];

  // Parcourir les questions
  for (const question of quiz.questions) {
    // Média dans le prompt
    for (const content of question.prompt) {
      if (content.type !== 'text' && content.src) {
        media.push(content);
      }
    }

    // Média dans les options
    for (const option of question.options) {
      for (const content of option.content) {
        if (content.type !== 'text' && content.src) {
          media.push(content);
        }
      }
    }
  }

  return media;
}

/**
 * Vérifie si une URL est locale (chemin relatif ou identifiant media:)
 */
export function isLocalMediaSrc(src: string): boolean {
  if (!src) return false;
  
  // media:<id>
  if (src.startsWith('media:')) return true;
  
  // Chemin relatif (ne commence pas par http://, https://, data:)
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return false;
  }
  
  return true;
}

/**
 * Extrait l'ID d'un média depuis une source
 */
export function extractMediaId(src: string): string | null {
  if (src.startsWith('media:')) {
    return src.substring(6);
  }
  return null;
}

/**
 * Vérifie si un chemin est sûr (pas de .. ou autres problèmes)
 */
export function isSafePath(path: string): boolean {
  if (!path) return false;
  
  // Vérifier les séquences interdites
  const forbidden = ['..', '/etc', '/root', '/home', '/usr', '/var', '/tmp', '/bin', '/sbin'];
  const lowerPath = path.toLowerCase();
  
  for (const seq of forbidden) {
    if (lowerPath.includes(seq)) {
      return false;
    }
  }
  
  // Vérifier les caractères spéciaux
  const invalidChars = ['<', '>', ':', '"', "'", '|', '?', '*', '\\'];
  for (const char of invalidChars) {
    if (path.includes(char)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Génère un ID unique
 */
export function generateId(prefix: string = 'q'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Formate une date en français
 */
export function formatDateFr(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  };
  return date.toLocaleDateString('fr-FR', options);
}

/**
 * Formate une date relative
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'à l\'instant';
  } else if (diffMins < 60) {
    return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `il y a ${months} mois`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `il y a ${years} an${years > 1 ? 's' : ''}`;
  }
}

/**
 * Formate un nombre avec des séparateurs de milliers
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formate une durée en ms en format lisible
 */
export function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);

  if (hours > 0) {
    return `${hours}h ${mins % 60}m`;
  } else if (mins > 0) {
    return `${mins}m ${secs % 60}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Génère un nom de fichier sûr
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\s+|\s+$/g, '')
    .substring(0, 255);
}

/**
 * Vérifie si un type MIME est autorisé
 */
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  // Vidéo
  'video/mp4',
  'video/webm',
  'video/ogg',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
  '.mp3', '.wav', '.ogg', '.webm',
  '.mp4', '.m4v',
]);

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Obtient l'extension depuis un type MIME
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/ogg': '.ogg',
    'audio/webm': '.webm',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv',
  };
  return map[mimeType] || '.bin';
}

/**
 * Obtient le type de média depuis le type MIME
 */
export function getMediaTypeFromMime(mimeType: string): 'image' | 'audio' | 'video' | 'unknown' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'unknown';
}

/**
 * Limites de taille par type de média (en octets)
 */
export const MEDIA_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5 Mo
  audio: 20 * 1024 * 1024, // 20 Mo
  video: 100 * 1024 * 1024, // 100 Mo
  default: 10 * 1024 * 1024, // 10 Mo
} as const;

/**
 * Vérifie si une taille dépasse la limite pour un type de média
 */
export function isWithinSizeLimit(size: number, mimeType: string): boolean {
  const type = getMediaTypeFromMime(mimeType);
  const limit = (MEDIA_SIZE_LIMITS as Record<string, number>)[type] || MEDIA_SIZE_LIMITS.default;
  return size <= limit;
}

/**
 * Formate une taille en octets en format lisible
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} octets`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} Ko`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  }
}
