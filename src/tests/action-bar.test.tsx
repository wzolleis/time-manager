// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/login/user-provider";
import {USER_ROLE_ID} from "@shared/role";
import {SHOW_ACTION_BAR_SETTING_ID} from "@shared/user-setting";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    roleIds: [USER_ROLE_ID],
};

const BAR_SETTING = {
    id: SHOW_ACTION_BAR_SETTING_ID,
    name: "Action Bar",
    description: "Zeige die Action-Bar an",
    type: "boolean",
    unit: null,
    defaultValue: "true",
    validFromUnit: "immediately",
};

const barValue = (value: string | null) => ({
    id: "bar",
    userId: USER.id,
    settingId: SHOW_ACTION_BAR_SETTING_ID,
    value,
    validFrom: "2026-10-14",
});

// settings: Antwort von GET /api/users/:id/settings; Promise: die Antwort kommt erst später
function mockApi(settings: unknown) {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/auth/me") return Response.json(USER);
            if (pathname === "/api/auth/logout") return new Response(null, {status: 204});
            if (pathname === `/api/users/${USER.id}/settings`) return Response.json(await settings);
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

const calledPaths = () =>
    vi.mocked(fetch).mock.calls.map(([input]) => new URL(String(input), "http://localhost").pathname);

function renderApp(path = "/dashboard") {
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

const findBar = () => screen.findByRole("navigation", {name: "Aktionen"});
const queryBar = () => screen.queryByRole("navigation", {name: "Aktionen"});

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
    localStorage.clear();
});

describe("Action-Bar", () => {
    it("ist ohne eigenen Wert sichtbar, mit Heute, Woche, Einstellungen und Abmelden", async () => {
        mockApi({settings: [BAR_SETTING], values: []});
        renderApp();

        const bar = await findBar();
        const links = within(bar).getAllByRole("link");
        expect(links.map((l) => [l.getAttribute("aria-label"), l.getAttribute("href")])).toEqual([
            ["Heute", "/user/reports/daily"],
            ["Woche", "/user/reports/weekly"],
            ["Einstellungen", "/user/settings"],
        ]);
        expect(within(bar).getByRole("button", {name: "Abmelden"}).getAttribute("title")).toBe("Abmelden");
    });

    it("ist mit Action Bar = false nicht zu sehen", async () => {
        mockApi({settings: [BAR_SETTING], values: [barValue("false")]});
        renderApp();

        await screen.findByRole("link", {name: "Zum Tagesbericht"});
        await vi.waitFor(() => expect(calledPaths()).toContain(`/api/users/${USER.id}/settings`));
        await new Promise((r) => setTimeout(r, 0));
        expect(queryBar()).toBeNull();
    });

    it("erscheint erst, wenn die Einstellungen geladen sind", async () => {
        let resolve: (data: unknown) => void = () => {};
        mockApi(new Promise((r) => (resolve = r)));
        renderApp();

        await screen.findByRole("link", {name: "Zum Tagesbericht"});
        expect(queryBar()).toBeNull();
        resolve({settings: [BAR_SETTING], values: [barValue(null)]});
        expect(await findBar()).toBeTruthy();
    });

    it("ein Klick auf Woche öffnet den Wochenbericht", async () => {
        mockApi({settings: [BAR_SETTING], values: []});
        const router = renderApp();

        fireEvent.click(within(await findBar()).getByRole("link", {name: "Woche"}));
        await vi.waitFor(() => expect(router.state.location.pathname).toBe("/user/reports/weekly"));
    });

    it("markiert den Button der aktuellen Seite", async () => {
        mockApi({settings: [BAR_SETTING], values: []});
        const router = renderApp("/user/reports/daily");

        const bar = await findBar();
        const current = () =>
            within(bar)
                .getAllByRole("link")
                .filter((l) => l.getAttribute("aria-current") === "page")
                .map((l) => l.getAttribute("aria-label"));
        await vi.waitFor(() => expect(current()).toEqual(["Heute"]));

        fireEvent.click(within(bar).getByRole("link", {name: "Woche"}));
        await vi.waitFor(() => expect(router.state.location.pathname).toBe("/user/reports/weekly"));
        await vi.waitFor(() => expect(current()).toEqual(["Woche"]));
    });

    it("meldet erst nach der Bestätigung ab", async () => {
        mockApi({settings: [BAR_SETTING], values: []});
        renderApp();

        fireEvent.click(within(await findBar()).getByRole("button", {name: "Abmelden"}));
        const dialog = await screen.findByRole("alertdialog");
        expect(within(dialog).getByText("Abmelden?")).toBeTruthy();
        expect(calledPaths()).not.toContain("/api/auth/logout");

        fireEvent.click(within(dialog).getByRole("button", {name: "Abmelden"}));
        await vi.waitFor(() => expect(calledPaths()).toContain("/api/auth/logout"));
    });
});
