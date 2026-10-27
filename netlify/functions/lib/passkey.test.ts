import {describe, expect, it} from "vitest";
import {relyingParty} from "./passkey";

describe("relyingParty", () => {
    it("nimmt Domain und Origin aus der Anfrage, ohne Port in der RP-ID", () => {
        expect(relyingParty("http://localhost:8888/api/auth/passkey-login", {})).toEqual({
            rpID: "localhost",
            origin: "http://localhost:8888",
        });
    });

    it("nimmt die Variablen vor der Anfrage, z. B. auf einer Deploy-Preview", () => {
        const env = {PASSKEY_RP_ID: "zeit.example.com", PASSKEY_ORIGIN: "https://zeit.example.com"};
        expect(relyingParty("https://deploy-preview-12--zeit.netlify.app/api/auth/passkey-login", env)).toEqual({
            rpID: "zeit.example.com",
            origin: "https://zeit.example.com",
        });
    });
});
