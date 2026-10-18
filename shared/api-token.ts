import {z} from "zod";
import {createSelectSchema} from "drizzle-zod";
import {apiTokens} from "../db/schema";

// Gültigkeit beim Erzeugen in Tagen, null = kein Ablauf
export const API_TOKEN_VALIDITIES = [30, 90, 365, null] as const;
export const DEFAULT_API_TOKEN_VALIDITY = 90;

// Der Hash verlässt nie das Backend
export const ApiTokenSchema = createSelectSchema(apiTokens).omit({tokenHash: true});

export const ApiTokenCreateSchema = z.object({
    name: z.string().trim().min(1, "Bitte einen Namen angeben").max(100),
    expiresInDays: z.union([z.literal(30), z.literal(90), z.literal(365), z.null()]),
});

export type ApiToken = z.infer<typeof ApiTokenSchema>;
export type ApiTokenCreate = z.infer<typeof ApiTokenCreateSchema>;
export type ApiTokenValidity = ApiTokenCreate["expiresInDays"];
// Antwort auf das Erzeugen: nur hier steht das Token selbst
export type CreatedApiToken = ApiToken & {token: string};
// Liste im Administrationsbereich
export type UserApiToken = ApiToken & {userName: string};
