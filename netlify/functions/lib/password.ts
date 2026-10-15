// netlify/functions/lib/password.ts
import bcrypt from "bcryptjs";

const COST = 12;

// Vergleichswert für unbekannte E-Mails: so dauert ein Login ohne passenden User genauso lange
// wie einer mit falschem Passwort, und man kann über die Antwortzeit keine E-Mails erraten.
// Fest eingetragen statt beim Start berechnet, das spart bei jedem Kaltstart die Rechenzeit.
const DUMMY_HASH = "$2b$12$Xg502xBCMIYIMiy4KbPswOU7JV9l.vRCGHwx7..IJZq1vrCSDYKEi";

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, COST);

/** Prüft ein Passwort. Ohne Hash (User hat noch kein Passwort) wird trotzdem gerechnet, Ergebnis false. */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
    const ok = await bcrypt.compare(password, hash ?? DUMMY_HASH);
    return ok && hash !== null;
}
