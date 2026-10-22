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

// Die Zeiterfassung beginnt vor der Woche, sonst wären die Tage "vor Beginn der Zeiterfassung"
const ENTRIES = [
    {id: "1", userId: USER.id, type: "kommen", bookedAt: "2026-10-01T06:00:00.000Z", projectId: null},
    {id: "2", userId: USER.id, type: "gehen", bookedAt: "2026-10-01T14:00:00.000Z", projectId: null},
];
// Montag und Dienstag der KW 42/2026
const SICK = {id: "s", userId: USER.id, startDate: "2026-10-12", endDate: "2026-10-13", note: null};

function mockApi(data: {holidays?: unknown[]} = {}) {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/auth/me") return Response.json(USER);
            if (pathname === "/api/users") return Response.json([USER]);
            if (pathname === `/api/users/${USER.id}/time-entries`) return Response.json(ENTRIES);
            if (pathname === `/api/users/${USER.id}/sick-leaves`) return Response.json([SICK]);
            if (pathname === `/api/users/${USER.id}/holidays`) return Response.json(data.holidays ?? []);
            if (["/api/projects", `/api/users/${USER.id}/vacations`].includes(pathname)) return Response.json([]);
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function renderPage() {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: ["/user/reports/weekly"]}),
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
    vi.setSystemTime(new Date("2026-10-14T12:00:00")); // Mittwoch, KW 42/2026
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

describe("Wochenbericht", () => {
    it("zeigt an Krankheitstagen „krank“ und zählt sie beim Soll", async () => {
        mockApi();
        renderPage();
        expect(await screen.findAllByText("krank")).toHaveLength(2);
        expect(screen.getByText(/2 Krankheitstage/)).toBeTruthy();
    });

    it("zeigt an einem Feiertag in der Krankmeldung den Feiertag", async () => {
        mockApi({holidays: [{id: "h", userId: USER.id, date: "2026-10-13", name: "Testfeiertag"}]});
        renderPage();
        expect(await screen.findByText("Feiertag: Testfeiertag")).toBeTruthy();
        expect(screen.getAllByText("krank")).toHaveLength(1);
        expect(screen.getByText(/1 Feiertag · 1 Krankheitstag(?!e)/)).toBeTruthy();
    });
});
