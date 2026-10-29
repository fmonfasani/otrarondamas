import { z } from 'zod';
import {
  EmailSchema,
  PasswordSchema,
  StrongPasswordSchema,
  NameSchema,
} from './common';

/**
 * Authentication validation schemas
 */

/**
 * Login validation schema
 */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Contraseña es requerida'),
});

export type Login = z.infer<typeof LoginSchema>;

/**
 * Register validation schema
 */
export const RegisterSchema = z
  .object({
    email: EmailSchema,
    password: StrongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
    name: NameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type Register = z.infer<typeof RegisterSchema>;

/**
 * Onboarding validation schema (for new user setup)
 */
export const OnboardingSchema = z.object({
  name: NameSchema,
  email: EmailSchema,
  password: StrongPasswordSchema,
  confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
  companyName: z
    .string()
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
    .max(100, 'El nombre de la empresa es muy largo')
    .trim(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Debe aceptar los términos y condiciones',
  }),
});

export type Onboarding = z.infer<typeof OnboardingSchema>;

/**
 * Change password validation schema
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Contraseña actual es requerida'),
    newPassword: StrongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  });

export type ChangePassword = z.infer<typeof ChangePasswordSchema>;

/**
 * Forgot password request validation schema
 */
export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>;

/**
 * Reset password validation schema
 */
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token es requerido'),
    password: StrongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ResetPassword = z.infer<typeof ResetPasswordSchema>;

/**
 * Google OAuth validation schema
 */
export const GoogleOAuthSchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
});

export type GoogleOAuth = z.infer<typeof GoogleOAuthSchema>;

/**
 * Refresh token validation schema
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es requerido'),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
