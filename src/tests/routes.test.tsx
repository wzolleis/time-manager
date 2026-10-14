// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/user-provider";
import {NotFound} from "@/components/navigation/not-found.tsx";

// Pro Route die Überschrift (h1), an der man die Seite erkennt.
// Neue Route anlegen = hier eintragen, sonst schlägt der Test unten fehl.
const HEADINGS: Record<string, string> = {
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/admin": "Administrator Dashboard",
    "/admin/users": "Benutzerverwaltung",
    "/admin/settings": "Einstellungen",
    "/user": "User Dashboard",
    "/user/time-stamp": "Zeiterfassung",
    "/user/reports": "Report",
    "/user/reports/daily": "Tagesbericht bearbeiten",
    "/user/reports/weekly": "Wochenbericht",
    "/user/reports/vacations": "Urlaub",
    "/user/projects": "Projekte",
};

const TEST_USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
};

const makeRouter = (path: string) =>
    createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: [path]}),
    });

// Routen mit Parametern ($id) oder Platzhaltern (*) brauchen konkrete Werte und bleiben außen vor
const paths = Object.keys(makeRouter("/").routesByPath).filter(
    (p) => !p.includes("$") && !p.includes("*"),
);

function mockApi() {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");

            if (pathname === "/api/users") return Response.json([TEST_USER]);
            if (pathname === "/api/projects" || pathname === "/api/time-entries") return Response.json([]);
            if (pathname === "/api/vacations") return Response.json([]);

            // Nicht gemockte Aufrufe fallen auf, statt still zu scheitern
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function mockWindow() {
    vi.stubGlobal('scrollTo', vi.fn());
}

beforeEach(() => {
    mockApi();
    mockWindow()
    // Radix-Komponenten brauchen ResizeObserver, jsdom bringt ihn nicht mit
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
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe("Routen", () => {
    it("jede Route des Routers hat einen Eintrag im Test (und umgekehrt)", () => {
        expect([...paths].sort()).toEqual(Object.keys(HEADINGS).sort());
    });

    describe.each(paths)("%s", (path) => {
        it("wird angezeigt", async () => {
            const heading = HEADINGS[path];
            expect(heading, `Für ${path} fehlt die Überschrift in HEADINGS`).toBeDefined();

            const router = makeRouter(path);
            const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});

            render(
                <QueryClientProvider client={queryClient}>
                    <UserProvider>
                        <RouterProvider router={router}/>
                    </UserProvider>
                </QueryClientProvider>,
            );

            // Die Seite zeigt ihre Überschrift (wirft, wenn sie nicht erscheint)
            await screen.findByRole("heading", {level: 1, name: heading});

            // Keine Weiterleitung, kein Fehler, keine Not-Found-Seite
            await waitFor(() => expect(router.state.status).toBe("idle"));
            expect(router.state.location.pathname).toBe(path);
            expect(router.state.matches.at(-1)?.status).toBe("success");
            // vorher: expect(screen.queryByText(/not found/i)).toBeNull();
            expect(screen.queryByRole("heading", {name: "Seite nicht gefunden"})).toBeNull();
        });
    });

    it("eine unbekannte URL zeigt die Not-Found-Seite", async () => {
        const router = makeRouter("/gibt-es-nicht");
        const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});

        const screen = render(
            <QueryClientProvider client={queryClient}>
                <UserProvider>
                    <RouterProvider router={router}/>
                </UserProvider>
            </QueryClientProvider>,
        );

        await screen.findByRole("heading", {level: 1, name: "Seite nicht gefunden"});
        expect(screen.getByText("/gibt-es-nicht")).toBeTruthy();
        expect(screen.getByRole("link", {name: "Zur Startseite"}).getAttribute("href")).toBe("/");
    });
});