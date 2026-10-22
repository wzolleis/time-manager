import {describe, expect, it} from "vitest";
import {IdSchema, isApiPath, isRoutePath, pathParams, stripRetrySuffix} from "./id";

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

    it("akzeptiert die Wiederholungen von Netlify wie das Original", () => {
        expect(isApiPath(u("/api/users.html?userId=1"), "users")).toBe(true);
        expect(isApiPath(u("/api/users.htm"), "users")).toBe(true);
        expect(isApiPath(u("/api/users/index.html"), "users")).toBe(true);
        expect(isApiPath(u(`/api/users/${ID}.html`), "users")).toBe(true);
        expect(isApiPath(u(`/api/users/${ID}/index.htm`), "users")).toBe(true);
    });

    it("lehnt andere Endungen ab", () => {
        expect(isApiPath(u(`/api/users/${ID}.json`), "users")).toBe(false);
        expect(isApiPath(u("/api/users.html/extra"), "users")).toBe(false);
    });

    it("lehnt zusätzliche Segmente und andere Namen ab", () => {
        expect(isApiPath(u(`/api/users/${ID}/extra`), "users")).toBe(false);
        expect(isApiPath(u("/api/projects"), "users")).toBe(false);
        expect(isApiPath(u("/api/usersx"), "users")).toBe(false);
    });
});

describe("isRoutePath", () => {
    const routes = ["/api/users/:userId/vacations", "/api/users/:userId/vacations/:id"];

    it("akzeptiert die Sammlung und eine Ressource eines Users", () => {
        expect(isRoutePath(u(`/api/users/${ID}/vacations`), routes)).toBe(true);
        expect(isRoutePath(u(`/api/users/${ID}/vacations/`), routes)).toBe(true);
        expect(isRoutePath(u(`/api/users/${ID}/vacations/${ID}?x=1`), routes)).toBe(true);
    });

    it("akzeptiert die Wiederholungen von Netlify wie das Original", () => {
        expect(isRoutePath(u(`/api/users/${ID}/vacations.html`), routes)).toBe(true);
        expect(isRoutePath(u(`/api/users/${ID}/vacations/index.htm`), routes)).toBe(true);
        expect(isRoutePath(u(`/api/users/${ID}/vacations/${ID}.html`), routes)).toBe(true);
        expect(isRoutePath(u(`/api/users/${ID}/vacations/${ID}/index.html`), routes)).toBe(true);
    });

    it("lehnt die alten Pfade, andere Endungen und zusätzliche Segmente ab", () => {
        expect(isRoutePath(u("/api/vacations"), routes)).toBe(false);
        expect(isRoutePath(u(`/api/vacations/${ID}`), routes)).toBe(false);
        expect(isRoutePath(u(`/api/users/${ID}/vacations/${ID}.json`), routes)).toBe(false);
        expect(isRoutePath(u(`/api/users/${ID}.json/vacations`), routes)).toBe(false);
        expect(isRoutePath(u(`/api/users/${ID}/vacations/${ID}/extra`), routes)).toBe(false);
        expect(isRoutePath(u("/api/users//vacations"), routes)).toBe(false);
    });
});

describe("stripRetrySuffix", () => {
    it("entfernt die Endungen der Wiederholungen", () => {
        expect(stripRetrySuffix("/api/users.html")).toBe("/api/users");
        expect(stripRetrySuffix("/api/users.htm")).toBe("/api/users");
        expect(stripRetrySuffix("/api/users/index.html")).toBe("/api/users");
        expect(stripRetrySuffix("/api/users/index.htm")).toBe("/api/users");
        expect(stripRetrySuffix("/api/users")).toBe("/api/users");
    });
});

describe("IdSchema", () => {
    it("liest die ID auch aus dem Pfad einer Wiederholung", () => {
        expect(IdSchema.parse(`${ID}.html`)).toBe(ID);
        expect(IdSchema.parse(ID)).toBe(ID);
    });

    it("lehnt alles andere ab", () => {
        expect(IdSchema.safeParse("abc").success).toBe(false);
        expect(IdSchema.safeParse(`${ID}.json`).success).toBe(false);
        expect(IdSchema.safeParse(undefined).success).toBe(false);
    });
});

describe("pathParams", () => {
    const routes = ["/api/vacations", "/api/vacations/:id"];

    it("liest die ID aus der URL", () => {
        expect(pathParams(u(`/api/vacations/${ID}?x=1`), routes)).toEqual({id: ID});
        expect(pathParams(u("/api/vacations"), routes)).toEqual({});
    });

    it("liest die ID auch aus den Wiederholungen von Netlify", () => {
        expect(pathParams(u(`/api/vacations/${ID}.html`), routes)).toEqual({id: ID});
        expect(pathParams(u(`/api/vacations/${ID}/index.htm`), routes)).toEqual({id: ID});
        expect(pathParams(u("/api/auth/reset-password/index.html"), "/api/auth/:action")).toEqual({
            action: "reset-password",
        });
    });

    it("liest den User und die ID aus einem Pfad mit beiden Parametern", () => {
        const user = ["/api/users/:userId/vacations", "/api/users/:userId/vacations/:id"];
        expect(pathParams(u(`/api/users/${ID}/vacations`), user)).toEqual({userId: ID});
        expect(pathParams(u(`/api/users/${ID}/vacations/${ID}.html`), user)).toEqual({userId: ID, id: ID});
    });

    it("bildet den internen Function-Pfad ab und mehrere Parameter in einem Pfad", () => {
        expect(pathParams(u(`/.netlify/functions/vacations/${ID}`), routes)).toEqual({id: ID});
        expect(pathParams(u(`/api/users/${ID}/roles`), ["/api/roles", "/api/users/:id/roles"])).toEqual({id: ID});
    });

    it("liefert ohne passenden Pfad nichts", () => {
        expect(pathParams(u(`/api/vacations/${ID}/extra`), routes)).toEqual({});
        expect(pathParams(u("/api/projects/1"), routes)).toEqual({});
        expect(pathParams(u("/api/vacations/1"), undefined)).toEqual({});
    });
});
