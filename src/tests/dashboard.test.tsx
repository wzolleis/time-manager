// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/login/user-provider";
import {ADMIN_ROLE_ID, USER_ROLE_ID} from "@shared/role";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    roleIds: [USER_ROLE_ID],
};
const ADMIN = {...USER, roleIds: [USER_ROLE_ID, ADMIN_ROLE_ID]};

function mockApi(me: typeof USER) {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/auth/me") return Response.json(me);
            if (pathname === "/api/auth/logout") return new Response(null, {status: 204});
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function renderApp(path: string) {
    const router = createRouter({routeTree, history: createMemoryHistory({initialEntries: [path]})});
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <RouterProvider router={router} />
            </UserProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    // Radix-Komponenten brauchen ResizeObserver, jsdom bringt ihn nicht mit
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}

            unobserve() {}

            disconnect() {}
        },
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("Dashboard", () => {
    it("zeigt die Karten des User Dashboards", async () => {
        mockApi(USER);
        renderApp("/dashboard");

        const link = await screen.findByRole("link", {name: "Zum Tagesbericht"});
        expect(link.getAttribute("href")).toBe("/user/reports/daily");
        expect(screen.getByRole("button", {name: "Abmelden"})).toBeTruthy();
    });

    it("zeigt auch dem Administrator keine Karten zu den Dashboards", async () => {
        mockApi(ADMIN);
        renderApp("/dashboard");

        await screen.findByRole("link", {name: "Zum Tagesbericht"});
        expect(screen.queryByRole("link", {name: "Zum User Dashboard"})).toBeNull();
        expect(screen.queryByRole("link", {name: "Zum Administrator Dashboard"})).toBeNull();
    });
});

describe("Administrator Dashboard", () => {
    it("zeigt die Karten zu den Einträgen des Administrator-Menüs", async () => {
        mockApi(ADMIN);
        renderApp("/admin");

        const links = {
            "Zu den Einstellungen": "/admin/settings",
            "Zur Benutzerverwaltung": "/admin/users",
            "Zu den Feiertagen": "/admin/holidays",
            "Zu den Agent-Zugängen": "/admin/api-tokens",
        };
        await screen.findByRole("link", {name: "Zu den Einstellungen"});
        for (const [name, href] of Object.entries(links)) {
            expect(screen.getByRole("link", {name}).getAttribute("href")).toBe(href);
        }
    });
});

describe("User Dashboard", () => {
    const calledPaths = () =>
        vi.mocked(fetch).mock.calls.map(([input]) => new URL(String(input), "http://localhost").pathname);

    it("zeigt die Karten Heute, Woche, Einstellungen und Abmelden in dieser Reihenfolge", async () => {
        mockApi(USER);
        renderApp("/user");

        await screen.findByRole("link", {name: "Zum Tagesbericht"});
        const titles = ["Heute", "Woche", "Einstellungen", "Abmelden"];
        const main = screen.getByRole("main");
        const shown = within(main)
            .getAllByText((_, el) => el?.getAttribute("data-slot") === "card-title")
            .map((el) => el.textContent);
        expect(shown).toEqual(titles);

        expect(screen.getByRole("link", {name: "Zum Tagesbericht"}).getAttribute("href")).toBe("/user/reports/daily");
        expect(screen.getByRole("link", {name: "Zum Wochenbericht"}).getAttribute("href")).toBe("/user/reports/weekly");
        expect(screen.getByRole("link", {name: "Zu den Einstellungen"}).getAttribute("href")).toBe("/user/settings");
    });

    it("meldet erst nach der Bestätigung ab", async () => {
        mockApi(USER);
        renderApp("/user");

        fireEvent.click(await screen.findByRole("button", {name: "Abmelden"}));
        const dialog = await screen.findByRole("alertdialog");
        expect(within(dialog).getByText("Abmelden?")).toBeTruthy();

        fireEvent.click(within(dialog).getByRole("button", {name: "Abbrechen"}));
        expect(calledPaths()).not.toContain("/api/auth/logout");

        fireEvent.click(screen.getByRole("button", {name: "Abmelden"}));
        fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", {name: "Abmelden"}));
        await vi.waitFor(() => expect(calledPaths()).toContain("/api/auth/logout"));
    });
});
