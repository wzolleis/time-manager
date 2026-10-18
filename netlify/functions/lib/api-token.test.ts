import {describe, expect, it} from "vitest";
import {generateApiToken, hashApiToken, readBearerToken} from "./api-token";

describe("readBearerToken", () => {
    it("liest das Token aus dem Bearer-Header, das Schema unabhängig von der Schreibweise", () => {
        expect(readBearerToken("Bearer tm_abc")).toBe("tm_abc");
        expect(readBearerToken("bearer tm_abc")).toBe("tm_abc");
    });

    it("lehnt fehlenden Header, anderes Schema und Token ohne Präfix ab", () => {
        expect(readBearerToken(null)).toBeNull();
        expect(readBearerToken("Basic dXNlcjpwdw==")).toBeNull();
        expect(readBearerToken("Bearer abc")).toBeNull();
        expect(readBearerToken("Bearer tm_abc extra")).toBeNull();
    });
});

describe("generateApiToken", () => {
    it("erzeugt ein Token mit Präfix und 32 zufälligen Bytes", () => {
        const token = generateApiToken();
        expect(token).toMatch(/^tm_[A-Za-z0-9_-]{43}$/);
        expect(generateApiToken()).not.toBe(token);
    });
});

describe("hashApiToken", () => {
    it("liefert den SHA-256 als Hex, wie ihn die Spalte token_hash speichert", () => {
        expect(hashApiToken("tm_abc")).toMatch(/^[0-9a-f]{64}$/);
        expect(hashApiToken("tm_abc")).toBe(hashApiToken("tm_abc"));
    });
});
