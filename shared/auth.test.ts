// shared/auth.test.ts
import {describe, expect, it} from "vitest";
import {LoginSchema, PasswordChangeSchema, PasswordSchema} from "./auth";
import {UserCreateSchema, UserSchema, UserUpdateSchema} from "./user";

describe("PasswordSchema", () => {
    it("verlangt mindestens 8 Zeichen", () => {
        expect(PasswordSchema.safeParse("1234567").success).toBe(false);
        expect(PasswordSchema.safeParse("12345678").success).toBe(true);
    });

    it("begrenzt auf 72 Bytes, nicht auf 72 Zeichen", () => {
        expect(PasswordSchema.safeParse("a".repeat(72)).success).toBe(true);
        expect(PasswordSchema.safeParse("a".repeat(73)).success).toBe(false);
        // "ä" belegt in UTF-8 zwei Bytes: 37 Zeichen sind schon 74 Bytes
        expect(PasswordSchema.safeParse("ä".repeat(36)).success).toBe(true);
        expect(PasswordSchema.safeParse("ä".repeat(37)).success).toBe(false);
    });
});

describe("LoginSchema", () => {
    it("normalisiert die E-Mail wie beim Anlegen", () => {
        expect(LoginSchema.parse({email: " Test@Example.COM ", password: "x"}).email).toBe("test@example.com");
    });

    it("prüft beim Login nicht die Passwortregeln", () => {
        expect(LoginSchema.safeParse({email: "a@b.de", password: "kurz"}).success).toBe(true);
        expect(LoginSchema.safeParse({email: "a@b.de", password: ""}).success).toBe(false);
    });
});

describe("PasswordChangeSchema", () => {
    it("wendet die Passwortregeln nur auf das neue Passwort an", () => {
        expect(PasswordChangeSchema.safeParse({oldPassword: "alt", newPassword: "neues-passwort"}).success).toBe(true);
        expect(PasswordChangeSchema.safeParse({oldPassword: "alt-passwort", newPassword: "kurz"}).success).toBe(false);
    });
});

describe("User-Schemas und Passwort", () => {
    it("verlangt beim Anlegen ein Passwort", () => {
        expect(UserCreateSchema.safeParse({name: "Bob", email: "bob@example.com"}).success).toBe(false);
        expect(
            UserCreateSchema.safeParse({
                name: "Bob",
                email: "bob@example.com",
                password: "geheim123",
            }).success,
        ).toBe(true);
    });

    it("kennt keinen Passwort-Hash, weder in Antworten noch in Eingaben", () => {
        expect("passwordHash" in UserSchema.shape).toBe(false);
        expect("passwordHash" in UserCreateSchema.shape).toBe(false);
        expect("passwordHash" in UserUpdateSchema.shape).toBe(false);
    });
});
