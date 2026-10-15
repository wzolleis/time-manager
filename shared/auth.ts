// shared/auth.ts
import {z} from "zod";

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt berücksichtigt nur die ersten 72 Bytes, längere Passwörter würden still abgeschnitten
export const PASSWORD_MAX_BYTES = 72;

export const PasswordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben`)
    .refine(
        (s) => new TextEncoder().encode(s).length <= PASSWORD_MAX_BYTES,
        `Das Passwort darf höchstens ${PASSWORD_MAX_BYTES} Bytes lang sein`,
    );

// Beim Login nur Form prüfen, nicht die Passwortregeln: sonst verrät die Fehlermeldung zu viel
export const LoginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
});

export const PasswordChangeSchema = z.object({
    oldPassword: z.string().min(1),
    newPassword: PasswordSchema,
});

export const PasswordResetSchema = z.object({
    userId: z.string().uuid(),
    password: PasswordSchema,
});

export type Login = z.infer<typeof LoginSchema>;
export type PasswordChange = z.infer<typeof PasswordChangeSchema>;
export type PasswordReset = z.infer<typeof PasswordResetSchema>;
