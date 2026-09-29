// shared/user.ts
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import type {z} from "zod";
import {users} from "../db/schema";

// Was in der DB steht (Antworten der API): bewusst locker, nur Typen aus der Tabelle
export const UserSchema = createSelectSchema(users);

// Was wir von außen annehmen: strenger. Die id vergibt der Server.
const refine = {
    name: (s: z.ZodString) => s.trim().min(1).max(100),
    email: (s: z.ZodString) => s.trim().toLowerCase().email().max(191),
    avatarUrl: (s: z.ZodString) => s.url().max(2048),
};

export const UserCreateSchema = createInsertSchema(users, refine).omit({id: true});
export const UserUpdateSchema = createUpdateSchema(users, refine).omit({id: true});

export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;