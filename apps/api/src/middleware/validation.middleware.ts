/**
 * Middleware de validation Zod
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Valide la requête avec un schéma Zod
 * @param schema - Schéma Zod pour valider le body
 * @param source - Source des données ('body', 'query', 'params')
 */
export function validateRequest(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valider les données
      const data = req[source];
      const result = schema.parse(data);

      // Ajouter les données validées à la requête
      (req as any)[`${source}Validated`] = result;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formater les erreurs en français
        const errors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          let message = formatZodError(err);
          
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(message);
        });

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Erreur de validation des données',
            details: errors,
          },
        });
      }

      // Erreur inattendue
      console.error('Erreur de validation :', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne lors de la validation',
        },
      });
    }
  };
}

/**
 * Formate une erreur Zod en message lisible en français
 */
function formatZodError(error: ZodError['errors'][0]): string {
  const { code, message, path, min, max, expected, options } = error;

  switch (code) {
    case 'invalid_type':
      if (expected === 'string') {
        return `doit être une chaîne de caractères`;
      } else if (expected === 'number') {
        return `doit être un nombre`;
      } else if (expected === 'boolean') {
        return `doit être un booléen (vrai/faux)`;
      } else if (expected === 'array') {
        return `doit être une liste`;
      } else if (expected === 'object') {
        return `doit être un objet`;
      }
      return `doit être de type ${expected}`;

    case 'invalid_literal':
      return `doit être égal à ${expected}`;

    case 'unrecognized_keys':
      return `contient des clés non reconnues : ${error.keys.join(', ')}`;

    case 'invalid_union':
      return `doit correspondre à l'une des valeurs : ${options?.join(', ') || expected}`;

    case 'invalid_enum_value':
      return `doit être l'une des valeurs : ${options?.join(', ') || expected}`;

    case 'invalid_arguments':
      return message;

    case 'invalid_return_type':
      return message;

    case 'invalid_date':
      return `date invalide : ${message}`;

    case 'invalid_string':
      if (error.validation === 'email') {
        return 'adresse email invalide';
      } else if (error.validation === 'uuid') {
        return 'UUID invalide';
      } else if (error.validation === 'cuid') {
        return 'CUID invalide';
      } else if (error.validation === 'ulid') {
        return 'ULID invalide';
      } else if (error.validation === 'url') {
        return 'URL invalide';
      } else if (error.validation === 'emoji') {
        return 'doit être un emoji';
      } else if (error.validation === 'datetime') {
        return 'date/heure invalide';
      } else if (error.validation === 'base64') {
        return 'chaîne Base64 invalide';
      }
      return `chaîne invalide : ${message}`;

    case 'too_small':
      if (error.type === 'array') {
        return `doit contenir au moins ${min} élément${min !== 1 ? 's' : ''}`;
      } else if (error.type === 'string') {
        return `doit contenir au moins ${min} caractère${min !== 1 ? 's' : ''}`;
      } else if (error.type === 'number') {
        return `doit être supérieur ou égal à ${min}`;
      }
      return `trop petit : ${message}`;

    case 'too_big':
      if (error.type === 'array') {
        return `doit contenir au maximum ${max} élément${max !== 1 ? 's' : ''}`;
      } else if (error.type === 'string') {
        return `doit contenir au maximum ${max} caractère${max !== 1 ? 's' : ''}`;
      } else if (error.type === 'number') {
        return `doit être inférieur ou égal à ${max}`;
      }
      return `trop grand : ${message}`;

    case 'custom':
      return message;

    case 'invalid_intersection_types':
    case 'not_finite':
    default:
      return message || 'valeur invalide';
  }
}

/**
 * Middleware pour valider les paramètres de requête
 */
export function validateQuery(schema: ZodSchema) {
  return validateRequest(schema, 'query');
}

/**
 * Middleware pour valider les paramètres d'URL
 */
export function validateParams(schema: ZodSchema) {
  return validateRequest(schema, 'params');
}

/**
 * Middleware combiné pour valider plusieurs sources
 */
export function validateMultiple(
  schemas: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
  }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: Record<string, string[]> = {};

      // Valider le body
      if (schemas.body) {
        try {
          const result = schemas.body.parse(req.body);
          (req as any).bodyValidated = result;
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = `body.${err.path.join('.')}`;
              const message = formatZodError(err);
              if (!errors[path]) errors[path] = [];
              errors[path].push(message);
            });
          }
        }
      }

      // Valider la query
      if (schemas.query) {
        try {
          const result = schemas.query.parse(req.query);
          (req as any).queryValidated = result;
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = `query.${err.path.join('.')}`;
              const message = formatZodError(err);
              if (!errors[path]) errors[path] = [];
              errors[path].push(message);
            });
          }
        }
      }

      // Valider les params
      if (schemas.params) {
        try {
          const result = schemas.params.parse(req.params);
          (req as any).paramsValidated = result;
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = `params.${err.path.join('.')}`;
              const message = formatZodError(err);
              if (!errors[path]) errors[path] = [];
              errors[path].push(message);
            });
          }
        }
      }

      // Si des erreurs ont été collectées
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Erreur de validation des données',
            details: errors,
          },
        });
      }

      next();
    } catch (error) {
      console.error('Erreur de validation multiple :', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne lors de la validation',
        },
      });
    }
  };
}
