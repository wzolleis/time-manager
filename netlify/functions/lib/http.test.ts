import {describe, expect, it, vi} from "vitest";
import {z} from "zod";
import {errorResponse, readBody} from "./http";
import {NotFoundError, UnknownUserError} from "./errors";
import {ForbiddenError} from "./roles";
import {RuleError} from "./rule-error";

const answer = async (res: Response) => ({status: res.status, body: (await res.json()) as Record<string, unknown>});

describe("readBody", () => {
    it("liefert den JSON-Body", async () => {
        const req = new Request("http://localhost/api", {method: "POST", body: JSON.stringify({a: 1})});
        expect(await readBody(req)).toEqual({a: 1});
    });

    it("liefert undefined ohne gültiges JSON", async () => {
        expect(await readBody(new Request("http://localhost/api", {method: "POST", body: "{kaputt"}))).toBeUndefined();
        expect(await readBody(new Request("http://localhost/api", {method: "POST"}))).toBeUndefined();
    });
});

describe("errorResponse", () => {
    it("meldet einen ungültigen Body mit 400 und den Fehlern des Schemas", async () => {
        const err = z.object({name: z.string()}).safeParse({}).error;
        const {status, body} = await answer(errorResponse(err));
        expect(status).toBe(400);
        expect(body.errors).toEqual([expect.objectContaining({path: ["name"]})]);
    });

    it("bildet die Fehler der Stores auf ihre Antwort ab", async () => {
        expect(await answer(errorResponse(new RuleError("Regel verletzt")))).toEqual({
            status: 422,
            body: {error: "Regel verletzt"},
        });
        expect((await answer(errorResponse(new ForbiddenError()))).status).toBe(403);
        expect(await answer(errorResponse(new NotFoundError()))).toEqual({
            status: 410,
            body: {error: "Nicht gefunden"},
        });
        expect(await answer(errorResponse(new UnknownUserError()))).toEqual({
            status: 400,
            body: {error: "User existiert nicht"},
        });
    });

    it("antwortet auf jeden anderen Fehler mit 500 und schreibt ihn ins Log", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        const err = new Error("kaputt");
        expect(await answer(errorResponse(err))).toEqual({status: 500, body: {error: "Interner Fehler"}});
        expect(log).toHaveBeenCalledWith(err);
        log.mockRestore();
    });
});
