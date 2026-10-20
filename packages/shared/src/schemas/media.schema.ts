import { z } from 'zod';

// Schéma pour le contenu média dans les questions et réponses
export const MediaContentSchema = z.object({
  type: z.enum(['text', 'image', 'audio', 'video']),
  value: z.string().optional(), // Pour le texte (Markdown supporté)
  src: z.string().optional(), // URL, chemin relatif (media/xxx) ou identifiant (media:xxx)
  alt: z.string().optional(), // Texte alternatif (recommandé pour les images)
  duration: z.number().optional(), // Durée en secondes (audio/video)
  poster: z.string().optional(), // Image de poster pour la vidéo
});

// Schéma pour une option de réponse
export const OptionSchema = z.object({
  id: z.string().min(1, 'L\'ID doit contenir au moins 1 caractère'),
  content: z.array(MediaContentSchema).min(1, 'Une option doit contenir au moins un élément'),
  correct: z.boolean().default(false),
});

// Schéma pour une question
export const QuestionSchema = z.object({
  id: z.string().min(1, 'L\'ID doit contenir au moins 1 caractère'),
  prompt: z.array(MediaContentSchema).min(1, 'La question doit avoir au moins un élément de prompt'),
  options: z.array(OptionSchema).min(2, 'Une question doit avoir au moins 2 options'),
  multiple: z.boolean().default(false),
  hint: z.string().optional(),
  explanation: z.string().optional(),
  tags: z.array(z.string()).default([]),
  difficulty: z.number().min(1).max(5).default(1),
  metadata: z.record(z.unknown()).optional(),
});

// Schéma pour un quiz complet
export const QuizSchema = z.object({
  schemaVersion: z.literal(1, 'La version du schéma doit être 1'),
  id: z.string().min(1, 'L\'ID doit contenir au moins 1 caractère'),
  title: z.string().min(1, 'Le titre est obligatoire'),
  subject: z.string().min(1, 'La matière est obligatoire'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  difficulty: z.number().min(1).max(5).default(1),
  questions: z.array(QuestionSchema).min(1, 'Un quiz doit contenir au moins une question'),
  metadata: z.record(z.unknown()).optional(),
});

// Type extrait du schéma
export type QuizJson = z.infer<typeof QuizSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type MediaContent = z.infer<typeof MediaContentSchema>;

// Fonction de validation avec messages en français
export function validateQuizJson(data: unknown): { success: boolean; data?: QuizJson; errors: string[] } {
  const result = QuizSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  
  const errors: string[] = [];
  
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    let message = error.message;
    
    // Traduction des messages d'erreur
    switch (error.code) {
      case 'invalid_type':
        message = `Le champ « ${path} » doit être de type ${error.expected}`;
        break;
      case 'invalid_enum_value':
        message = `Le champ « ${path} » doit être l'une des valeurs : ${error.options?.join(', ')}`;
        break;
      case 'too_small':
        if (error.min !== undefined) {
          message = `Le champ « ${path} » doit avoir au moins ${error.min} ${error.type === 'array' ? 'éléments' : error.type === 'string' ? 'caractères' : ''}`;
        }
        break;
      case 'too_big':
        if (error.max !== undefined) {
          message = `Le champ « ${path} » doit avoir au maximum ${error.max} ${error.type === 'array' ? 'éléments' : error.type === 'string' ? 'caractères' : ''}`;
        }
        break;
      case 'invalid_string':
        message = `Le champ « ${path} » a un format invalide`;
        break;
      case 'custom':
        // déjà en français
        break;
    }
    
    errors.push(`${path}: ${message}`);
  });
  
  return { success: false, errors };
}

// Schéma pour les requêtes d'import/export
export const ImportQuizSchema = z.object({
  quiz: QuizSchema.optional(),
  file: z.instanceof(Buffer).optional(),
  filename: z.string().optional(),
});

export const ExportFormatSchema = z.enum(['json', 'zip']);

export type ImportQuizData = z.infer<typeof ImportQuizSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
