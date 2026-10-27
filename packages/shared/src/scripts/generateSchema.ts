/**
 * Script pour générer le JSON Schema à partir des schémas Zod
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import type { ZodTypeAny } from 'zod';
import { QuizSchema, MediaContentSchema, OptionSchema, QuestionSchema } from '../schemas/media.schema';

/**
 * Convertit un schéma Zod en JSON Schema
 */
function zodToJsonSchema(schema: any, description?: string): any {
  const type = schema._def.typeName;

  switch (type) {
    case 'ZodString': {
      const zSchema = schema as any;
      const result: any = {
        type: 'string',
        ...(description && { description }),
      };

      if (zSchema._def.checks) {
        for (const check of zSchema._def.checks) {
          switch (check.kind) {
            case 'min':
              result.minLength = check.value;
              break;
            case 'max':
              result.maxLength = check.value;
              break;
            case 'email':
              result.format = 'email';
              break;
            case 'uuid':
              result.format = 'uuid';
              break;
            case 'regex':
              result.pattern = check.regex.source;
              break;
          }
        }
      }

      return result;
    }

    case 'ZodNumber': {
      const zSchema = schema as any;
      const result: any = {
        type: 'number',
        ...(description && { description }),
      };

      if (zSchema._def.checks) {
        for (const check of zSchema._def.checks) {
          switch (check.kind) {
            case 'min':
              result.minimum = check.value;
              if (check.inclusive === false) result.exclusiveMinimum = check.value;
              break;
            case 'max':
              result.maximum = check.value;
              if (check.inclusive === false) result.exclusiveMaximum = check.value;
              break;
            case 'int':
              result.type = 'integer';
              break;
          }
        }
      }

      return result;
    }

    case 'ZodBoolean':
      return {
        type: 'boolean',
        ...(description && { description }),
      };

    case 'ZodLiteral':
      return {
        type: 'string',
        enum: [schema._def.value],
        ...(description && { description }),
      };

    case 'ZodEnum':
      return {
        type: 'string',
        enum: schema._def.values,
        ...(description && { description }),
      };

    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchema(schema._def.type),
        ...(description && { description }),
      };

    case 'ZodObject': {
      const zSchema = schema as any;
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const key of Object.keys(zSchema._def.shape())) {
        const shape = zSchema._def.shape()[key];
        const fieldSchema = schema.shape[key as keyof typeof schema.shape];

        // Vérifier si le champ est obligatoire
        const isOptional = shape._def?.typeName === 'ZodOptional' || 
                          shape._def?.innerType?._def?.typeName === 'ZodOptional' ||
                          shape._def?.checks?.some((c: any) => c.kind === 'optional');

        // Obtenir le schéma de base
        let baseSchema = shape;
        while (baseSchema._def?.typeName === 'ZodOptional' || 
               baseSchema._def?.typeName === 'ZodNullable' ||
               baseSchema._def?.typeName === 'ZodDefault') {
          baseSchema = baseSchema._def.innerType;
        }

        properties[key] = zodToJsonSchema(baseSchema);

        if (!isOptional) {
          required.push(key);
        }
      }

      const result: any = {
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
        ...(description && { description }),
      };

      return result;
    }

    case 'ZodOptional':
    case 'ZodNullable':
      return zodToJsonSchema(schema._def.innerType, description);

    case 'ZodDefault':
      return {
        ...zodToJsonSchema(schema._def.innerType, description),
        default: schema._def.defaultValue(),
      };

    case 'ZodUnion':
      return {
        anyOf: (schema._def.options as ZodTypeAny[]).map(opt => zodToJsonSchema(opt)),
        ...(description && { description }),
      };

    case 'ZodRecord':
      return {
        type: 'object',
        additionalProperties: zodToJsonSchema(schema._def.valueType),
        ...(description && { description }),
      };

    case 'ZodDate':
      return {
        type: 'string',
        format: 'date-time',
        ...(description && { description }),
      };

    default:
      console.warn(`Type de schéma non supporté : ${type}`);
      return { type: 'unknown' };
  }
}

/**
 * Génère le JSON Schema complet
 */
