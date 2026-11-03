// @vitest-environment jsdom
// Use Case features/use-case/industriezeit.md: Umschalten im Benutzermenü
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
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

// Mo 02.03.2026: 8 Std 30 Min Arbeitszeit, Soll 8 Std
const ENTRIES = [
    {id: "1", userId: USER.id, type: "kommen", bookedAt: "2026-03-02T07:00:00.000Z", projectId: null},
    {id: "2", userId: USER.id, type: "gehen", bookedAt: "2026-03-02T15:30:00.000Z", projectId: null},
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
            if (pathname === `/api/users/${USER.id}/settings`) return Response.json({settings: [], values: []}); // nur Defaults
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

const DAY = "/user/reports/daily/2026-03-02";

// Öffnet das Benutzermenü (Radix öffnet in jsdom über die Tastatur) und liefert den Eintrag Industriezeit
async function openIndustrialTimeItem() {
    fireEvent.keyDown(await screen.findByRole("button", {name: "Benutzermenü"}), {key: "Enter"});
    return screen.findByRole("menuitemcheckbox", {name: "Industriezeit"});
}

async function toggle() {
    fireEvent.click(await openIndustrialTimeItem());
}

describe("Industriezeit", () => {
    it("zeigt ohne Einstellung Stunden und Minuten, im Benutzermenü ist Industriezeit nicht angehakt", async () => {
        renderPage(DAY);
        expect(await screen.findByText("8 Std 30 Min")).toBeTruthy();
        expect(screen.getByText("+30 Min")).toBeTruthy();
        expect((await openIndustrialTimeItem()).getAttribute("aria-checked")).toBe("false");
    });

    it("schaltet im Benutzermenü hin und zurück, das Häkchen zeigt den aktuellen Zustand", async () => {
        renderPage(DAY);
        await screen.findByText("8 Std 30 Min");
        await toggle();
        expect(await screen.findByText("8,50 h")).toBeTruthy();
        expect(screen.getByText("+0,50 h")).toBeTruthy();
        expect(screen.getByText("8,00 h")).toBeTruthy(); // Soll
        expect((await openIndustrialTimeItem()).getAttribute("aria-checked")).toBe("true");

        fireEvent.click(screen.getByRole("menuitemcheckbox", {name: "Industriezeit"}));
        expect(await screen.findByText("8 Std 30 Min")).toBeTruthy();
    });

    it("bleibt nach erneutem Rendern aktiv, pro User", async () => {
        renderPage(DAY);
        await screen.findByText("8 Std 30 Min");
        await toggle();
        await screen.findByText("8,50 h");
        cleanup();

        renderPage(DAY);
        expect(await screen.findByText("8,50 h")).toBeTruthy();
        expect(localStorage.getItem(`time-manager:industriezeit:${USER.id}`)).toBe("1");
    });
});
