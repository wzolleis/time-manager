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

function renderPage(path = "/user/reports/daily") {
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

    it("„Nächster Tag“ ändert die Adresse", async () => {
        const router = renderPage();
        await screen.findByRole("button", {name: "Kommen"});
        fireEvent.click(screen.getByRole("button", {name: "Nächster Tag"}));
        await waitFor(() => expect(router.state.location.pathname).toBe("/user/reports/daily/2026-10-15"));
        await screen.findByText("An diesem Tag keine Buchungen.");
    });

    it("zeigt den Tag aus der Adresse", async () => {
        renderPage("/user/reports/daily/2026-10-21");
        await screen.findByText("An diesem Tag keine Buchungen.");
        expect(screen.queryByRole("button", {name: "Kommen"})).toBeNull();
        expect((screen.getByLabelText("Tag wählen") as HTMLInputElement).value).toBe("2026-10-21");
    });

    it("meldet einen ungültigen Tag mit Link auf heute", async () => {
        renderPage("/user/reports/daily/2026-02-30");
        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(screen.getByRole("link", {name: "Zum heutigen Tag"})).toBeTruthy();
    });
});
