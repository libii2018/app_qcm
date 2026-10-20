import { z } from 'zod';

// Schéma pour l'inscription
export const RegisterUserSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
});

// Schéma pour la connexion
export const LoginUserSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est obligatoire'),
});

// Schéma pour la mise à jour du profil
export const UpdateUserSchema = z.object({
  email: z.string().email('Adresse email invalide').optional(),
  dailyGoal: z.number().min(1).max(100).optional(),
  password: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
});

// Schéma pour les préférences utilisateur
export const UserPreferencesSchema = z.object({
  dailyGoal: z.number().min(1).max(100).default(10),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('fr'),
});

export type RegisterUserData = z.infer<typeof RegisterUserSchema>;
export type LoginUserData = z.infer<typeof LoginUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
