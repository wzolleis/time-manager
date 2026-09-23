import type {User} from "@user/types.ts";

/**
 * Es gibt aktuell nur einen User, der ist hier fest hinterlegt.
 * Wenn man eine echte Benutzerverwaltung möchte, dann muss das hier dynamisch aus der Anmeldung ermittelt werden
 */
export const CURRENT_USER: User = {
    id: 'jack-unique-id',
    name: 'Jack',
    email: 'admin@example.com',
    avatarUrl: 'https://unsplash.com'
};