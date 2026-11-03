// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
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
    return router;
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

describe("Navigation", () => {
    it("zeigt dem User die Einträge ohne die Ebene User und ohne Administration", async () => {
        mockApi(USER);
        renderApp("/dashboard");

        const nav = await screen.findByRole("navigation", {name: "Navigation"});
        expect(within(nav).getByRole("link", {name: "Urlaube"}).getAttribute("href")).toBe("/user/vacations");
        expect(within(nav).getByRole("link", {name: "Woche"}).getAttribute("href")).toBe("/user/reports/weekly");
        expect(within(nav).queryByRole("link", {name: "User"})).toBeNull();
        expect(within(nav).queryByRole("link", {name: "Administration"})).toBeNull();
        expect(within(nav).queryByRole("link", {name: "Einstellungen"})).toBeNull();
    });

    it("zeigt das Administrator-Menü nur mit der Rolle Administrator", async () => {
        mockApi(USER);
        renderApp("/dashboard");
        await screen.findByRole("heading", {level: 1, name: "Dashboard"});
        expect(screen.queryByRole("button", {name: "Administration"})).toBeNull();

        cleanup();
        mockApi(ADMIN);
        renderApp("/dashboard");
        expect(await screen.findByRole("button", {name: "Administration"})).toBeTruthy();
    });

    it("zeigt in der Breadcrumb keinen Eintrag User", async () => {
        mockApi(USER);
        renderApp("/user/reports/weekly");

        const breadcrumb = await screen.findByRole("navigation", {name: "Breadcrumb"});
        expect(breadcrumb.textContent).toBe("ReportWoche");
    });

    it("wechselt über das Dropdown in der Breadcrumb zu einer anderen Unterseite", async () => {
        mockApi(USER);
        const router = renderApp("/user/reports/daily");

        const breadcrumb = await screen.findByRole("navigation", {name: "Breadcrumb"});
        // Nach dem Pfeil nach unten steht kein Pfeil nach rechts
        expect(breadcrumb.querySelector(".lucide-chevron-right")).toBeNull();
        // Radix öffnet ein Dropdown in jsdom über die Tastatur
        fireEvent.keyDown(within(breadcrumb).getByRole("button", {name: "Unterseiten von Report"}), {key: "Enter"});

        const menu = await screen.findByRole("menu");
        expect(
            within(menu)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
        ).toEqual(["Heute", "Woche", "Monat", "Jahr", "Überstunden"]);
        expect(within(menu).getByRole("menuitem", {name: "Heute"}).getAttribute("aria-current")).toBe("page");

        fireEvent.click(within(menu).getByRole("menuitem", {name: "Woche"}));
        await waitFor(() => expect(router.state.location.pathname).toBe("/user/reports/weekly"));
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("zeigt in der Breadcrumb ein Dropdown nur bei Gliedern mit Unterseiten", async () => {
        mockApi(USER);
        renderApp("/user/vacations");

        const breadcrumb = await screen.findByRole("navigation", {name: "Breadcrumb"});
        expect(breadcrumb.textContent).toBe("Urlaube");
        expect(within(breadcrumb).queryByRole("button")).toBeNull();
    });
});
