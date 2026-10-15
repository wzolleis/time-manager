import {describe, expect, it} from "vitest";
import {endpointPath, matchesPattern, requiredRoleId} from "./roles";
import {ADMIN_ROLE_ID, USER_ROLE_ID} from "../../../shared/role";

const ID = "275f12fb-e116-4857-9f12-fbe116b857fb";
const OTHER_ROLE_ID = "11111111-1111-4111-8111-111111111111";

describe("endpointPath", () => {
    it("ignoriert Query-String und abschließenden Schrägstrich", () => {
        expect(endpointPath("http://localhost/api/holidays/?userId=1")).toBe("/api/holidays");
    });

    it("bildet den internen Function-Pfad auf /api ab", () => {
        expect(endpointPath(`http://localhost/.netlify/functions/users/${ID}`)).toBe(`/api/users/${ID}`);
    });

    it("bildet die Wiederholungen von Netlify auf das Original ab", () => {
        expect(endpointPath("http://localhost/api/users.html")).toBe("/api/users");
        expect(endpointPath("http://localhost/api/users.htm")).toBe("/api/users");
        expect(endpointPath("http://localhost/api/users/index.html")).toBe("/api/users");
        expect(endpointPath(`http://localhost/api/users/${ID}/roles/index.htm`)).toBe(`/api/users/${ID}/roles`);
    });
});

describe("matchesPattern", () => {
    it("vergleicht feste Segmente genau und Parameter mit genau einem Segment", () => {
        expect(matchesPattern("/api/users", "/api/users")).toBe(true);
        expect(matchesPattern("/api/users/:id", `/api/users/${ID}`)).toBe(true);
        expect(matchesPattern("/api/users/:id", `/api/users/${ID}/roles`)).toBe(false);
        expect(matchesPattern("/api/users/:id/roles", `/api/users/${ID}/roles`)).toBe(true);
        expect(matchesPattern("/api/users/:id", "/api/users")).toBe(false);
        expect(matchesPattern("/api/users", "/api/userss")).toBe(false);
    });
});

describe("requiredRoleId", () => {
    const entries = [
        {path: "/api/users", roleId: ADMIN_ROLE_ID},
        {path: "/api/users/:id/roles", roleId: ADMIN_ROLE_ID},
        {path: "/api/things/:id", roleId: OTHER_ROLE_ID},
        {path: "/api/things/special", roleId: ADMIN_ROLE_ID},
    ];

    it("liefert die Rolle des passenden Eintrags", () => {
        expect(requiredRoleId(entries, "/api/users")).toBe(ADMIN_ROLE_ID);
        expect(requiredRoleId(entries, `/api/users/${ID}/roles`)).toBe(ADMIN_ROLE_ID);
        expect(requiredRoleId(entries, `/api/things/${ID}`)).toBe(OTHER_ROLE_ID);
    });

    it("liefert ohne passenden Eintrag die Rolle 'User'", () => {
        expect(requiredRoleId(entries, "/api/projects")).toBe(USER_ROLE_ID);
        expect(requiredRoleId(entries, `/api/users/${ID}`)).toBe(USER_ROLE_ID);
    });

    it("nimmt bei mehreren Treffern den genauesten", () => {
        expect(requiredRoleId(entries, "/api/things/special")).toBe(ADMIN_ROLE_ID);
    });
});
