export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
}

const JACK: User = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: 'Jack',
    email: '',
    avatarUrl: 'https://unsplash.com'
};

/**
 * Es gibt aktuell nur einen User, der ist hier fest hinterlegt.
 * Wenn man eine echte Benutzerverwaltung möchte, dann muss das hier dynamisch aus der Anmeldung ermittelt werden
 */
export const CURRENT_USER: User = JACK

