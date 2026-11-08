import { z } from 'zod';
import type { TFunction } from 'i18next';

function emailField(t: TFunction) {
  return z.string().trim().min(1, t('validation.required')).email(t('validation.email'));
}

function passwordField(t: TFunction) {
  return z
    .string()
    .min(8, t('validation.passwordLength'))
    .max(72)
    .regex(/[A-Za-z]/, t('validation.passwordLetter'))
    .regex(/[0-9]/, t('validation.passwordNumber'));
}

function phoneField(t: TFunction) {
  return z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\+?[0-9]{8,15}$/.test(value), t('validation.phone'));
}

export function createLoginSchema(t: TFunction) {
  return z.object({
    email: emailField(t),
    password: z.string().min(1, t('validation.required')).max(72),
  });
}

export function createRegisterSchema(t: TFunction) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t('validation.nameLength'))
        .max(80, t('validation.nameLength')),
      email: emailField(t),
      phone: phoneField(t),
      password: passwordField(t),
      confirmPassword: z.string().min(1, t('validation.required')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation.passwordMismatch'),
    });
}

export function createForgotSchema(t: TFunction) {
  return z.object({ email: emailField(t) });
}

export function createResetSchema(t: TFunction) {
  return z
    .object({
      password: passwordField(t),
      confirmPassword: z.string().min(1, t('validation.required')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation.passwordMismatch'),
    });
}

export function createProfileSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t('validation.nameLength'))
      .max(80, t('validation.nameLength')),
    phone: phoneField(t),
    locale: z.enum(['ar', 'en']),
  });
}

export function createChangePasswordSchema(t: TFunction) {
  return z
    .object({
      currentPassword: z.string().min(1, t('validation.required')).max(72),
      newPassword: passwordField(t),
      confirmPassword: z.string().min(1, t('validation.required')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation.passwordMismatch'),
    });
}

export function createAddressSchema(t: TFunction) {
  return z.object({
    label: z.string().trim().max(40).optional(),
    governorate: z.string().trim().min(2, t('validation.required')).max(80),
    city: z.string().trim().min(2, t('validation.required')).max(80),
    street: z.string().trim().min(3, t('validation.required')).max(200),
    building: z.string().trim().min(1, t('validation.required')).max(80),
    notes: z.string().trim().max(500).optional(),
    isDefault: z.boolean(),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ForgotFormValues = z.infer<ReturnType<typeof createForgotSchema>>;
export type ResetFormValues = z.infer<ReturnType<typeof createResetSchema>>;
export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;
export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>;
export type AddressFormValues = z.infer<ReturnType<typeof createAddressSchema>>;
