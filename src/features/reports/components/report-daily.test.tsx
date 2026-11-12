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

describe("Optimistic Write", () => {
    const ENTRIES_PATH = `/api/users/${USER.id}/time-entries`;
    const KOMMEN = {id: "k1", userId: USER.id, type: "kommen", bookedAt: "2026-10-14T06:00:00.000Z", projectId: null};
    const GEHEN = {id: "g1", userId: USER.id, type: "gehen", bookedAt: "2026-10-14T08:00:00.000Z", projectId: null};

    /** Buchungen liefern (read), schreibende Requests an write geben; alles andere wie mockApi */
    function mockTimeEntries(
        entries: object[],
        write: () => Promise<Response>,
        read = async () => Response.json(entries),
    ) {
        const fallback = globalThis.fetch;
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const {pathname} = new URL(String(input), "http://localhost");
                if (!pathname.startsWith(ENTRIES_PATH)) return fallback(input, init);
                return init?.method ? write() : read();
            }),
        );
    }

    const never = () => new Promise<Response>(() => {});

    /** Kommen stempeln, sobald der Button frei ist */
    async function stampKommen() {
        const button = await screen.findByRole("button", {name: "Kommen"});
        await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
        fireEvent.click(button);
    }
    const reject422 = async () => Response.json({error: "Abgelehnt vom Server"}, {status: 422});

    it("zeigt das Kommen, bevor der Server antwortet", async () => {
        mockTimeEntries([], never);
        renderPage();
        await stampKommen();

        expect(await screen.findByText(/Eingestempelt seit 12:00 Uhr/)).toBeTruthy();
        expect(screen.getByRole("button", {name: "Gehen"})).toBeTruthy();
        // Die vorläufige Buchung kennt der Server noch nicht
        expect((screen.getByRole("button", {name: "Bearbeiten"}) as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByRole("button", {name: "Löschen"}) as HTMLButtonElement).disabled).toBe(true);
    });

    it("nimmt das Kommen bei Ablehnung zurück und zeigt den Fehler", async () => {
        mockTimeEntries([], reject422);
        renderPage();
        await stampKommen();

        expect(await screen.findByText("12:00 Uhr: Abgelehnt vom Server")).toBeTruthy();
        await screen.findByRole("button", {name: "Kommen"});
        expect(screen.queryByText(/Eingestempelt/)).toBeNull();
    });

    it("stempelt Kommen, bevor die Buchungen geladen sind", async () => {
        mockTimeEntries([], never, never);
        renderPage();
        await screen.findByText("Lade Status…");
        await stampKommen();

        expect(await screen.findByText(/Eingestempelt seit 12:00 Uhr/)).toBeTruthy();
        expect(screen.getByRole("button", {name: "Gehen"})).toBeTruthy();
    });

    it("nimmt ein Kommen vor dem Laden bei Ablehnung zurück und zeigt die geladenen Buchungen", async () => {
        // Der User war schon eingestempelt, die Buchungen kommen erst nach der Ablehnung
        let rejected = false;
        const read = async () => (rejected ? Response.json([KOMMEN]) : never());
        const write = async () => {
            rejected = true;
            return Response.json({error: "Schon eingestempelt"}, {status: 422});
        };
        mockTimeEntries([], write, read);
        renderPage();
        await screen.findByText("Lade Status…");
        await stampKommen();

        expect(await screen.findByText("12:00 Uhr: Schon eingestempelt")).toBeTruthy();
        expect(await screen.findByText(/Eingestempelt seit 08:00 Uhr/)).toBeTruthy();
        expect(screen.getByRole("button", {name: "Gehen"})).toBeTruthy();
    });

    it("entfernt eine gelöschte Buchung sofort und stellt sie bei Ablehnung wieder her", async () => {
        let answer!: (res: Response) => void;
        mockTimeEntries([KOMMEN, GEHEN], () => new Promise((resolve) => (answer = resolve)));
        renderPage();
        expect(await screen.findAllByRole("button", {name: "Löschen"})).toHaveLength(2);

        fireEvent.click(screen.getAllByRole("button", {name: "Löschen"})[0]);
        fireEvent.click(await screen.findByRole("button", {name: "Mit Gegenstück"}));
        await screen.findByText("Heute noch keine Buchungen.");

        answer(Response.json({error: "Abgelehnt vom Server"}, {status: 422}));
        expect(await screen.findByText("12:00 Uhr: Abgelehnt vom Server")).toBeTruthy();
        expect(await screen.findAllByRole("button", {name: "Löschen"})).toHaveLength(2);
    });
});

describe("Zeitraum nachtragen", () => {
    // 08:00–10:00 Berlin am Mittwoch, 2026-10-14
    const ENTRIES = [
        {id: "k1", userId: USER.id, type: "kommen", bookedAt: "2026-10-14T06:00:00.000Z", projectId: null},
        {id: "g1", userId: USER.id, type: "gehen", bookedAt: "2026-10-14T08:00:00.000Z", projectId: null},
    ];

    beforeEach(() => {
        // Für das Select von Radix, jsdom kennt beides nicht
        Element.prototype.scrollIntoView = vi.fn();
        Element.prototype.hasPointerCapture = vi.fn(() => false);
    });

    async function openPeriod(entries: object[]) {
        const fallback = globalThis.fetch;
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const {pathname} = new URL(String(input), "http://localhost");
                if (pathname === `/api/users/${USER.id}/time-entries`) return Response.json(entries);
                return fallback(input, init);
            }),
        );
        renderPage();
        await screen.findByRole("button", {name: "Kommen"});
        fireEvent.click(screen.getByRole("button", {name: "Buchung nachtragen"}));
        fireEvent.click(await screen.findByLabelText("Nachtragen"));
        fireEvent.click(await screen.findByRole("option", {name: "Zeitraum"}));
        return (await screen.findByLabelText("Arbeitszeit")) as HTMLInputElement;
    }

    it("belegt am leeren Tag das Soll vor", async () => {
        const workTime = await openPeriod([]);
        await waitFor(() => expect(workTime.value).toBe("08:00"));
    });

    it("belegt an einem Tag mit Buchungen den Rest zum Soll vor", async () => {
        const workTime = await openPeriod(ENTRIES);
        await waitFor(() => expect(workTime.value).toBe("06:00"));
    });

    // Wann eine Pause nötig ist und wie früh der Beginn sein darf, prüft earliestStart in time-rules.test.ts
    it("passt den Beginn an die Arbeitszeit an, ein eigener Beginn bleibt stehen", async () => {
        const workTime = await openPeriod(ENTRIES);
        const start = screen.getByLabelText("Beginn") as HTMLInputElement;
        await waitFor(() => expect(start.value).not.toBe(""));
        // Frühester Beginn nach dem Gehen um 10:00
        fireEvent.change(workTime, {target: {value: "01:00"}});
        expect(start.value).toBe("10:01");
        // Ein eigener Beginn bleibt stehen
        fireEvent.change(start, {target: {value: "11:00"}});
        fireEvent.change(workTime, {target: {value: "06:00"}});
        expect(start.value).toBe("11:00");
    });
});