function generateFullSchema(): any {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://qcm-app.example.com/schema/quiz.schema.json',
    title: 'QCM Quiz Schema',
    description: 'Schéma JSON pour les quiz QCM (Questionnaire à Choix Multiples). Utilisé pour générer et valider les quiz.',
    version: '1.0.0',
    definitions: {
      mediaContent: zodToJsonSchema(MediaContentSchema, 'Contenu média (texte, image, audio, vidéo)'),
      option: zodToJsonSchema(OptionSchema, 'Option de réponse'),
      question: zodToJsonSchema(QuestionSchema, 'Question du quiz'),
    },
    type: 'object',
    properties: {
      schemaVersion: {
        type: 'integer',
        const: 1,
        description: 'Version du schéma. Doit être 1.',
      },
      id: {
        type: 'string',
        description: 'Identifiant unique du quiz.',
        examples: ['quiz-001', 'anglais-verbes-irreguliers'],
      },
      title: {
        type: 'string',
        minLength: 1,
        description: 'Titre du quiz.',
        examples: ['Verbes irréguliers - niveau B1', 'Vocabulaire des voyages'],
      },
      subject: {
        type: 'string',
        minLength: 1,
        description: 'Matière ou sujet principal du quiz.',
        examples: ['Anglais', 'Mathématiques', 'Histoire', 'Biologie'],
      },
      description: {
        type: 'string',
        description: 'Description optionnelle du quiz.',
        examples: ['Quiz pour réviser les verbes irréguliers anglais au prétérit et au participe passé.'],
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        default: [],
        description: 'Tags pour catégoriser le quiz.',
        examples: [['grammaire', 'verbes'], ['vocabulaire', 'niveau-a2']],
      },
      difficulty: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        default: 1,
        description: 'Niveau de difficulté du quiz (1 = facile, 5 = très difficile).',
      },
      questions: {
        type: 'array',
        items: { $ref: '#/definitions/question' },
        minItems: 1,
        description: 'Liste des questions du quiz.',
      },
      metadata: {
        type: 'object',
        additionalProperties: true,
        description: 'Métadonnées optionnelles (non utilisées par l\'application mais conservées).',
      },
    },
    required: ['schemaVersion', 'id', 'title', 'subject', 'questions'],
    additionalProperties: false,
    examples: [
      {
        schemaVersion: 1,
        id: 'quiz-001',
        title: 'Verbes irréguliers - niveau B1',
        subject: 'Anglais',
        tags: ['grammaire', 'verbes'],
        difficulty: 2,
        description: 'Quiz pour tester vos connaissances sur les verbes irréguliers anglais.',
        questions: [
          {
            id: 'q1',
            prompt: [{ type: 'text', value: 'Quel est le prétérit de « go » ?' }],
            options: [
              { id: 'a', content: [{ type: 'text', value: 'goed' }], correct: false },
              { id: 'b', content: [{ type: 'text', value: 'went' }], correct: true },
              { id: 'c', content: [{ type: 'text', value: 'gone' }], correct: false },
            ],
            multiple: false,
            hint: 'C\'est un verbe irrégulier courant.',
            explanation: 'Le prétérit de « go » est « went ». « gone » est le participe passé.',
            tags: ['prétérit', 'verbes-irreguliers'],
            difficulty: 2,
          },
        ],
      },
    ],
  };
}

/**
 * Script principal
 */
const schema = generateFullSchema();
const outputPath = resolve(__dirname, '../../../docs/quiz.schema.json');

// Ajouter des commentaires pour l'IA
schema.description += '\n\n' + `
Ce schéma peut être utilisé pour demander à une IA de générer des quiz QCM valides.

Exemple de prompt pour une IA :
"Génère un quiz QCM sur les verbes irréguliers anglais au format JSON suivant ce schéma :
[insérer le schéma ici]

Le quiz doit contenir 10 questions avec :
- Le titre : 'Verbes irréguliers anglais - Niveau B1'
- La matière : 'Anglais'
- Les tags : ['grammaire', 'verbes-irreguliers', 'niveau-b1']
- Une difficulté moyenne (2 ou 3)
- Chaque question doit avoir 4 options (1 correcte, 3 incorrectes)
- Des explications pour chaque question
- Des indices optionnels
"

Règles de génération :
1. schemaVersion doit toujours être 1
2. id doit être unique et descriptif
3. title et subject sont obligatoires
4. questions doit contenir au moins une question
5. Chaque question doit avoir au moins 2 options
6. Une seule option peut être correcte (correct: true) pour les questions à réponse unique
7. Pour les questions à réponse multiple (multiple: true), plusieurs options peuvent être correctes

Types de contenu supportés :
- text : texte simple ou Markdown
- image : image (png, jpg, webp) - requiert src et idéalement alt
- audio : audio (mp3, wav, ogg) - requiert src, peut avoir duration
- video : vidéo (mp4, webm) - requiert src, peut avoir duration et poster

Les médias peuvent être :
- Une URL absolue (https://...)
- Un chemin relatif (media/nom-fichier.ext) pour les imports ZIP
- Un identifiant de média (media:<id>) pour les médias uploadés

Pour les quiz avec médias :
- Créez un fichier ZIP contenant quiz.json à la racine
- Placez les médias dans un dossier media/
- Dans quiz.json, référencez les médias avec des chemins relatifs comme "media/nom-image.png"

Exemple avec médias :
{
  "schemaVersion": 1,
  "id": "quiz-animaux",
  "title": "Deviner les animaux",
  "subject": "Sciences",
  "tags": ["biologie", "animaux"],
  "difficulty": 1,
  "questions": [
    {
      "id": "q1",
      "prompt": [
        { "type": "image", "src": "media/lion.jpg", "alt": "Photo d'un lion" },
        { "type": "text", "value": "Quel animal est représenté sur cette image ?" }
      ],
      "options": [
        { "id": "a", "content": [{ "type": "text", "value": "Tigre" }], "correct": false },
        { "id": "b", "content": [{ "type": "text", "value": "Lion" }], "correct": true },
        { "id": "c", "content": [{ "type": "text", "value": "Léopard" }], "correct": false }
      ],
      "multiple": false
    }
  ]
}
`;

writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf-8');
console.log(`✓ Schéma JSON généré : ${outputPath}`);
