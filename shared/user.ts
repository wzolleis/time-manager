// shared/user.ts
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import type {z} from "zod";
import {users} from "../db/schema";
import {PasswordSchema} from "./auth";

// Was in der DB steht (Antworten der API): bewusst locker, nur Typen aus der Tabelle
// Der Passwort-Hash verlässt nie das Backend und wird nie von außen gesetzt.
export const UserSchema = createSelectSchema(users).omit({passwordHash: true});

// Was wir von außen annehmen: strenger. Die id vergibt der Server.
const refine = {
    name: (s: z.ZodString) => s.trim().min(1).max(100),
    email: (s: z.ZodString) => s.trim().toLowerCase().email().max(191),
    avatarUrl: (s: z.ZodString) => s.url().max(2048),
};

// Beim Anlegen legt der Admin das Passwort im Klartext fest, gespeichert wird nur der Hash
export const UserCreateSchema = createInsertSchema(users, refine)
    .omit({id: true, passwordHash: true})
    .extend({password: PasswordSchema});
export const UserUpdateSchema = createUpdateSchema(users, refine).omit({id: true, passwordHash: true});

export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

// Der angemeldete User (/api/auth/me, Login) mit den IDs seiner Rollen
export type CurrentUser = User & {roleIds: string[]};
