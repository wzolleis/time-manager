// scripts/check-schema.ts
import {UserCreateSchema, UserSchema} from "../shared/user";

const ok = UserCreateSchema.safeParse({
    name: "  Anna ",
    email: " ANNA@Example.com ",
    avatarUrl: "https://example.com/a.png",
});
console.log("gültig:", ok.success, ok.success ? ok.data : "");

const bad = UserCreateSchema.safeParse({name: "", email: "kein-mail", avatarUrl: "x"});
console.log("ungültig:", bad.success, bad.success ? "" : bad.error.issues.map(i => i.path.join(".")));

const row = UserSchema.safeParse({
    id: "82cbd438-98dd-45c7-8bd4-3898dde5c7a7",
    name: "DEV",
    email: "DEV@example.com",
    avatarUrl: "https://unsplash.com",
});
console.log("select:", row.success);