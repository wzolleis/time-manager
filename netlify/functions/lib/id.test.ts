import {describe, expect, it} from "vitest";
import {isApiPath} from "./id";

const ID = "00000000-0000-4000-8000-000000000001";
const u = (path: string) => `http://localhost:8888${path}`;

describe("isApiPath", () => {
    it("akzeptiert die Sammlung, mit und ohne Schrägstrich und Query", () => {
        expect(isApiPath(u("/api/users"), "users")).toBe(true);
        expect(isApiPath(u("/api/users/"), "users")).toBe(true);
        expect(isApiPath(u("/api/users?userId=1"), "users")).toBe(true);
    });

    it("akzeptiert eine Ressource mit ID", () => {
        expect(isApiPath(u(`/api/users/${ID}`), "users")).toBe(true);
        expect(isApiPath(u(`/api/time-entries/${ID}`), "time-entries")).toBe(true);
    });

    it("akzeptiert den internen Function-Pfad", () => {
        expect(isApiPath(u(`/.netlify/functions/users/${ID}`), "users")).toBe(true);
    });

    it("lehnt die Wiederholungen von Netlify ab", () => {
        expect(isApiPath(u(`/api/users/${ID}.html`), "users")).toBe(false);
        expect(isApiPath(u(`/api/users/${ID}.htm`), "users")).toBe(false);
        expect(isApiPath(u(`/api/users/${ID}/index.html`), "users")).toBe(false);
        expect(isApiPath(u("/api/users/index.html"), "users")).toBe(false);
    });

    it("lehnt zusätzliche Segmente und andere Namen ab", () => {
        expect(isApiPath(u(`/api/users/${ID}/extra`), "users")).toBe(false);
        expect(isApiPath(u("/api/projects"), "users")).toBe(false);
        expect(isApiPath(u("/api/usersx"), "users")).toBe(false);
    });
});
