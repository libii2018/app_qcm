import { describe, it, expect } from 'vitest';
import { 
  QuizSchema, 
  QuestionSchema, 
  OptionSchema, 
  MediaContentSchema,
  validateQuizJson 
} from './media.schema';
import { QuizJson } from '../types';

// Quiz valide pour les tests
const validQuiz: QuizJson = {
  schemaVersion: 1,
  id: 'quiz-001',
  title: 'Test Quiz',
  subject: 'Test Subject',
  tags: ['test'],
  difficulty: 1,
  questions: [
    {
      id: 'q1',
      prompt: [{ type: 'text', value: 'Question 1 ?' }],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true },
        { id: 'b', content: [{ type: 'text', value: 'B' }], correct: false }
      ],
      multiple: false,
      tags: ['test'],
      difficulty: 1
    }
  ]
};

describe('Media Schema - Validation Zod', () => {
  describe('MediaContentSchema', () => {
    it('devrait valider un contenu texte simple', () => {
      const content = { type: 'text', value: 'Ceci est du texte' };
      const result = MediaContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });

    it('devrait valider un contenu texte avec Markdown', () => {
      const content = { type: 'text', value: '# Titre\n\nCeci est du **Markdown**' };
      const result = MediaContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });

    it('devrait valider une image avec src et alt', () => {
      const content = { 
        type: 'image', 
        src: 'media/photo.jpg',
        alt: 'Une belle photo'
      };
      const result = MediaContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });

    it('devrait valider une image avec URL', () => {
      const content = { 
        type: 'image', 
        src: 'https://example.com/photo.jpg',
        alt: 'Une image en ligne'
      };
      const result = MediaContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });

    it('devrait valider un audio avec src et duration', () => {
      const content = { 
        type: 'audio', 
        src: 'media/audio.mp3',
        duration: 120
      };
      const result = MediaContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });

    it('devrait valider une vidéo avec src, duration et poster', () => {
      const content = { 
        type: 'video', 
        src: 'media/video.mp4',
        duration: 300,
        poster: 'media/poster.jpg'
      };
      const result = MediaContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un type invalide', () => {
      const content = { type: 'invalid' as any, value: 'test' };
      const result = MediaContentSchema.safeParse(content);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un contenu sans type', () => {
      const content = { value: 'test' };
      const result = MediaContentSchema.safeParse(content);
      expect(result.success).toBe(false);
    });
  });

  describe('OptionSchema', () => {
    it('devrait valider une option simple', () => {
      const option = {
        id: 'a',
        content: [{ type: 'text', value: 'Réponse A' }],
        correct: true
      };
      const result = OptionSchema.safeParse(option);
      expect(result.success).toBe(true);
    });

    it('devrait valider une option avec plusieurs contenus', () => {
      const option = {
        id: 'b',
        content: [
          { type: 'text', value: 'Réponse B' },
          { type: 'image', src: 'media/image.jpg' }
        ],
        correct: false
      };
      const result = OptionSchema.safeParse(option);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une option sans id', () => {
      const option = {
        id: '',
        content: [{ type: 'text', value: 'Réponse' }],
        correct: true
      };
      const result = OptionSchema.safeParse(option);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une option sans contenu', () => {
      const option = {
        id: 'a',
        content: [],
        correct: true
      };
      const result = OptionSchema.safeParse(option);
      expect(result.success).toBe(false);
    });
  });

  describe('QuestionSchema', () => {
    it('devrait valider une question simple', () => {
      const question = {
        id: 'q1',
        prompt: [{ type: 'text', value: 'Question 1 ?' }],
        options: [
          { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true },
          { id: 'b', content: [{ type: 'text', value: 'B' }], correct: false }
        ],
        multiple: false,
        tags: ['test'],
        difficulty: 1
      };
      const result = QuestionSchema.safeParse(question);
      expect(result.success).toBe(true);
    });

    it('devrait valider une question avec plusieurs médias', () => {
      const question = {
        id: 'q1',
        prompt: [
          { type: 'text', value: 'Que voit-on sur cette image ?' },
          { type: 'image', src: 'media/photo.jpg', alt: 'Une photo' }
        ],
        options: [
          { id: 'a', content: [{ type: 'image', src: 'media/option-a.jpg' }], correct: true },
          { id: 'b', content: [{ type: 'text', value: 'B' }], correct: false }
        ],
        multiple: true,
        hint: 'Regardez bien',
        explanation: 'La bonne réponse est A',
        tags: ['images', 'test'],
        difficulty: 2
      };
      const result = QuestionSchema.safeParse(question);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une question sans id', () => {
      const question = {
        id: '',
        prompt: [{ type: 'text', value: 'Question ?' }],
        options: [
          { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true }
        ],
        multiple: false
      };
      const result = QuestionSchema.safeParse(question);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une question sans prompt', () => {
      const question = {
        id: 'q1',
        prompt: [],
        options: [
          { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true }
        ],
        multiple: false
      };
      const result = QuestionSchema.safeParse(question);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une question avec moins de 2 options', () => {
      const question = {
        id: 'q1',
        prompt: [{ type: 'text', value: 'Question ?' }],
        options: [
          { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true }
        ],
        multiple: false
      };
      const result = QuestionSchema.safeParse(question);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une question avec une difficulté invalide', () => {
      const question = {
        id: 'q1',
        prompt: [{ type: 'text', value: 'Question ?' }],
        options: [
          { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true },
          { id: 'b', content: [{ type: 'text', value: 'B' }], correct: false }
        ],
        multiple: false,
        difficulty: 6 // Invalide (max 5)
      };
      const result = QuestionSchema.safeParse(question);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une question avec une difficulté < 1', () => {
      const question = {
        id: 'q1',
        prompt: [{ type: 'text', value: 'Question ?' }],
        options: [
          { id: 'a', content: [{ type: 'text', value: 'A' }], correct: true },
          { id: 'b', content: [{ type: 'text', value: 'B' }], correct: false }
        ],
        multiple: false,
        difficulty: 0 // Invalide (min 1)
      };
      const result = QuestionSchema.safeParse(question);
      expect(result.success).toBe(false);
    });
  });

  describe('QuizSchema', () => {
    it('devrait valider un quiz complet', () => {
      const result = QuizSchema.safeParse(validQuiz);
      expect(result.success).toBe(true);
    });

    it('devrait valider un quiz avec description', () => {
      const quiz = { ...validQuiz, description: 'Un quiz de test' };
      const result = QuizSchema.safeParse(quiz);
      expect(result.success).toBe(true);
    });

    it('devrait valider un quiz avec metadata', () => {
      const quiz = { 
        ...validQuiz, 
        metadata: { author: 'Test', version: '1.0' }
      };
      const result = QuizSchema.safeParse(quiz);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un quiz avec schemaVersion invalide', () => {
      const quiz = { ...validQuiz, schemaVersion: 2 };
      const result = QuizSchema.safeParse(quiz);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un quiz sans id', () => {
      const quiz = { ...validQuiz, id: '' };
      const result = QuizSchema.safeParse(quiz);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un quiz sans title', () => {
      const quiz = { ...validQuiz, title: '' };
      const result = QuizSchema.safeParse(quiz);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un quiz sans subject', () => {
      const quiz = { ...validQuiz, subject: '' };
      const result = QuizSchema.safeParse(quiz);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un quiz sans questions', () => {
      const quiz = { 
        ...validQuiz, 
        questions: [] 
      } as any;
      const result = QuizSchema.safeParse(quiz);
      expect(result.success).toBe(false);
    });
  });

  describe('validateQuizJson', () => {
    it('devrait valider un quiz valide', () => {
      const result = validateQuizJson(validQuiz as QuizJson);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('devrait retourner des erreurs en français pour un quiz invalide', () => {
      const invalidQuiz = {
        schemaVersion: 1,
        id: '', // Invalide
        title: '', // Invalide
        subject: '', // Invalide
        questions: [] // Invalide
      };

      const result = validateQuizJson(invalidQuiz);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Vérifier que les messages sont en français
      result.errors.forEach(error => {
        expect(error).not.toContain('invalid_type');
        expect(error).not.toContain('too_small');
      });

      // Vérifier la présence de mots français
      const frenchWords = ['doit', 'contenir', 'caractère', 'élément', 'obligatoire', 'champ'];
      const hasFrench = result.errors.some(error =>
        frenchWords.some(word => error.includes(word))
      );
      expect(hasFrench).toBe(true);
    });

    it('devrait inclure le chemin dans les erreurs', () => {
      const invalidQuiz = {
        schemaVersion: 1,
        id: 'quiz-1',
        title: 'Test',
        subject: 'Test',
        questions: [
          {
            id: '', // Invalide
            prompt: [], // Invalide
            options: [], // Invalide
            multiple: false
          }
        ]
      } as any;

      const result = validateQuizJson(invalidQuiz);
      expect(result.success).toBe(false);
      
      // Les erreurs devraient inclure les chemins
      const hasPath = result.errors.some(error =>
        error.includes('questions.0.id') || 
        error.includes('questions.0.prompt') ||
        error.includes('questions.0.options')
      );
      expect(hasPath).toBe(true);
    });
  });
});
