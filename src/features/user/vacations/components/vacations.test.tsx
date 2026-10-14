// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen.ts";
import {UserProvider} from "@/components/user-provider.tsx";
import {NotFound} from "@/components/navigation/not-found.tsx";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
};


function mockApi(vacations: unknown[]) {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/users") return Response.json([USER]);
            if (pathname === "/api/vacations") return Response.json(vacations);
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function renderPage() {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: ["/user/reports/vacations"]}),
    });
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <RouterProvider router={router}/>
            </UserProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {
            }

            unobserve() {
            }

            disconnect() {
            }
        },
    );
    vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe("Urlaubsseite", () => {
    it("zeigt Datum, Kalendertage und Arbeitstage", async () => {
        mockApi([
            {id: "a", userId: USER.id, startDate: "2026-06-08", endDate: "2026-06-14"}, // Mo bis So
        ]);
        renderPage();

        await screen.findByText("08.06.2026");
        expect(screen.getByText("14.06.2026")).toBeTruthy();
        expect(screen.getByText("7")).toBeTruthy(); // Kalendertage
        expect(screen.getByText("5")).toBeTruthy(); // Arbeitstage
        expect(screen.getByRole("button", {name: "Bearbeiten"})).toBeTruthy();
        expect(screen.getByRole("button", {name: "Löschen"})).toBeTruthy();
    });

    it("zeigt einen Hinweis ohne Einträge", async () => {
        mockApi([]);
        renderPage();
        await screen.findByText("Noch kein Urlaub eingetragen.");
    });

    it("bietet das Eintragen an", async () => {
        mockApi([]);
        renderPage();
    });
});