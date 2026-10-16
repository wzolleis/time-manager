// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";
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


function mockApi(vacations: unknown[], holidays: unknown[] = []) {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/auth/me") return Response.json(USER);
            if (pathname === "/api/users") return Response.json([USER]);
            if (pathname === "/api/vacations") return Response.json(vacations);
            if (pathname === "/api/holidays") return Response.json(holidays);
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
    // Nur Date fälschen, Timer laufen normal weiter (React Query, findBy*)
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(new Date("2026-06-10T12:00:00"));
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
    vi.useRealTimers();
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
        await screen.findByText("Für 2026 ist kein Urlaub eingetragen.");
    });

    it("zeigt genommene, geplante und ungeplante Urlaubstage des Jahres", async () => {
        mockApi([
            {id: "a", userId: USER.id, startDate: "2026-03-02", endDate: "2026-03-06"}, // vorbei: 5
            {id: "b", userId: USER.id, startDate: "2026-06-08", endDate: "2026-06-12"}, // 3 genommen, 2 geplant
            {id: "c", userId: USER.id, startDate: "2025-08-04", endDate: "2025-08-08"}, // anderes Jahr
        ]);
        renderPage();

        await screen.findByText("Genommen");
        expect(screen.getByText("8 Tage")).toBeTruthy();
        expect(screen.getByText("2 Tage")).toBeTruthy();
        expect(screen.getByText("20 Tage")).toBeTruthy();
        expect(screen.getByText("verfällt am 31.12.2026")).toBeTruthy();
        expect(screen.queryByText("04.08.2025")).toBeNull(); // Tabelle zeigt nur das gewählte Jahr
    });

    it("weist zu viel eingetragenen Urlaub aus", async () => {
        mockApi([
            {id: "a", userId: USER.id, startDate: "2026-07-06", endDate: "2026-08-21"}, // 35 Arbeitstage
        ]);
        renderPage();

        await screen.findByText("5 Tage über dem Jahresurlaub");
        expect(screen.getByText("35 Tage")).toBeTruthy(); // geplant
        expect(screen.getAllByText("0 Tage")).toHaveLength(2); // genommen und ungeplant
    });

    it("Feiertage im Urlaub verbrauchen keinen Urlaubstag", async () => {
        mockApi(
            [{id: "a", userId: USER.id, startDate: "2026-09-28", endDate: "2026-10-02"}], // Mo bis Fr
            [{id: "h", userId: null, date: "2026-10-02", name: "Feiertag"}], // Freitag
        );
        renderPage();

        await screen.findByText("Genommen");
        expect(screen.getByText("4")).toBeTruthy(); // Urlaubstage in der Tabelle
        expect(screen.getByText("4 Tage")).toBeTruthy(); // geplant
        expect(screen.getByText("26 Tage")).toBeTruthy(); // ungeplant
    });

    it("bietet das Eintragen an", async () => {
        mockApi([]);
        renderPage();
    });
});