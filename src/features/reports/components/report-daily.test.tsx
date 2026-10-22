// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/user-provider";
import {NotFound} from "@/components/navigation/not-found";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
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
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function renderPage() {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: ["/user/reports/daily"]}),
    });
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

describe("Heute", () => {
    it("zeigt die Stempelkarte und die Karten des Tages", async () => {
        renderPage();
        await screen.findByRole("button", {name: "Kommen"});
        expect(screen.getByText("Arbeitszeit")).toBeTruthy();
        expect(screen.getByText("Soll")).toBeTruthy();
        expect(screen.getByRole("button", {name: "Buchung nachtragen"})).toBeTruthy();
    });

    it("zeigt die Stempelkarte nur am heutigen Tag", async () => {
        renderPage();
        await screen.findByRole("button", {name: "Kommen"});
        fireEvent.click(screen.getByRole("button", {name: "Vorheriger Tag"}));
        await screen.findByText("An diesem Tag keine Buchungen.");
        expect(screen.queryByRole("button", {name: "Kommen"})).toBeNull();
    });
});
