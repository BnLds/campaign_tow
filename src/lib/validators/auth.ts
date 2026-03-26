// Campaign TOW — Auth validators (client-safe, pure Zod)

import { z } from 'zod'

// Shared username field — single source of truth for username constraints
const RESERVED_USERNAMES = new Set(['__guest__', 'admin', 'system'])
const usernameField = z.string().trim().min(2, 'Le nom doit faire au moins 2 caracteres').max(50, 'Le nom ne peut pas depasser 50 caracteres').refine((v) => !RESERVED_USERNAMES.has(v.toLowerCase()), "Ce nom d'utilisateur est réservé")

// Login form schema — used in loginFn and TanStack Form (AC2, AC3)
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

// Username update schema — for profile settings and invite setup
export const updateUsernameSchema = z.object({ username: usernameField })
export type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>

// Admin — Create player account (invite link flow)
export const createPlayerSchema = z.object({ username: usernameField })
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>

function passwordConfirmRefinement(pwField: string, confirmField: string) {
  return (data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (data[pwField] !== data[confirmField]) {
      ctx.addIssue({
        code: 'custom',
        message: 'Les mots de passe ne correspondent pas',
        path: [confirmField],
      })
    }
  }
}

// Invite form schema — single merged schema for TanStack Form (username + password fields)
export const inviteFormSchema = z.object({
  username: usernameField,
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères').max(100),
  confirmPassword: z.string().min(6).max(100),
}).superRefine(passwordConfirmRefinement('password', 'confirmPassword'))
export type InviteFormInput = z.infer<typeof inviteFormSchema>

// Password change — settings page
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(100).optional(),
  newPassword: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères').max(100),
  confirmNewPassword: z.string().min(6).max(100),
}).superRefine(passwordConfirmRefinement('newPassword', 'confirmNewPassword'))
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
