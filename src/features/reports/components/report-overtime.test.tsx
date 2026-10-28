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
const OVERTIME = `/api/users/${USER.id}/overtime`;

// Mo 12.10. bis Mi 14.10.2026 je 9 Stunden (08:00–17:00, Sommerzeit)
const ENTRIES = ["12", "13", "14"].flatMap((d) => [
    {id: `${d}k`, userId: USER.id, type: "kommen", bookedAt: `2026-10-${d}T06:00:00.000Z`, projectId: null},
    {id: `${d}g`, userId: USER.id, type: "gehen", bookedAt: `2026-10-${d}T15:00:00.000Z`, projectId: null},
]);

// Korrektur am Mo 12.10.2026 um 09:00 auf +3:30
const CORRECTION = {userId: USER.id, offset: 210, created: "2026-10-12T07:00:00.000Z"};

function mockApi(overtime: typeof CORRECTION | null, put?: () => Response) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const {pathname} = new URL(raw, "http://localhost");
        if (pathname === "/api/auth/me") return Response.json(USER);
        if (pathname === "/api/users") return Response.json([USER]);
        if (pathname === `/api/users/${USER.id}/time-entries`) return Response.json(ENTRIES);
        if (pathname === OVERTIME && init?.method === "PUT") return put?.() ?? Response.json(CORRECTION);
        if (pathname === OVERTIME) return Response.json(overtime);
        const user = `/api/users/${USER.id}`;
        if (["/api/projects", `${user}/vacations`, `${user}/holidays`, `${user}/sick-leaves`].includes(pathname)) {
            return Response.json([]);
        }
        if (pathname === `/api/users/${USER.id}/settings`) return Response.json({settings: [], values: []}); // nur Defaults
        return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderPage() {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: ["/user/reports/overtime"]}),
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
    // Nur Date fälschen, Timer laufen normal weiter (React Query, findBy*). Do 15.10.2026, 07:00
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(new Date("2026-10-15T05:00:00Z"));
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

describe("Überstunden", () => {
    it("zeigt den Saldo ab dem Tag der Korrektur und die Korrektur", async () => {
        mockApi(CORRECTION);
        renderPage();
        // 3:30 + 3 × 1:00 − 8:00 (heute mit vollem Soll)
        expect(await screen.findByText("−1:30 h")).toBeTruthy();
        expect(screen.getByText("Korrektur am 12.10.2026: +3:30 h")).toBeTruthy();
    });

    it("rechnet ohne Korrektur ab Beginn der Zeiterfassung", async () => {
        mockApi(null);
        renderPage();
        expect(await screen.findByText("−5:00 h")).toBeTruthy();
        expect(screen.getByText("Keine Korrektur")).toBeTruthy();
    });

    it("speichert den vorbelegten Korrekturwert absolut", async () => {
        const fetchMock = mockApi(CORRECTION);
        renderPage();
        fireEvent.click(await screen.findByRole("button", {name: "Bearbeiten"}));
        expect(screen.getByLabelText("Stunden").textContent).toBe("3");
        expect(screen.getByLabelText("Minuten").textContent).toBe("30");
        fireEvent.click(screen.getByRole("button", {name: "Speichern"}));

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
        expect(put?.[1]?.body).toBe(JSON.stringify({offset: 210}));
    });

    it("zeigt die Meldung des Servers im Dialog", async () => {
        mockApi(null, () => Response.json({error: "Dir fehlen die notwendigen Rechte"}, {status: 403}));
        renderPage();
        fireEvent.click(await screen.findByRole("button", {name: "Bearbeiten"}));
        fireEvent.click(screen.getByRole("button", {name: "Speichern"}));
        expect((await screen.findByRole("alert")).textContent).toBe("Dir fehlen die notwendigen Rechte");
    });
});
