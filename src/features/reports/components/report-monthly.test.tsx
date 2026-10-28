// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/login/user-provider";
import {NotFound} from "@/application/layout/not-found";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    roleIds: [],
};

function mockApi() {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/auth/me") return Response.json(USER);
            if (pathname === "/api/users") return Response.json([USER]);
            const user = `/api/users/${USER.id}`;
            const empty = [
                "/api/projects",
                ...["time-entries", "vacations", "holidays", "sick-leaves"].map((a) => `${user}/${a}`),
            ];
            if (empty.includes(pathname)) {
                return Response.json([]);
            }
            if (pathname === `/api/users/${USER.id}/settings`) return Response.json({settings: [], values: []}); // nur Defaults
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function renderPage(path = "/user/reports/monthly") {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: [path]}),
    });
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
    // Nur Date fälschen, Timer laufen normal weiter (React Query, findBy*)
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(new Date("2026-10-14T12:00:00"));
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}

            unobserve() {}

            disconnect() {}
        },
    );
    vi.stubGlobal("scrollTo", vi.fn());
    mockApi();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe("Monatsbericht", () => {
    // Rendert die ganze App mit Router, bei parallelen Testläufen reicht die Standardwartezeit von 1 s nicht immer
    it("öffnet mit einem Klick auf die Woche den Wochenbericht dieser Woche", {timeout: 10_000}, async () => {
        const slow = {timeout: 3000};
        const router = renderPage("/user/reports/monthly/2026-10");
        fireEvent.click(await screen.findByRole("link", {name: /KW 43\/2026/}, slow));
        await waitFor(() => expect(router.state.location.pathname).toBe("/user/reports/weekly/2026-W43"), slow);
        expect(await screen.findByRole("heading", {level: 1, name: "Wochenbericht"}, slow)).toBeTruthy();
    });

    it("blättert über die Adresse", async () => {
        const router = renderPage("/user/reports/monthly/2026-12");
        await screen.findByRole("link", {name: /KW 49\/2026/});
        fireEvent.click(screen.getByRole("button", {name: "Nächster Monat"}));
        await waitFor(() => expect(router.state.location.pathname).toBe("/user/reports/monthly/2027-01"));
    });

    it("meldet einen ungültigen Monat mit Link auf den aktuellen", async () => {
        renderPage("/user/reports/monthly/2026-13");
        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(screen.getByRole("link", {name: "Zum aktuellen Monat"})).toBeTruthy();
    });
});
