import {describe, expect, it} from "vitest";
import {buildNavTree, findNavigationItem} from "@/application/navigation/nav-utils";
import {navItemsOf} from "@/application/navigation/nav-items";

describe("Navigationsbaum", () => {
    it("zeigt die Einträge unter /user ohne den Eintrag User auf der obersten Ebene", () => {
        const tree = buildNavTree(navItemsOf("sidebar"));

        expect(tree.map((node) => node.id)).toEqual([
            "dashboard",
            "reports",
            "vacations",
            "sick-leaves",
            "holidays",
            "projects",
            "api-tokens",
            "passkeys",
        ]);
        expect(tree.find((node) => node.id === "reports")!.childItems.map((node) => node.id)).toEqual([
            "reports-daily",
            "reports-weekly",
            "reports-monthly",
            "reports-yearly",
            "reports-overtime",
        ]);
    });

    it("hat keine Einträge aus Administrator- und Avatar-Menü in der Leiste", () => {
        const paths = navItemsOf("sidebar").map((item) => item.to);

        expect(paths.some((path) => path?.startsWith("/admin"))).toBe(false);
        expect(paths).not.toContain("/user/settings");
    });

    it("führt im Administrator-Menü zu den Seiten unter /admin", () => {
        expect(navItemsOf("admin").map((item) => item.to)).toEqual([
            "/admin",
            "/admin/settings",
            "/admin/users",
            "/admin/holidays",
            "/admin/api-tokens",
        ]);
    });

    it("führt im Avatar-Menü mit Einstellungen zu den Einstellungen des Users", () => {
        expect(findNavigationItem("user-settings")).toMatchObject({to: "/user/settings", menu: "avatar"});
    });
});
