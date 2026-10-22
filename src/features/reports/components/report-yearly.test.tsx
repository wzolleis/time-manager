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

// Die Zeiterfassung beginnt am Mo 02.03.2026
const ENTRIES = [
    {id: "1", userId: USER.id, type: "kommen", bookedAt: "2026-03-02T07:00:00.000Z", projectId: null},
    {id: "2", userId: USER.id, type: "gehen", bookedAt: "2026-03-02T15:00:00.000Z", projectId: null},
];

function mockApi() {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/auth/me") return Response.json(USER);
            if (pathname === "/api/users") return Response.json([USER]);
            if (pathname === `/api/users/${USER.id}/time-entries`) return Response.json(ENTRIES);
            const user = `/api/users/${USER.id}`;
            if (["/api/projects", `${user}/vacations`, `${user}/holidays`, `${user}/sick-leaves`].includes(pathname)) {
                return Response.json([]);
            }
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function renderPage(path: string) {
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

describe("Jahresbericht", () => {
    it("zeigt ohne Jahr in der Adresse das laufende Jahr mit zwölf Monaten", async () => {
        renderPage("/user/reports/yearly");
        expect(await screen.findByText("Januar")).toBeTruthy();
        expect(screen.getByText("Dezember")).toBeTruthy();
        expect(screen.getByText("Test · 2026")).toBeTruthy();
        expect(screen.getAllByRole("row")).toHaveLength(13); // Kopfzeile und zwölf Monate
    });

    it("öffnet mit einem Klick auf den Monat den Monatsbericht", async () => {
        renderPage("/user/reports/yearly/2026");
        fireEvent.click(await screen.findByRole("link", {name: "Oktober"}));
        expect(await screen.findByRole("heading", {level: 1, name: "Monatsbericht"})).toBeTruthy();
        expect(screen.getByText("Test · Oktober 2026")).toBeTruthy();
    });

    it("blättert über die Adresse und nicht vor das Jahr der ersten Buchung", async () => {
        renderPage("/user/reports/yearly/2026");
        await screen.findByText("Januar");
        expect(screen.getByRole("button", {name: "Vorheriges Jahr"}).hasAttribute("disabled")).toBe(true);
        fireEvent.click(screen.getByRole("button", {name: "Nächstes Jahr"}));
        expect(await screen.findByText("Test · 2027")).toBeTruthy();
    });

    it("verweist bei einem Jahr vor der ersten Buchung auf das erste Jahr", async () => {
        renderPage("/user/reports/yearly/2025");
        expect(await screen.findByText(/Die Zeiterfassung beginnt 2026/)).toBeTruthy();
        expect(screen.getByRole("link", {name: "Jahresbericht 2026"})).toBeTruthy();
    });

    it("meldet ein ungültiges Jahr mit Link auf das laufende", async () => {
        renderPage("/user/reports/yearly/26x");
        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(screen.getByRole("link", {name: "Zum laufenden Jahr"})).toBeTruthy();
    });
});
