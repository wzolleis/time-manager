import {z} from "zod";
import {createSelectSchema} from "drizzle-zod";
import {passkeys} from "../db/schema";

// Länge der Spalte credential_id. Passkeys haben meist 16 bis 64 Bytes, also weit darunter.
export const CREDENTIAL_ID_MAX_LENGTH = 700;

// Schlüssel, Zähler und credentialId verlassen nie das Backend
export const PasskeySchema = createSelectSchema(passkeys).omit({
    credentialId: true,
    publicKey: true,
    counter: true,
    transports: true,
});

export const PasskeyNameSchema = z.string().trim().min(1, "Bitte einen Namen angeben").max(100);

// Antwort des Browsers (RegistrationResponseJSON bzw. AuthenticationResponseJSON). Hier nur die Form,
// den Inhalt prüft @simplewebauthn/server.
const CredentialResponseSchema = z.looseObject({
    id: z.string().min(1).max(CREDENTIAL_ID_MAX_LENGTH),
    rawId: z.string().min(1),
    type: z.literal("public-key"),
    response: z.looseObject({clientDataJSON: z.string().min(1)}),
    clientExtensionResults: z.looseObject({}),
});

export const PasskeyRegisterSchema = z.object({
    name: PasskeyNameSchema,
    response: CredentialResponseSchema,
});

export const PasskeyLoginSchema = z.object({
    response: CredentialResponseSchema,
});

export type Passkey = z.infer<typeof PasskeySchema>;
