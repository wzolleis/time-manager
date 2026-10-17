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

function mockApi(sickLeaves: unknown[], timeEntries: unknown[] = []) {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/auth/me") return Response.json(USER);
            if (pathname === "/api/users") return Response.json([USER]);
            if (pathname === "/api/sick-leaves") return Response.json(sickLeaves);
            if (pathname === "/api/holidays") return Response.json([]);
            if (pathname === "/api/time-entries") return Response.json(timeEntries);
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function renderPage() {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: ["/user/reports/sick-leaves"]}),
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
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe("Krankmeldungen", () => {
    it("zeigt ohne Einträge die leere Tabelle mit Hinweis", async () => {
        mockApi([]);
        renderPage();
        await screen.findByText("Keine Krankheitstage");
        expect(screen.getByText("0 Tage")).toBeTruthy();
    });

    it("zeigt Zeitraum, Kalendertage, Krankheitstage und Notiz", async () => {
        mockApi([{id: "a", userId: USER.id, startDate: "2026-10-14", endDate: "2026-10-20", note: "Attest liegt vor"}]);
        renderPage();

        await screen.findByText("14.10.2026");
        expect(screen.getByText("20.10.2026")).toBeTruthy();
        expect(screen.getByText("7")).toBeTruthy(); // Kalendertage
        expect(screen.getByText("5")).toBeTruthy(); // Krankheitstage ohne Sa und So
        expect(screen.getByText("5 Tage")).toBeTruthy(); // Summe des Jahres
        expect(screen.getByText("Attest liegt vor")).toBeTruthy();
    });

    it("weist im Dialog auf Buchungen im Zeitraum hin, Speichern bleibt möglich", async () => {
        mockApi(
            [],
            [
                {id: "1", userId: USER.id, type: "kommen", bookedAt: "2026-10-14T06:00:00.000Z", projectId: null},
                {id: "2", userId: USER.id, type: "gehen", bookedAt: "2026-10-14T10:00:00.000Z", projectId: null},
            ],
        );
        renderPage();

        await screen.findByText("Keine Krankheitstage");
        fireEvent.click(screen.getByRole("button", {name: "Krankmeldung eintragen"}));

        await screen.findByText("Im Zeitraum gibt es 2 Buchungen. Sie zählen nicht zur Arbeitszeit.");
        expect(screen.getByText("1 Krankheitstag")).toBeTruthy();
        expect(screen.getByRole("button", {name: "Speichern"}).hasAttribute("disabled")).toBe(false);
    });
});
